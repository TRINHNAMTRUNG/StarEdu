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

const vocabSchema = {
    type: Type.OBJECT,
    properties: {
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
    required: ["isValid", "ipa", "collocations", "examples"],
};

/**
 * Tạo nội dung flashcard từ 1 từ vựng
 */
export async function getGeminiContent(
    word: string,
    mainMeaning: string,
    partOfSpeech?: string
): Promise<LLMContent> {

    const prompt = `
        Bạn là một chuyên gia tiếng Anh.
        Hãy tạo flashcard cho từ vựng "${word}" với nghĩa "${mainMeaning}".

        1. Kiểm tra xem từ có hợp lệ hay không. Nếu sai chính tả/vô nghĩa -> isValid=false.
        2. Nếu hợp lệ -> tạo:
            - ipa (phiên âm)
            - 3 collocation (phrase + nghĩa tiếng Việt)
            - 3 câu ví dụ gốc (không dùng collocation)
        Loại từ: ${partOfSpeech || "Không xác định"}.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: vocabSchema,
                temperature: 0.3,
            },
        });

        const jsonString = response.text?.trim();
        if (!jsonString) {
            throw AppError.internalServerError("Gemini trả về dữ liệu rỗng hoặc không hợp lệ.");
        }

        let data: LLMResponse;
        try {
            data = JSON.parse(jsonString) as LLMResponse;
        } catch {
            throw AppError.internalServerError("Lỗi khi phân tích phản hồi từ Gemini.");
        }

        if (!data.isValid) {
            throw AppError.badRequestError(data.error || "Từ khóa không hợp lệ hoặc sai chính tả.");
        }

        return {
            ipa: data.ipa || "",
            collocations: data.collocations || [],
            examples: data.examples || [],
        };
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw AppError.internalServerError("Lỗi khi xử lý yêu cầu tới Gemini.", (error as Error).stack);
    }
}
