import { Router } from "express";
import { container } from "tsyringe";
import multer from "multer";
import ImageWritingController from "../../controllers/imageWriting.controller";
import { validationBody } from "../../middlewares/validationError.middleware";
import {
    AnalyzeImageReqDto,
    CreateImageQuestionReqDto,
    UpdateImageQuestionReqDto
} from "../../dtos/request/imageWriting.request.dto";

const adminImageWritingRoutes = Router();
const imageWritingController = container.resolve(ImageWritingController);

// Configure multer for image upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Chỉ chấp nhận file ảnh (JPEG, PNG, WEBP)"));
        }
    }
});

/**
 * Note: Authentication is already applied in admin/index.ts
 * No need to apply authenticateToken here again
 */

/**
 * ================================================
 * FLOW TẠO ĐỀ BÀI IMAGE WRITING
 * ================================================
 * 
 * Step 1: Upload ảnh lên S3
 * POST /api/admin/writing/upload-image
 * Form-data: { image: File }
 * → Response: { image_url: "https://s3.amazonaws.com/..." }
 * 
 * Step 2: Phân tích ảnh bằng Gemini AI
 * POST /api/admin/writing/analyze-image
 * Body: { image_url: "https://..." }
 * → Response: { 
 *     image_description: "A person walking...", 
 *     suggested_category: "activities",
 *     suggested_words: ["walk", "street"]
 *   }
 * 
 * Step 3: Admin nhập 2 từ và tạo đề bài
 * POST /api/admin/writing/image-questions
 * Body: {
 *   image_url: "https://...",
 *   image_description: "...",
 *   required_words: ["walk", "street"],
 *   difficulty: "medium",
 *   category: "activities",
 *   hint: "Describe what the person is doing",
 *   sample_answer: "A person is walking..."
 * }
 * → Response: { question_id: "123", ... }
 */

/**
 * POST /api/admin/writing/upload-image
 * Upload ảnh lên S3 và nhận URL
 */
adminImageWritingRoutes.post(
    "/upload-image",
    upload.single("image"),
    imageWritingController.uploadImage
);

/**
 * POST /api/admin/writing/analyze-image
 * Phân tích ảnh bằng Gemini AI Vision
 */
adminImageWritingRoutes.post(
    "/analyze-image",
    validationBody(AnalyzeImageReqDto),
    imageWritingController.analyzeImage
);

/**
 * POST /api/admin/writing/image-questions
 * Tạo đề bài Image Writing mới
 */
adminImageWritingRoutes.post(
    "/image-questions",
    validationBody(CreateImageQuestionReqDto),
    imageWritingController.createImageQuestion
);

/**
 * GET /api/admin/writing/image-questions
 * Lấy danh sách đề bài (phân trang)
 * Query params: ?page=1&limit=20&difficulty=medium&category=activities
 */
adminImageWritingRoutes.get(
    "/image-questions",
    imageWritingController.getImageQuestions
);

/**
 * PUT /api/admin/writing/image-questions/:id
 * Cập nhật đề bài
 */
adminImageWritingRoutes.put(
    "/image-questions/:id",
    validationBody(UpdateImageQuestionReqDto),
    imageWritingController.updateImageQuestion
);

/**
 * DELETE /api/admin/writing/image-questions/:id
 * Xóa đề bài (soft delete - set isActive = false)
 */
adminImageWritingRoutes.delete(
    "/image-questions/:id",
    imageWritingController.deleteImageQuestion
);

export default adminImageWritingRoutes;
