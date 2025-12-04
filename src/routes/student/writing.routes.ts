import { Router } from "express";
import { container } from "tsyringe";
import WritingController from "../../controllers/writing.controller";
import { validationBody } from "../../middlewares/validationError.middleware";
import { authenticateToken } from "../../middlewares/auth.middleware";
import {
    SuggestTextCollocationsReqDto,
    CheckTextWritingReqDto,
    SuggestImageCollocationsReqDto,
    CheckImageWritingReqDto,
    GenerateEmailPromptReqDto,
    SuggestEmailKeywordsReqDto,
    CheckEmailWritingReqDto
} from "../../dtos/request/writing.request.dto";

const writingRoutes = Router();
const writingController = container.resolve(WritingController);

/**
 * ============================================
 * TẤT CẢ ROUTES YÊU CẦU AUTHENTICATION
 * ============================================
 * Chỉ user đã đăng nhập mới được sử dụng tính năng Writing AI
 */
writingRoutes.use(authenticateToken);

/**
 * ============================================
 * API #1: POST /api/writing/text-writing/suggest-collocations
 * Gợi ý 5 collocation cho text writing
 * ============================================
 * 
 * Use Case:
 * - Học sinh nhận đề bài: "Viết câu với 2 từ: accept, so"
 * - Học sinh bấm "Gợi ý" → Hiện 5 collocation để tham khảo
 * 
 * Request Body Example:
 * {
 *   "required_words": ["accept", "so"]
 * }
 * 
 * Note: "context" đã được loại bỏ từ client; backend sử dụng context cố định nội bộ.
 */
writingRoutes.post(
    "/text-writing/suggest-collocations",
    validationBody(SuggestTextCollocationsReqDto),
    writingController.suggestTextCollocations
);

/**
 * ============================================
 * API #2: POST /api/writing/text-writing/check-sentence
 * Chấm bài và phân tích câu (text-only)
 * ============================================
 * 
 * Use Case:
 * - Học sinh viết xong câu và bấm "Chấm bài"
 * 
 * Request Body Example:
 * {
 *   "sentence": "she didn't accept the offer, so the manager had to find another candidate",
 *   "required_words": ["accept", "so"]
 * }
 * 
 * Response: meaning, grammar, vocabulary, correction, overall_score, feedback_summary
 * Note: backend áp context cố định cho việc chấm (không nhận từ client).
 */
writingRoutes.post(
    "/text-writing/check-sentence",
    validationBody(CheckTextWritingReqDto),
    writingController.checkTextWriting
);

/**
 * ============================================
 * API #3: POST /api/writing/image-writing/suggest-collocations
 * Gợi ý 5 collocation dựa vào ảnh + 2 từ
 * ============================================
 * 
 * Use Case:
 * - Học sinh xem ảnh + 2 từ, bấm "Gợi ý" để nhận collocation phù hợp với nội dung ảnh
 * 
 * Request Body Example:
 * {
 *   "image_url": "https://s3.amazonaws.com/bucket/image123.jpg",
 *   "required_words": ["backpack", "across"]
 * }
 * 
 * Note: backend sử dụng context nội bộ để nhấn mạnh tính liên quan tới ảnh.
 */
writingRoutes.post(
    "/image-writing/suggest-collocations",
    validationBody(SuggestImageCollocationsReqDto),
    writingController.suggestImageCollocations
);

/**
 * ============================================
 * API #4: POST /api/writing/image-writing/check-sentence
 * Chấm bài dựa vào ảnh + 2 từ
 * ============================================
 * 
 * Use Case:
 * - Học sinh viết câu mô tả ảnh rồi bấm "Chấm bài"
 * 
 * Request Body Example:
 * {
 *   "sentence": "A man wearing a backpack walks across the bridge.",
 *   "image_url": "https://s3.amazonaws.com/bucket/image123.jpg",
 *   "required_words": ["backpack", "across"]
 * }
 * 
 * Response includes image_relevance field inside meaning section.
 * Note: backend áp context/rubric cố định cho việc chấm ảnh.
 */
writingRoutes.post(
    "/image-writing/check-sentence",
    validationBody(CheckImageWritingReqDto),
    writingController.checkImageWriting
);

/**
 * ============================================
 * FEATURE 3: EMAIL WRITING (TOEIC-style)
 * ============================================
 */

// API 3.1: POST /api/writing/email-writing/generate-prompt
// No body required (DTO empty) - backend will ask Gemini to generate TOEIC/ETS style email prompt
writingRoutes.post(
    "/email-writing/generate-prompt",
    validationBody(GenerateEmailPromptReqDto),
    writingController.generateEmailPrompt
);

// API 3.2: POST /api/writing/email-writing/suggest-keywords
// Body: { prompt_email: string }
writingRoutes.post(
    "/email-writing/suggest-keywords",
    validationBody(SuggestEmailKeywordsReqDto),
    writingController.suggestEmailKeywords
);

// API 3.3: POST /api/writing/email-writing/check-email
// Body: { prompt_email: string, response_email: string }
writingRoutes.post(
    "/email-writing/check-email",
    validationBody(CheckEmailWritingReqDto),
    writingController.checkEmailWriting
);



export default writingRoutes;