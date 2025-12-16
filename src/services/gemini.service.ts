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

        // ✅ CẢI THIỆN PROMPT: Yêu cầu phân tích TOÀN BỘ từ trong câu
        const prompt = `
Phân tích TỪ VỰNG cho TỪNG CÂU dưới đây.

**YÊU CẦU BẮT BUỘC:**
1. **Phân tích TOÀN BỘ từ/cụm từ trong câu** (không bỏ sót bất kỳ từ nào)
2. Với phrasal verbs/collocations → Giữ nguyên cụm (vd: "wash up", "stressed out")
3. Với từ đơn → Tách riêng (vd: "Go", "and", "Lisa")
4. Dịch nghĩa phù hợp ngữ cảnh tiếng Việt
5. **Thứ tự words phải đúng thứ tự xuất hiện trong câu gốc**

**VÍ DỤ:**
Câu gốc: "Go and wash up, Lisa."
→ words:
[
  {"word": "Go", "meaning": "đi"},
  {"word": "and", "meaning": "và"},
  {"word": "wash up", "meaning": "rửa mặt và tay"},
  {"word": "Lisa", "meaning": "Lisa (tên riêng)"}
]

**DANH SÁCH CÂU CẦN PHÂN TÍCH:**
${sentences.map((s, i) => `${i + 1}. "${s}"`).join("\n")}

**OUTPUT FORMAT:**
{
  "results": [
    {
      "sentence": "câu gốc chính xác",
      "words": [
        {"word": "từ/cụm", "meaning": "nghĩa"}
      ]
    }
  ]
}

**CHÚ Ý:** Không bỏ sót bất kỳ từ nào, kể cả "I", "the", "a", "to", v.v.
`.trim();

        try {
            console.log(`📤 Sending ${sentences.length} sentences to Gemini for FULL analysis...`);

            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: sentenceSchema,
                    temperature: 0.1  // Giảm temperature để output chính xác hơn
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


    /**
     * ========================================
     * API 1.1: GỢI Ý COLLOCATION CHO TEXT WRITING
     * ========================================
     * Dựa vào 2 từ cho trước → Gợi ý 5 collocation phù hợp
     */
    async suggestTextCollocations(requiredWords: string[], context?: string): Promise<any> {
        const contextText = context ? `\n**NGỮ CẢNH:** ${context}` : "";

        const schema = {
            type: Type.OBJECT,
            properties: {
                suggestions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            collocation: { type: Type.STRING },
                            meaning: { type: Type.STRING },
                            example: { type: Type.STRING }
                        },
                        required: ["collocation", "meaning", "example"]
                    }
                },
                required_words: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                note: { type: Type.STRING }
            },
            required: ["suggestions", "required_words"]
        };

        const prompt = `${this.getVietnameseInstruction("giáo viên tiếng Anh chuyên gợi ý từ vựng")}

**2 TỪ CHO TRƯỚC:**
"${requiredWords[0]}" và "${requiredWords[1]}"

**YÊU CẦU:**
1. Đưa ra ĐÚNG 5 collocation phổ biến, tự nhiên
2. Mỗi collocation phải sử dụng ít nhất 1 trong 2 từ
3. Cung cấp nghĩa tiếng Việt và câu ví dụ

**OUTPUT:** JSON hoàn toàn bằng tiếng Việt với 5 gợi ý
`.trim();

        try {
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.4
                }
            });

            const jsonString = (response.text || "").trim();
            if (!jsonString) {
                throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            }

            const result = JSON.parse(jsonString);
            console.log(`✅ [GeminiService] Suggested ${result.suggestions?.length} collocations`);
            return result;

        } catch (err: any) {
            if (err instanceof AppError) throw err;
            console.error("❌ [GeminiService] suggestTextCollocations error:", err);
            throw AppError.internalServerError("Lỗi khi gợi ý collocation.", err?.message);
        }
    }

    /**
     * ========================================
     * API 1.2: CHẤM BÀI TEXT WRITING (CẢI THIỆN)
     * ========================================
     * Chấm câu dựa vào 2 từ cho trước (KHÔNG CÓ HÌNH ẢNH)
     */
    async checkTextWriting(sentence: string, requiredWords: string[], context?: string): Promise<any> {
        const contextText = context ? `\n**NGỮ CẢNH:** ${context}` : "";

        // Schema giống image writing nhưng bỏ image_relevance
        const schema = {
            type: Type.OBJECT,
            properties: {
                meaning: {
                    type: Type.OBJECT,
                    properties: {
                        is_correct: { type: Type.BOOLEAN },
                        explanation: { type: Type.STRING }
                    },
                    required: ["is_correct", "explanation"]
                },
                grammar: {
                    type: Type.OBJECT,
                    properties: {
                        has_errors: { type: Type.BOOLEAN },
                        errors: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    incorrect_part: { type: Type.STRING },
                                    suggestion: { type: Type.STRING }
                                },
                                required: ["type", "description", "incorrect_part", "suggestion"]
                            }
                        },
                        explanation: { type: Type.STRING }
                    },
                    required: ["has_errors", "errors"]
                },
                vocabulary: {
                    type: Type.OBJECT,
                    properties: {
                        has_issues: { type: Type.BOOLEAN },
                        issues: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    incorrect_usage: { type: Type.STRING },
                                    issue_type: { type: Type.STRING },
                                    explanation: { type: Type.STRING },
                                    correct_suggestion: { type: Type.STRING }
                                },
                                required: ["incorrect_usage", "issue_type", "explanation", "correct_suggestion"]
                            }
                        },
                        positive_collocations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        required_words_usage: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    used_correctly: { type: Type.BOOLEAN },
                                    note: { type: Type.STRING }
                                },
                                required: ["word", "used_correctly", "note"]
                            }
                        }
                    },
                    required: ["has_issues", "issues"]
                },
                correction: {
                    type: Type.OBJECT,
                    properties: {
                        original_sentence: { type: Type.STRING },
                        corrected_sentence: { type: Type.STRING },
                        changes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    from: { type: Type.STRING },
                                    to: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                },
                                required: ["from", "to", "reason"]
                            }
                        }
                    },
                    required: ["original_sentence", "corrected_sentence", "changes"]
                },
                overall_score: { type: Type.NUMBER },
                feedback_summary: { type: Type.STRING }
            },
            required: ["meaning", "grammar", "vocabulary", "correction", "overall_score", "feedback_summary"]
        };

        const prompt = `${this.getVietnameseInstruction("giáo viên tiếng Anh chuyên chấm bài writing")}

**YÊU CẦU ĐỀ BÀI:**
Viết câu hoàn chỉnh, có ý nghĩa, SỬ DỤNG ĐÚNG 2 từ: "${requiredWords[0]}" và "${requiredWords[1]}"
${contextText}

**CÂU HỌC SINH VIẾT:**
"${sentence}"

**RUBRIC CHẤM ĐIỂM TEXT WRITING (0-100):**
- **Câu hoàn hảo (ngữ pháp + 2 từ + ý nghĩa rõ ràng)** = 90-100 điểm
- **Câu tốt, có nghĩa, dùng đúng 2 từ nhưng có lỗi nhỏ** = 70-89 điểm  
- **Câu có nghĩa nhưng thiếu 1 từ bắt buộc** = 60-70 điểm
- **Câu có lỗi ngữ pháp nghiêm trọng** = 30-59 điểm
- **Câu không có nghĩa hoặc sai hoàn toàn** = <30 điểm

**NHIỆM VỤ CHẤM BÀI:**

📌 **1. Ý NGHĨA:** Câu có truyền tải ý tưởng rõ ràng không?

📌 **2. NGỮ PHÁP:** Tìm tất cả lỗi, nếu không có → errors = []

📌 **3. TỪ VỰNG:** 
   - **QUAN TRỌNG**: Nếu has_issues = true thì issues phải có ít nhất 1 item
   - Đánh giá 2 từ bắt buộc trong required_words_usage

📌 **4. CHỈNH SỬA:** Chỉ sửa lỗi, không viết lại toàn bộ

📌 **5. ĐIỂM & PHẢN HỒI:** Theo rubric, tone khích lệ

**OUTPUT:** JSON hoàn toàn bằng tiếng Việt
`.trim();

        try {
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.2
                }
            });

            const jsonString = (response.text || "").trim();
            if (!jsonString) {
                throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            }

            let result = JSON.parse(jsonString); // ✅ FIX: đổi const thành let

            // ✅ VALIDATION: Đảm bảo logic nhất quán
            result = this.validateTextWritingResult(result, sentence, requiredWords);

            console.log(`✅ [GeminiService] Text writing checked, score: ${result.overall_score}`);
            return result;

        } catch (err: any) {
            if (err instanceof AppError) throw err;
            console.error("❌ [GeminiService] checkTextWriting error:", err);
            throw AppError.internalServerError("Lỗi khi chấm bài text writing.", err?.message);
        }
    }

    /**
     * ========================================
     * API 2.1: GỢI Ý COLLOCATION CHO IMAGE WRITING
     * ========================================
     * Dựa vào HÌNH ẢNH + 2 từ → Gợi ý 5 collocation PHÙ HỢP VỚI NỘI DUNG ẢNH
     */
    async suggestImageCollocations(imageUrl: string, requiredWords: string[], context?: string): Promise<any> {
        const contextText = context ? `\n**NGỮ CẢNH:** ${context}` : "";

        const schema = {
            type: Type.OBJECT,
            properties: {
                suggestions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            collocation: { type: Type.STRING },
                            meaning: { type: Type.STRING },
                            example: { type: Type.STRING }
                        },
                        required: ["collocation", "meaning", "example"]
                    }
                },
                required_words: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                note: { type: Type.STRING }
            },
            required: ["suggestions", "required_words"]
        };

        const prompt = `${this.getVietnameseInstruction("giáo viên tiếng Anh chuyên gợi ý từ vựng dựa trên hình ảnh")}

**2 TỪ CHO TRƯỚC:**
"${requiredWords[0]}" và "${requiredWords[1]}"

**YÊU CẦU:**
1. **QUAN SÁT HÌNH ẢNH KỸ CÀNG** - xem nội dung, hoàn cảnh, hành động
2. Đưa ra 5 collocation phù hợp với nội dung ảnh
3. Mỗi collocation sử dụng ít nhất 1 trong 2 từ
4. Cung cấp nghĩa tiếng Việt và câu ví dụ liên quan ảnh

**OUTPUT:** JSON hoàn toàn bằng tiếng Việt với 5 gợi ý
`.trim();

        try {
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: await this.fetchImageAsBase64(imageUrl)
                                }
                            }
                        ]
                    }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.4
                }
            });

            const jsonString = (response.text || "").trim();
            if (!jsonString) {
                throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            }

            const result = JSON.parse(jsonString);
            console.log(`✅ [GeminiService] Suggested ${result.suggestions?.length} image-based collocations`);
            return result;

        } catch (err: any) {
            if (err instanceof AppError) throw err;
            console.error("❌ [GeminiService] suggestImageCollocations error:", err);
            throw AppError.internalServerError("Lỗi khi gợi ý collocation dựa vào ảnh.", err?.message);
        }
    }

    /**
     * ========================================
     * API 2.2: CHẤM BÀI IMAGE WRITING (CẢI THIỆN)
     * ========================================
     */
    async checkImageWriting(sentence: string, imageUrl: string, requiredWords: string[], context?: string): Promise<any> {
        const contextText = context ? `\n**NGỮ CẢNH BỔ SUNG:** ${context}` : "";

        const schema = {
            type: Type.OBJECT,
            properties: {
                meaning: {
                    type: Type.OBJECT,
                    properties: {
                        is_correct: { type: Type.BOOLEAN },
                        explanation: { type: Type.STRING },
                        image_relevance: { type: Type.STRING }
                    },
                    required: ["is_correct", "explanation", "image_relevance"]
                },
                grammar: {
                    type: Type.OBJECT,
                    properties: {
                        has_errors: { type: Type.BOOLEAN },
                        errors: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    incorrect_part: { type: Type.STRING },
                                    suggestion: { type: Type.STRING }
                                },
                                required: ["type", "description", "incorrect_part", "suggestion"]
                            }
                        },
                        explanation: { type: Type.STRING }
                    },
                    required: ["has_errors", "errors"]
                },
                vocabulary: {
                    type: Type.OBJECT,
                    properties: {
                        has_issues: { type: Type.BOOLEAN },
                        issues: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    incorrect_usage: { type: Type.STRING },
                                    issue_type: { type: Type.STRING },
                                    explanation: { type: Type.STRING },
                                    correct_suggestion: { type: Type.STRING }
                                },
                                required: ["incorrect_usage", "issue_type", "explanation", "correct_suggestion"]
                            }
                        },
                        positive_collocations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        required_words_usage: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    word: { type: Type.STRING },
                                    used_correctly: { type: Type.BOOLEAN },
                                    note: { type: Type.STRING }
                                },
                                required: ["word", "used_correctly", "note"]
                            }
                        }
                    },
                    required: ["has_issues", "issues"]
                },
                correction: {
                    type: Type.OBJECT,
                    properties: {
                        original_sentence: { type: Type.STRING },
                        corrected_sentence: { type: Type.STRING },
                        changes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    from: { type: Type.STRING },
                                    to: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                },
                                required: ["from", "to", "reason"]
                            }
                        }
                    },
                    required: ["original_sentence", "corrected_sentence", "changes"]
                },
                overall_score: { type: Type.NUMBER },
                feedback_summary: { type: Type.STRING }
            },
            required: ["meaning", "grammar", "vocabulary", "correction", "overall_score", "feedback_summary"]
        };

        const prompt = `${this.getVietnameseInstruction("giáo viên tiếng Anh chuyên chấm bài writing")}

**YÊU CẦU ĐỀ BÀI:**
Quan sát hình ảnh, viết câu hoàn chỉnh, SỬ DỤNG ĐÚNG 2 từ: "${requiredWords[0]}" và "${requiredWords[1]}"
${contextText}

**CÂU HỌC SINH VIẾT:**
"${sentence}"

${this.getImageWritingRubric()}

${this.getImageDetailCheckInstruction()}

**NHIỆM VỤ CHẤM BÀI CHI TIẾT:**

📌 **1. Ý NGHĨA (meaning):**
   - **is_correct**: true nếu câu có nghĩa về mặt ngữ pháp (dù có thể không khớp ảnh)
   - **explanation**: Giải thích câu có nghĩa hay không
   - **image_relevance**: RIÊNG BIỆT đánh giá độ khớp với ảnh
     * Nếu câu đúng ngữ pháp nhưng không mô tả ảnh → "Câu có nghĩa nhưng không liên quan đến nội dung hình ảnh"
     * Nếu sai chi tiết → "Câu mô tả đúng ý chính nhưng sai chi tiết: [liệt kê chi tiết sai]"
     * Nếu hoàn hảo → "Câu mô tả chính xác và phù hợp với hình ảnh"

📌 **2. NGỮ PHÁP (grammar):**
   - Tìm TẤT CẢ lỗi ngữ pháp (thì, chủ-động từ, giới từ, mạo từ...)
   - Nếu KHÔNG CÓ LỖI → has_errors = false, errors = []
   - Nếu có lỗi → liệt kê đầy đủ từng lỗi

📌 **3. TỪ VỰNG (vocabulary):**
   - **QUAN TRỌNG**: Nếu has_issues = true thì issues PHẢI có ít nhất 1 item
   - Kiểm tra 2 từ bắt buộc:
     * Nếu thiếu từ → issues phải có: "missing_required_word"
     * Nếu dùng sai → issues phải có: "incorrect_word_usage"
   - Khen ngợi collocation đúng trong positive_collocations

📌 **4. CHỈNH SỬA (correction):**
   - **NGUYÊN TẮC**: Chỉ sửa lỗi, KHÔNG viết lại toàn bộ câu
   - Nếu ngữ pháp đúng, chỉ gợi ý thêm từ thiếu (nếu có)
   - Nếu câu hoàn hảo → changes = []

📌 **5. ĐIỂM TỔNG (overall_score):**
   - Áp dụng CHÍNH XÁC rubric đã nêu
   - Ví dụ: câu đúng ngữ pháp + đúng 2 từ nhưng không khớp ảnh = 50-60 điểm

📌 **6. PHẢN HỒI (feedback_summary):**
   - Bắt đầu bằng điểm tích cực (nếu có)
   - Đưa ra gợi ý cải thiện cụ thể
   - Tone khích lệ, thân thiện

**OUTPUT:** JSON hoàn toàn bằng tiếng Việt theo schema
`.trim();

        try {
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: await this.fetchImageAsBase64(imageUrl)
                                }
                            }
                        ]
                    }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.2 // Giảm temperature để kết quả nhất quán hơn
                }
            });

            const jsonString = (response.text || "").trim();
            if (!jsonString) {
                throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            }

            let result = JSON.parse(jsonString); // ✅ FIX: đổi const thành let

            // ✅ VALIDATION: Đảm bảo logic nhất quán
            result = this.validateImageWritingResult(result, sentence, requiredWords);

            console.log(`✅ [GeminiService] Image writing checked, score: ${result.overall_score}`);
            return result;

        } catch (err: any) {
            if (err instanceof AppError) throw err;
            console.error("❌ [GeminiService] checkImageWriting error:", err);
            throw AppError.internalServerError("Lỗi khi chấm bài image writing.", err?.message);
        }
    }

    /**
     * ========================================
     * HELPER: Tạo instruction tiếng Việt chuẩn
     * ========================================
     */
    private getVietnameseInstruction(role: string = "giáo viên tiếng Anh"): string {
        return `Bạn là ${role} chuyên nghiệp.

**YÊU CẦU NGÔN NGỮ BẮT BUỘC:**
- Trả lời HOÀN TOÀN bằng tiếng Việt
- Sử dụng thuật ngữ giáo dục phù hợp cho học sinh Việt Nam
- Giải thích rõ ràng, dễ hiểu, tone thân thiện và khích lệ
- Tất cả feedback phải bằng tiếng Việt (không được lẫn tiếng Anh)

`;
    }

    /**
     * ========================================
     * HELPER: Rubric chấm điểm chuẩn cho image writing
     * ========================================
     */
    private getImageWritingRubric(): string {
        return `
**RUBRIC CHẤM ĐIỂM CHUẨN (0-100):**

📊 **ĐIỂM SỐ THEO TIÊU CHÍ:**
- **Ngữ pháp đúng + 2 từ đúng + mô tả chính xác ảnh** = 90-100 điểm
- **Ngữ pháp đúng + 2 từ đúng + KHÔNG liên quan ảnh** = 50-60 điểm  
- **Ngữ pháp đúng + thiếu 1 từ + mô tả đúng ảnh** = 60-70 điểm
- **Ngữ pháp có lỗi + 2 từ + không liên quan ảnh** = 20-35 điểm
- **Chi tiết sai về ảnh (giới tính, màu sắc, vật liệu)** = trừ 15-20 điểm

📋 **NGUYÊN TẮC CHẤM:**
1. **meaning.is_correct** = true nếu câu có nghĩa về mặt ngữ pháp (dù không khớp ảnh)
2. **image_relevance** riêng biệt đánh giá độ khớp với ảnh
3. **vocabulary.issues** phải có issue cụ thể nếu has_issues = true
4. **correction** chỉ sửa lỗi, không viết lại toàn bộ câu nếu ngữ pháp đúng

`;
    }

    /**
     * ========================================
     * HELPER: Chi tiết cần kiểm tra trong ảnh
     * ========================================
     */
    private getImageDetailCheckInstruction(): string {
        return `
**KIỂM TRA CHI TIẾT ẢNH CỤ THỂ:**
- Giới tính nhân vật (man/woman)
- Màu sắc đồ vật (red/blue/black...)
- Vật liệu (wooden/stone/metal...)
- Hành động chính xác (walking/running/sitting...)
- Vị trí không gian (across/on/under...)

**NẾU SAI CHI TIẾT:**
- Ghi nhận trong image_relevance
- Trừ điểm tương ứng (15-20 điểm)
- Đưa vào correction với lý do cụ thể

`;
    }

    /**
     * ========================================
     * VALIDATION HELPER: Đảm bảo logic kết quả image writing
     * ========================================
     */
    private validateImageWritingResult(result: any, sentence: string, requiredWords: string[]): any {
        // ✅ Fix vocabulary.issues nếu has_issues = true
        if (result.vocabulary?.has_issues === true && (!result.vocabulary.issues || result.vocabulary.issues.length === 0)) {
            result.vocabulary.issues = [{
                incorrect_usage: "missing_validation",
                issue_type: "validation_error",
                explanation: "Cần kiểm tra kỹ hơn về từ vựng",
                correct_suggestion: "Sử dụng đúng từ vựng yêu cầu"
            }];
        }

        // ✅ Kiểm tra thiếu từ bắt buộc
        const usedWords = requiredWords.filter(word =>
            sentence.toLowerCase().includes(word.toLowerCase())
        );

        if (usedWords.length < requiredWords.length) {
            const missingWords = requiredWords.filter(word =>
                !sentence.toLowerCase().includes(word.toLowerCase())
            );

            result.vocabulary.has_issues = true;
            result.vocabulary.issues = result.vocabulary.issues || [];

            for (const missingWord of missingWords) {
                result.vocabulary.issues.push({
                    incorrect_usage: `Thiếu từ "${missingWord}"`,
                    issue_type: "missing_required_word",
                    explanation: `Câu chưa sử dụng từ bắt buộc "${missingWord}"`,
                    correct_suggestion: `Thêm từ "${missingWord}" vào câu`
                });
            }
        }

        return result;
    }

    /**
     * ========================================
     * VALIDATION HELPER: Đảm bảo logic kết quả text writing
     * ========================================
     */
    private validateTextWritingResult(result: any, sentence: string, requiredWords: string[]): any {
        // ✅ Fix vocabulary.issues tương tự image writing
        if (result.vocabulary?.has_issues === true && (!result.vocabulary.issues || result.vocabulary.issues.length === 0)) {
            result.vocabulary.issues = [{
                incorrect_usage: "missing_validation",
                issue_type: "validation_error",
                explanation: "Cần kiểm tra kỹ hơn về từ vựng",
                correct_suggestion: "Sử dụng đúng từ vựng yêu cầu"
            }];
        }

        // ✅ Kiểm tra thiếu từ bắt buộc
        const usedWords = requiredWords.filter(word =>
            sentence.toLowerCase().includes(word.toLowerCase())
        );

        if (usedWords.length < requiredWords.length) {
            const missingWords = requiredWords.filter(word =>
                !sentence.toLowerCase().includes(word.toLowerCase())
            );

            result.vocabulary.has_issues = true;
            result.vocabulary.issues = result.vocabulary.issues || [];

            for (const missingWord of missingWords) {
                result.vocabulary.issues.push({
                    incorrect_usage: `Thiếu từ "${missingWord}"`,
                    issue_type: "missing_required_word",
                    explanation: `Câu chưa sử dụng từ bắt buộc "${missingWord}"`,
                    correct_suggestion: `Thêm từ "${missingWord}" vào câu`
                });
            }
        }

        return result;
    }

    /**
     * ========================================
     * API 3.1: Generate TOEIC-style email prompt
     */
    async generateEmailPrompt(context?: string): Promise<any> {
        const schema = {
            type: Type.OBJECT,
            properties: {
                from: { type: Type.STRING },
                to: { type: Type.STRING },
                subject: { type: Type.STRING },
                sent: { type: Type.STRING },
                body: { type: Type.STRING },
                full_email: { type: Type.STRING }
            },
            required: ["from", "to", "subject", "body", "full_email"]
        };

        const prompt = `
Bạn là người ra đề theo định dạng TOEIC/ETS. Hãy tạo 1 email đề bài ngắn, rõ ràng và chuẩn theo cấu trúc sau:
From: <Department>
To: <Recipients>
Subject: <subject>
Sent: <Tháng ngày, HH:MM>

Dear <...>,
<Đoạn văn ngắn mô tả tình huống (1 đoạn), nêu 2 thông tin quan trọng và yêu cầu người nhận "xác nhận đã nhận" hoặc "phản hồi" kèm 1 câu hỏi cụ thể>
Best regards,
<Sender name>

Yêu cầu:
- Email phải ngắn (1 đoạn thân chính), rõ ràng, phù hợp format TOEIC/ETS.
- Trả về JSON chứa các trường: from, to, subject, sent, body, full_email (full_email là toàn bộ email đã được format sẵn để hiển thị).
`.trim();

        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.3
                }
            });

            const jsonString = (response.text || "").trim();
            if (!jsonString) throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            return JSON.parse(jsonString);
        } catch (err: any) {
            if (err instanceof AppError) throw err;
            console.error("Gemini generateEmailPrompt error:", err);
            throw AppError.internalServerError("Lỗi khi tạo đề email.", err?.message);
        }
    }

    /**
     * API 3.2: Suggest 5 keywords for replying to prompt_email
     */
    async suggestEmailKeywords(promptEmail: string, context?: string): Promise<any> {
        const schema = {
            type: Type.OBJECT,
            properties: {
                keywords: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            keyword: { type: Type.STRING },
                            meaning: { type: Type.STRING },
                            usage_example: { type: Type.STRING }
                        },
                        required: ["keyword", "meaning", "usage_example"]
                    }
                },
                note: { type: Type.STRING }
            },
            required: ["keywords"]
        };

        const prompt = `
Bạn là giáo viên tiếng Anh. Dưới đây là nội dung email đề bài (giữ nguyên để tham khảo):
"${promptEmail}"

Yêu cầu:
1) Đề xuất CHÍNH XÁC 5 từ hoặc cụm từ (keywords/collocations) phù hợp để đưa vào email phản hồi nhằm:
   - Xác nhận đã nhận thông tin
   - Hỏi thêm 1 thông tin cần thiết (câu hỏi follow-up)
2) Với mỗi keyword/cụm từ, cung cấp:
   - keyword (chuẩn tiếng Anh)
   - nghĩa tiếng Việt ngắn gọn
   - 1 câu ví dụ ngắn cho thấy cách dùng keyword đó trong email phản hồi (câu ví dụ phải là 1 câu email tự nhiên)
3) Trả về JSON chỉ gồm 5 mục trong mảng "keywords".
`.trim();

        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.4
                }
            });

            const jsonString = (response.text || "").trim();
            if (!jsonString) throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            return JSON.parse(jsonString);
        } catch (err: any) {
            if (err instanceof AppError) throw err;
            console.error("Gemini suggestEmailKeywords error:", err);
            throw AppError.internalServerError("Lỗi khi gợi ý từ khóa email.", err?.message);
        }
    }

    /**
     * API 3.3: Check / grade reply email
     */
    async checkEmailWriting(promptEmail: string, responseEmail: string, context?: string): Promise<any> {
        const schema = {
            type: Type.OBJECT,
            properties: {
                criteria_scores: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            criterion: { type: Type.STRING },
                            score: { type: Type.NUMBER },
                            feedback: { type: Type.STRING }
                        },
                        required: ["criterion", "score", "feedback"]
                    }
                },
                overall_score: { type: Type.NUMBER },
                cefr_level: { type: Type.STRING },
                detailed_explanation: { type: Type.STRING },
                conclusion: { type: Type.STRING }
            },
            required: ["criteria_scores", "overall_score", "cefr_level", "detailed_explanation", "conclusion"]
        };

        const prompt = `
Bạn là một giảng viên tiếng Anh giàu kinh nghiệm. Hãy chấm bài email phản hồi của học sinh dựa trên 4 tiêu chí sau (mỗi tiêu chí 0-100):
1) Task Fulfillment: Mức độ trả lời đầy đủ yêu cầu trong đề (xác nhận + hỏi thông tin nếu đề yêu cầu).
2) Coherence & Cohesion: Sự mạch lạc, liên kết ý, dùng từ nối.
3) Grammar & Accuracy: Ngữ pháp, chia thì, chính tả.
4) Vocabulary & Appropriacy: Từ vựng, collocation, phong cách phù hợp với email.

Email đề bài (để tham khảo):
"${promptEmail}"

Email phản hồi của học sinh:
"${responseEmail}"

Yêu cầu:
- Với mỗi tiêu chí: đưa "criterion" BẰNG TIẾNG VIỆT, "score" (0-100) và "feedback" BẰNG TIẾNG VIỆT giải thích chi tiết lý do, điểm mạnh, điểm yếu, ví dụ cụ thể từ bài viết.
- Tính overall_score (0-100) theo công thức trung bình cộng của 4 tiêu chí.
- Dựa vào overall_score, xác định CEFR level (A1->C2).
- Viết detailed_explanation BẰNG TIẾNG VIỆT: phân tích chi tiết từng khía cạnh (Task Fulfillment, Coherence, Grammar, Vocabulary), nêu rõ điểm tốt và cần cải thiện, kèm ví dụ cụ thể từ bài viết của học sinh.
- Viết conclusion BẰNG TIẾNG VIỆT: kết luận ngắn gọn về mức độ hoàn thành email, điểm nổi bật, lời khuyên cải thiện và khuyến khích tích cực.

QUAN TRỌNG: TẤT CẢ NỘI DUNG (criterion, feedback, detailed_explanation, conclusion) PHẢI BẰNG TIẾNG VIỆT để học sinh Việt Nam dễ hiểu.

Trả về JSON theo schema đã nêu.
`.trim();

        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.3
                }
            });

            const jsonString = (response.text || "").trim();
            if (!jsonString) throw AppError.internalServerError("Gemini trả về dữ liệu rỗng.");
            return JSON.parse(jsonString);
        } catch (err: any) {
            if (err instanceof AppError) throw err;
            console.error("Gemini checkEmailWriting error:", err);
            throw AppError.internalServerError("Lỗi khi chấm email.", err?.message);
        }
    }

    /**
     * ========================================
     * HELPER: Fetch ảnh từ URL và convert sang Base64
     * ========================================
     */
    private async fetchImageAsBase64(imageUrl: string): Promise<string> {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return buffer.toString('base64');

        } catch (err: any) {
            console.error("❌ [GeminiService] fetchImageAsBase64 error:", err);
            throw AppError.internalServerError("Không thể tải hình ảnh từ URL.", err?.message);
        }
    }
}

export default GeminiService;
