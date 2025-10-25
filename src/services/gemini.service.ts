import { GenerateContentResponse, GoogleGenAI, Type } from "@google/genai";
import { ENV } from "../config/environment";
import AppError from "../utils/AppError";
import { injectable } from "tsyringe";

export interface LLMContent {
    ipa: string;
    collocations: { phrase: string; meaning: string }[];
    examples: string[];
}

interface LLMResponse extends LLMContent {
    isValid: boolean;
    error?: string;
}

@injectable()
class GeminiService {
    private ai: GoogleGenAI;

    /**
     * Schema cho mảng kết quả vocabulary batch
     */
    private vocabBatchSchema = {
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

    constructor() {
        this.ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
    }

    /**
     * Tạo nội dung flashcard cho NHIỀU từ vựng cùng lúc
     */
    async getGeminiContentBatch(
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
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: this.vocabBatchSchema,
                    temperature: 0.3,
                },
            });

            const jsonString = response.text?.trim();
            if (!jsonString) {
                throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            }

            const data = JSON.parse(jsonString) as { results: Array<LLMResponse & { term: string }> };
            console.log(`Gemini batch completed for ${data.results.length} terms`);

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

    /**
     * ========================================
     * ANALYZE SENTENCES BATCH (Gemini AI)
     * ========================================
     * 
     * Phân tích nhiều câu tiếng Anh và trích xuất từ vựng theo ngữ cảnh (semantic chunks).
     * 
     * @param sentences - Mảng các câu tiếng Anh cần phân tích
     * @returns Promise<Map<string, {word: string, meaning: string}[]>> - Map từ câu gốc → array từ vựng
     * 
     * @example
     * ========================================
     * INPUT:
     * ========================================
     * [
     *   "I want to turn off the ceiling light",
     *   "Sure, anything else?",
     *   "Can I get a glass of water?"
     * ]
     * 
     * ========================================
     * STEP 1: Xây dựng prompt cho Gemini
     * ========================================
     * Prompt sẽ yêu cầu Gemini:
     * - Phân tích từng câu
     * - Trích xuất CỤM TỪ có nghĩa (phrasal verbs, collocations)
     * - Trả về JSON object với key = câu gốc, value = array { word, meaning }
     * 
     * ========================================
     * STEP 2: Gọi Gemini API
     * ========================================
     * Request:
     * {
     *   model: "gemini-2.0-flash-exp",
     *   prompt: "Phân tích từng CÂU...",
     *   responseSchema: { type: OBJECT, additionalProperties: { type: ARRAY, items: {word, meaning} } }
     * }
     * 
     * ========================================
     * STEP 3: Gemini trả về JSON
     * ========================================
     * OUTPUT từ Gemini:
     * {
     *   "I want to turn off the ceiling light": [
     *     { "word": "want to", "meaning": "muốn" },
     *     { "word": "turn off", "meaning": "tắt" },
     *     { "word": "ceiling light", "meaning": "đèn trần" }
     *   ],
     *   "Sure, anything else?": [
     *     { "word": "sure", "meaning": "chắc chắn" },
     *     { "word": "anything else", "meaning": "còn gì nữa không" }
     *   ],
     *   "Can I get a glass of water?": [
     *     { "word": "can I get", "meaning": "tôi có thể lấy" },
     *     { "word": "a glass of water", "meaning": "một ly nước" }
     *   ]
     * }
     * 
     * ========================================
     * STEP 4: Parse và làm sạch JSON
     * ========================================
     * - Loại bỏ code fences (```json, ```
     * - Parse JSON string thành object
     * - Validate structure
     * 
     * ========================================
     * STEP 5: Convert sang Map
     * ========================================
     * FINAL OUTPUT:
     * Map {
     *   "I want to turn off the ceiling light" => [
     *     { word: "want to", meaning: "muốn" },
     *     { word: "turn off", meaning: "tắt" },
     *     { word: "ceiling light", meaning: "đèn trần" }
     *   ],
     *   "Sure, anything else?" => [
     *     { word: "sure", meaning: "chắc chắn" },
     *     { word: "anything else", meaning: "còn gì nữa không" }
     *   ],
     *   "Can I get a glass of water?" => [
     *     { word: "can I get", meaning: "tôi có thể lấy" },
     *     { word: "a glass of water", meaning: "một ly nước" }
     *   ]
     * }
     * 
     * ========================================
     * LƯU Ý:
     * ========================================
     * - Gemini phân tích theo CỤM TỪ có nghĩa (không tách lẻ từ)
     * - "turn off" là phrasal verb → giữ nguyên cụm
     * - "ceiling light" là collocation → giữ nguyên cụm
     * - Dịch nghĩa phù hợp với ngữ cảnh câu
     * 
     * ========================================
     * ERROR HANDLING:
     * ========================================
     * - Empty input → Return empty Map
     * - Gemini trả về rỗng → Throw AppError.internalServerError
     * - JSON parse fail → Throw AppError.internalServerError
     * - API error → Throw AppError.internalServerError
     */
    async analyzeSentencesBatch(sentences: string[]): Promise<Map<string, { word: string; meaning: string }[]>> {
        if (!Array.isArray(sentences) || sentences.length === 0) {
            return new Map<string, { word: string; meaning: string }[]>();
        }

        // ✅ FIX: Dùng schema với properties cố định thay vì additionalProperties
        const sentenceSchema = {
            type: Type.OBJECT,
            properties: {
                results: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sentence: { type: Type.STRING },
                            words: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        word: { type: Type.STRING },
                                        meaning: { type: Type.STRING }
                                    },
                                    required: ["word", "meaning"]
                                }
                            }
                        },
                        required: ["sentence", "words"]
                    }
                }
            },
            required: ["results"]
        };

        // ✅ Thay đổi prompt để match schema mới
        const prompt = `
Phân tích từng CÂU sau và trích xuất các CỤM TỪ có nghĩa.
Trả về JSON với format:
{
  "results": [
    {
      "sentence": "câu gốc",
      "words": [
        { "word": "cụm từ", "meaning": "nghĩa tiếng Việt" }
      ]
    }
  ]
}

Danh sách câu:
${sentences.map((s, i) => `${i + 1}. "${s}"`).join("\n")}

Yêu cầu:
- Trích xuất theo cụm (phrasal verbs, collocations), không tách rời nếu thuộc cụm.
- Dịch nghĩa phù hợp ngữ cảnh.
- Chỉ trả về JSON (không mô tả, không giải thích).
`.trim();

        try {
            console.log(`📤 Sending ${sentences.length} sentences to Gemini...`);

            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: sentenceSchema,
                    temperature: 0.2
                }
            });

            const jsonString = (response.text || "").trim();
            if (!jsonString) {
                throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            }

            console.log(`📥 Received Gemini response (${jsonString.length} chars)`);

            const parsed = JSON.parse(jsonString) as {
                results: Array<{ sentence: string; words: Array<{ word: string; meaning: string }> }>
            };

            // Convert sang Map
            const resultMap = new Map<string, { word: string; meaning: string }[]>();
            for (const item of parsed.results) {
                if (!Array.isArray(item.words)) continue;
                resultMap.set(item.sentence, item.words);
            }

            console.log(`✅ Gemini analyzeSentencesBatch completed for ${resultMap.size} sentences`);
            return resultMap;

        } catch (err: any) {
            if (err instanceof AppError) throw err;
            console.error("❌ Gemini analyzeSentencesBatch error:", err);
            throw AppError.internalServerError(
                "Lỗi khi gọi Gemini để phân tích câu.",
                JSON.stringify(err.response?.data || err.message)
            );
        }
    }
}

export default GeminiService;
