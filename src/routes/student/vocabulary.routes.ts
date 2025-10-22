import { Router } from "express";
import { container } from "tsyringe";
import StudentVocabularyController from "../../controllers/student-vocabulary.controller";
import PronunciationController from "../../controllers/pronunciation.controller";
import { validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import multer from "multer";
import { SetIdParamDto } from "../../dtos/request/vocabulary.request.dto";
import { UserRole } from "../../models/user.model";
const studentVocabularyRoutes = Router();
const studentVocabularyController = container.resolve(StudentVocabularyController);
const pronunciationController = container.resolve(PronunciationController);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
studentVocabularyRoutes.use(
    authenticateToken,
    authorizeRoles(UserRole.STUDENT)
);

// GET /student/vocabulary/sets?course_id=xxx
studentVocabularyRoutes.get(
    "/sets",
    studentVocabularyController.getVocabularySets
);
// GET /student/vocabulary/sets/:setId
studentVocabularyRoutes.get(
    "/sets/:setId",
    validationParams(SetIdParamDto),
    studentVocabularyController.getVocabularySetById
);

// POST /student/vocabulary/pronunciation
studentVocabularyRoutes.post(
    "/pronunciation",
    upload.single("audio"),
    pronunciationController.assessPronunciation
);

export default studentVocabularyRoutes;
