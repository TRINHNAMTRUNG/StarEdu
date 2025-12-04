import { Router } from "express";
import { container } from "tsyringe";
import VocabularyProgressController from "../../controllers/vocabulary-progress.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { validationBody } from "../../middlewares/validationError.middleware";
import { MarkWordLearnedReqDto } from "../../dtos/request/vocabulary-progress.request.dto";

const router = Router();
const controller = container.resolve(VocabularyProgressController);

// Tất cả routes yêu cầu authentication
router.use(authenticateToken);

/**
 * POST /student/vocabulary/progress/mark-learned
 * Đánh dấu từ đã học
 */
router.post("/mark-learned", validationBody(MarkWordLearnedReqDto), controller.markWordLearned);

/**
 * GET /student/vocabulary/progress/:setId
 * Lấy tiến độ học của một set
 */
router.get("/:setId", controller.getProgress);

/**
 * GET /student/vocabulary/progress
 * Lấy tất cả tiến độ học
 */
router.get("/", controller.getAllProgress);

export default router;
