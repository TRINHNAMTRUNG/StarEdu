import { GenerateContentResponse, GoogleGenAI, Type } from "@google/genai";
import { ENV } from "../config/environment";
import AppError from "../utils/AppError";

const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });

export interface LLMContent {
    ipa: string;
    collocations: { phrase: string; meaning: string }[];
    examples: string[];
}

interface LLMResponse extends LLMContent {
    isValid: boolean;
    error?: string;
}

/**
 * Schema cho mảng kết quả
 */
const vocabBatchSchema = {
    type: Type.OBJECT,
    properties: {
        results: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    term: { type: Type.STRING },
                    isValid: { type: Type.BOOLEAN },
                    error: { type: Type.STRING },
                    ipa: { type: Type.STRING },
                    collocations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                phrase: { type: Type.STRING },
                                meaning: { type: Type.STRING },
                            },
                            required: ["phrase", "meaning"],
                        },
                    },
                    examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["term", "isValid", "ipa", "collocations", "examples"],
            },
        },
    },
    required: ["results"],
};

/**
 * Tạo nội dung flashcard cho NHIỀU từ vựng cùng lúc
 */
export async function getGeminiContentBatch(
    words: Array<{ term: string; mainMeaning: string }>
): Promise<Array<{ term: string; data: LLMContent }>> {
    const wordList = words.map((w, i) => `${i + 1}. "${w.term}" - ${w.mainMeaning}`).join("\n");

    const prompt = `
Bạn là một chuyên gia tiếng Anh.
Hãy tạo flashcard cho DANH SÁCH từ vựng sau:

${wordList}

Với mỗi từ, hãy:
1. Kiểm tra xem từ có hợp lệ hay không. Nếu sai chính tả/vô nghĩa -> isValid=false.
2. Nếu hợp lệ -> tạo:
   - ipa (phiên âm)
   - 3 collocation (phrase + nghĩa tiếng Việt)
   - 3 câu ví dụ gốc (không dùng collocation)

Trả về mảng JSON với format:
{
  "results": [
    {
      "term": "word1",
      "isValid": true,
      "ipa": "...",
      "collocations": [...],
      "examples": [...]
    },
    ...
  ]
}
    `.trim();

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: vocabBatchSchema,
                temperature: 0.3,
            },
        });

        const jsonString = response.text?.trim();
        if (!jsonString) {
            throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
        }

        const data = JSON.parse(jsonString) as { results: Array<LLMResponse & { term: string }> };
        console.log(`✅ Gemini batch completed for ${data.results.length} terms`);

        // Lọc ra các từ hợp lệ
        const validResults: Array<{ term: string; data: LLMContent }> = [];
        const invalidTerms: string[] = [];

        for (const result of data.results) {
            if (!result.isValid) {
                invalidTerms.push(result.term);
                continue;
            }

            validResults.push({
                term: result.term,
                data: {
                    ipa: result.ipa || "",
                    collocations: result.collocations || [],
                    examples: result.examples || [],
                },
            });
        }

        if (invalidTerms.length > 0) {
            throw AppError.badRequestError(
                `Các từ không hợp lệ hoặc sai chính tả: ${invalidTerms.join(", ")}`
            );
        }

        return validResults;
    } catch (error: any) {
        if (error instanceof AppError) throw error;

        console.error("Gemini Batch API error:", error);
        throw AppError.internalServerError("Lỗi khi xử lý yêu cầu tới Gemini.", error?.message);
    }
}
