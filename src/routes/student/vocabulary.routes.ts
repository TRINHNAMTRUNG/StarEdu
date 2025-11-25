import { Router } from "express";
import { container } from "tsyringe";
import StudentVocabularyController from "../../controllers/student-vocabulary.controller";
import PronunciationController from "../../controllers/pronunciation.controller";
import { validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles, optionalAuth } from "../../middlewares/auth.middleware";
import multer from "multer";
import { SetIdParamDto } from "../../dtos/request/vocabulary.request.dto";
import { UserRole } from "../../models/user.model";
const studentVocabularyRoutes = Router();
const studentVocabularyController = container.resolve(StudentVocabularyController);
const pronunciationController = container.resolve(PronunciationController);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// PUBLIC ROUTES (Khong can auth)
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

export default studentVocabularyRoutes;
