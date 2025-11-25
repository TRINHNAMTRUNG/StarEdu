import { injectable } from "tsyringe";
import GeminiService from "./gemini.service";
import {
    SuggestTextCollocationsReqDto,
    CheckTextWritingReqDto,
    SuggestImageCollocationsReqDto,
    CheckImageWritingReqDto,
    SuggestEmailKeywordsReqDto,
    CheckEmailWritingReqDto
} from "../dtos/request/writing.request.dto";

@injectable()
class WritingService {
    constructor(private readonly geminiService: GeminiService) { }

    /**
     * ========================================
     * TÍNH NĂNG 1: TEXT WRITING
     * ========================================
     */

    /**
     * API 1.1: Gợi ý 5 collocation cho text writing
     * Dựa vào 2 từ cho trước
     */
    async suggestTextCollocations(dto: SuggestTextCollocationsReqDto) {
        try {
            console.log(`📝 [WritingService] Suggesting text collocations for: [${dto.required_words.join(", ")}]`);

            // Fixed context for text collocations
            const fixedContext = "contextual_examples";

            // Gọi GeminiService để xử lý prompt và schema
            const result = await this.geminiService.suggestTextCollocations(
                dto.required_words,
                fixedContext
            );

            console.log(`✅ [WritingService] Text collocation suggestions generated`);
            return result;

        } catch (err: any) {
            console.error("❌ [WritingService] suggestTextCollocations error:", err);
            throw err;
        }
    }

    /**
     * API 1.2: Chấm bài text writing
     * Chấm câu dựa vào 2 từ cho trước (KHÔNG có hình ảnh)
     */
    async checkTextWriting(dto: CheckTextWritingReqDto) {
        try {
            console.log(`📝 [WritingService] Checking text writing: "${dto.sentence.substring(0, 50)}..."`);

            // Fixed context for text checking (educational, neutral, encouraging)
            const fixedContext = "educational_neutral";

            // Gọi GeminiService để chấm bài
            const result = await this.geminiService.checkTextWriting(
                dto.sentence,
                dto.required_words,
                fixedContext
            );

            console.log(`✅ [WritingService] Text writing checked, score: ${result.overall_score}/100`);
            return result;

        } catch (err: any) {
            console.error("❌ [WritingService] checkTextWriting error:", err);
            throw err;
        }
    }

    /**
     * ========================================
     * TÍNH NĂNG 2: IMAGE WRITING
     * ========================================
     */

    /**
     * API 2.1: Gợi ý 5 collocation cho image writing
     * Dựa vào HÌNH ẢNH + 2 từ cho trước
     */
    async suggestImageCollocations(dto: SuggestImageCollocationsReqDto) {
        try {
            console.log(`📝 [WritingService] Suggesting image collocations for: [${dto.required_words.join(", ")}] with image: ${dto.image_url}`);

            // Fixed context for image collocations: emphasize visual relevance
            const fixedContext = "visual_descriptive";

            // Gọi GeminiService với image URL
            const result = await this.geminiService.suggestImageCollocations(
                dto.image_url,
                dto.required_words,
                fixedContext
            );

            console.log(`✅ [WritingService] Image collocation suggestions generated`);
            return result;

        } catch (err: any) {
            console.error("❌ [WritingService] suggestImageCollocations error:", err);
            throw err;
        }
    }

    /**
     * API 2.2: Chấm bài image writing
     * Chấm câu dựa vào HÌNH ẢNH + 2 từ cho trước
     */
    async checkImageWriting(dto: CheckImageWritingReqDto) {
        try {
            console.log(`📝 [WritingService] Checking image writing: "${dto.sentence.substring(0, 50)}..." with image: ${dto.image_url}`);

            // Fixed context for image checking: rubric + image relevance emphasis
            const fixedContext = "visual_rubric_relevance";

            // Gọi GeminiService để chấm bài (có xem xét hình ảnh)
            const result = await this.geminiService.checkImageWriting(
                dto.sentence,
                dto.image_url,
                dto.required_words,
                fixedContext
            );

            console.log(`✅ [WritingService] Image writing checked, score: ${result.overall_score}/100`);
            return result;

        } catch (err: any) {
            console.error("❌ [WritingService] checkImageWriting error:", err);
            throw err;
        }
    }

    /**
     * API 3.1: Generate TOEIC-style email prompt
     */
    async generateEmailPrompt() {
        // fixed context for TOEIC/ETS style
        const fixedContext = "toeic_ets";
        return this.geminiService.generateEmailPrompt(fixedContext);
    }

    /**
     * API 3.2: Suggest 5 keywords for replying to prompt_email
     */
    async suggestEmailKeywords(dto: { prompt_email: string } | SuggestEmailKeywordsReqDto) {
        const promptEmail = (dto as any).prompt_email;
        const fixedContext = "email_keywords";
        return this.geminiService.suggestEmailKeywords(promptEmail, fixedContext);
    }

    /**
     * API 3.3: Check / grade student's reply email
     */
    async checkEmailWriting(dto: { prompt_email: string; response_email: string } | CheckEmailWritingReqDto) {
        const promptEmail = (dto as any).prompt_email;
        const responseEmail = (dto as any).response_email;
        const fixedContext = "email_rubric";
        return this.geminiService.checkEmailWriting(promptEmail, responseEmail, fixedContext);
    }
}

export default WritingService;