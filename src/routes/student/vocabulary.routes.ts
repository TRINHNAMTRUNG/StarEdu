import { Router } from "express";
import { container } from "tsyringe";
import StudentVocabularyController from "../../controllers/student-vocabulary.controller";
import PronunciationController from "../../controllers/pronunciation.controller";
import { validationParams, validationBody } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles, optionalAuth } from "../../middlewares/auth.middleware";
import multer from "multer";
import { SetIdParamDto, GenerateVocabularySetDto } from "../../dtos/request/vocabulary.request.dto";
import { UserRole } from "../../models/user.model";
const studentVocabularyRoutes = Router();
const studentVocabularyController = container.resolve(StudentVocabularyController);
const pronunciationController = container.resolve(PronunciationController);

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit for pronunciation routes
    }
});

// GET /student/vocabulary/sets - Lấy tất cả bộ từ vựng (không cần course_id)
studentVocabularyRoutes.get(
    "/sets",
    optionalAuth,  // ✅ Thêm middleware này
    studentVocabularyController.getVocabularySets
);

studentVocabularyRoutes.get(
    "/sets/:setId",
    optionalAuth,  // ✅ Thêm middleware này
    validationParams(SetIdParamDto),
    studentVocabularyController.getVocabularySetById
);

// PRIVATE ROUTES (Can auth)
studentVocabularyRoutes.post(
    "/pronunciation",
    authenticateToken,
    authorizeRoles(UserRole.STUDENT),
    upload.single("audio"),
    pronunciationController.assessPronunciation
);

// POST /student/vocabulary/pronunciation-toeic - Đánh giá phát âm TOEIC bằng OpenAI
studentVocabularyRoutes.post(
    "/pronunciation-toeic",
    authenticateToken,
    authorizeRoles(UserRole.STUDENT),
    upload.single("audio"),
    pronunciationController.evaluateToeicSpeech
);

// POST /student/vocabulary/evaluate-writing - Đánh giá TOEIC Writing bằng GPT-4o-mini
studentVocabularyRoutes.post(
    "/evaluate-writing",
    authenticateToken,
    authorizeRoles(UserRole.STUDENT),
    pronunciationController.evaluateWriting
);

// ===== STUDENT CUSTOM VOCABULARY SETS =====

// POST /student/vocabulary/generate - Tạo set từ vựng bằng AI theo chủ đề
studentVocabularyRoutes.post(
    "/generate",
    authenticateToken,
    authorizeRoles(UserRole.STUDENT),
    validationBody(GenerateVocabularySetDto),
    studentVocabularyController.generateVocabularySet
);

// GET /student/vocabulary/my-sets - Lấy tất cả set từ vựng cá nhân
studentVocabularyRoutes.get(
    "/my-sets",
    authenticateToken,
    authorizeRoles(UserRole.STUDENT),
    studentVocabularyController.getMyCustomSets
);

// GET /student/vocabulary/my-sets/:setId - Lấy chi tiết set từ vựng cá nhân
studentVocabularyRoutes.get(
    "/my-sets/:setId",
    authenticateToken,
    authorizeRoles(UserRole.STUDENT),
    validationParams(SetIdParamDto),
    studentVocabularyController.getMyCustomSetById
);

// DELETE /student/vocabulary/my-sets/:setId - Xóa set từ vựng cá nhân
studentVocabularyRoutes.delete(
    "/my-sets/:setId",
    authenticateToken,
    authorizeRoles(UserRole.STUDENT),
    validationParams(SetIdParamDto),
    studentVocabularyController.deleteMyCustomSet
);

export default studentVocabularyRoutes;
