import { Router } from "express";
import { container } from "tsyringe";
import WritingController from "../../controllers/writing.controller";
import { validationBody, validationQuery } from "../../middlewares/validationError.middleware";
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
import { GetRandomPromptReqDto } from "../../dtos/request/writing.request.dto";
import AdminWritingService from "../../services/admin-writing.service";

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
 * API #1: POST /student/writing/text-writing/suggest-collocations
 * Gợi ý 5 collocation cho text writing
 * ============================================
 * 
 * Use Case:
 * - Học sinh lấy đề ngẫu nhiên từ GET /student/writing/text-writing/random
 * - Học sinh bấm "Gợi ý" → gửi prompt_id để nhận 5 collocation
 * 
 * Request Body Example:
 * {
 *   "prompt_id": "67503a1b2f8c9d4e5a6b7c8d"
 * }
 */
writingRoutes.post(
    "/text-writing/suggest-collocations",
    validationBody(SuggestTextCollocationsReqDto),
    writingController.suggestTextCollocations
);

/**
 * ============================================
 * API #2: POST /student/writing/text-writing/check-sentence
 * Chấm bài và phân tích câu (text-only)
 * ============================================
 * 
 * Use Case:
 * - Học sinh viết xong câu và bấm "Chấm bài"
 * 
 * Request Body Example:
 * {
 *   "prompt_id": "67503a1b2f8c9d4e5a6b7c8d",
 *   "sentence": "she didn't accept the offer, so the manager had to find another candidate"
 * }
 */
writingRoutes.post(
    "/text-writing/check-sentence",
    validationBody(CheckTextWritingReqDto),
    writingController.checkTextWriting
);

/**
 * ============================================
 * API #3: POST /student/writing/image-writing/suggest-collocations
 * Gợi ý 5 collocation dựa vào ảnh + 2 từ
 * ============================================
 * 
 * Use Case:
 * - Học sinh lấy đề image từ GET /student/writing/image-writing/random
 * - Học sinh xem ảnh + 2 từ, bấm "Gợi ý"
 * 
 * Request Body Example:
 * {
 *   "prompt_id": "67503a1b2f8c9d4e5a6b7c8d"
 * }
 */
writingRoutes.post(
    "/image-writing/suggest-collocations",
    validationBody(SuggestImageCollocationsReqDto),
    writingController.suggestImageCollocations
);

/**
 * ============================================
 * API #4: POST /student/writing/image-writing/check-sentence
 * Chấm bài dựa vào ảnh + 2 từ
 * ============================================
 * 
 * Request Body Example:
 * {
 *   "prompt_id": "67503a1b2f8c9d4e5a6b7c8d",
 *   "sentence": "A man wearing a backpack walks across the bridge."
 * }
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

// POST /student/writing/email-writing/generate-prompt
writingRoutes.post(
    "/email-writing/generate-prompt",
    validationBody(GenerateEmailPromptReqDto),
    writingController.generateEmailPrompt
);

// POST /student/writing/email-writing/suggest-keywords
writingRoutes.post(
    "/email-writing/suggest-keywords",
    validationBody(SuggestEmailKeywordsReqDto),
    writingController.suggestEmailKeywords
);

// POST /student/writing/email-writing/check-email
writingRoutes.post(
    "/email-writing/check-email",
    validationBody(CheckEmailWritingReqDto),
    writingController.checkEmailWriting
);

// GET /student/writing/text-writing/random
writingRoutes.get(
    "/text-writing/random",
    validationQuery(GetRandomPromptReqDto),
    async (req, res, next) => {
        try {
            const adminService = container.resolve(AdminWritingService);
            const prompt = await adminService.getRandomPrompt("text" as any);
            return res.status(200).json({
                success: true,
                message: "Lấy đề text ngẫu nhiên thành công",
                code: 200,
                requestId: req.requestId,
                data: prompt
            });
        } catch (err) {
            next(err);
        }
    }
);

// GET /student/writing/image-writing/random
writingRoutes.get(
    "/image-writing/random",
    validationQuery(GetRandomPromptReqDto),
    async (req, res, next) => {
        try {
            const adminService = container.resolve(AdminWritingService);
            const prompt = await adminService.getRandomPrompt("image" as any);
            return res.status(200).json({
                success: true,
                message: "Lấy đề image ngẫu nhiên thành công",
                code: 200,
                requestId: req.requestId,
                data: prompt
            });
        } catch (err) {
            next(err);
        }
    }
);

export default writingRoutes;