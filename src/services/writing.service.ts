import { injectable } from "tsyringe";
import GeminiService from "./gemini.service";
import { CheckEmailWritingReqDto, SuggestEmailKeywordsReqDto } from "../dtos/request/writing.request.dto";

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
     * Thay đổi: nhận trực tiếp requiredWords thay vì DTO
     */
    async suggestTextCollocations(requiredWords: string[], context?: string) {
        try {
            console.log(`📝 [WritingService] Suggesting text collocations for: [${requiredWords.join(", ")}]`);

            const fixedContext = context ?? "contextual_examples";

            const result = await this.geminiService.suggestTextCollocations(
                requiredWords,
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
     * Thay đổi: nhận sentence và requiredWords trực tiếp
     */
    async checkTextWriting(sentence: string, requiredWords: string[], context?: string) {
        try {
            console.log(`📝 [WritingService] Checking text writing: "${String(sentence).substring(0, 50)}..."`);

            const fixedContext = context ?? "educational_neutral";

            const result = await this.geminiService.checkTextWriting(
                sentence,
                requiredWords,
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
     * API 2.1: Gợi ý collocation cho image writing
     * Thay đổi: nhận imageUrl và requiredWords trực tiếp
     */
    async suggestImageCollocations(imageUrl: string, requiredWords: string[], context?: string) {
        try {
            console.log(`📝 [WritingService] Suggesting image collocations for: [${requiredWords.join(", ")}] with image: ${imageUrl}`);

            const fixedContext = context ?? "visual_descriptive";

            const result = await this.geminiService.suggestImageCollocations(
                imageUrl,
                requiredWords,
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
     * Thay đổi: nhận sentence, imageUrl và requiredWords trực tiếp
     */
    async checkImageWriting(sentence: string, imageUrl: string, requiredWords: string[], context?: string) {
        try {
            console.log(`📝 [WritingService] Checking image writing: "${String(sentence).substring(0, 50)}..." with image: ${imageUrl}`);

            const fixedContext = context ?? "visual_rubric_relevance";

            const result = await this.geminiService.checkImageWriting(
                sentence,
                imageUrl,
                requiredWords,
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