import { Router } from "express";
import personalVocabularyController from "../controllers/personalVocabulary.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

// POST /api/vocabulary/personal/generate - Auto-generate từ AI
router.post("/generate", personalVocabularyController.autoGenerateWord);

// GET /api/vocabulary/personal/statistics - Thống kê
router.get("/statistics", personalVocabularyController.getStatistics);

// GET /api/vocabulary/personal/review - Lấy từ cần ôn
router.get("/review", personalVocabularyController.getWordsToReview);

// GET /api/vocabulary/personal/tags - Lấy tất cả tags
router.get("/tags", personalVocabularyController.getAllTags);

// GET /api/vocabulary/personal/as-set - Lấy dạng VocabularySet để luyện tập
router.get("/as-set", personalVocabularyController.getAsVocabularySet);

// GET /api/vocabulary/personal - Lấy danh sách từ
router.get("/", personalVocabularyController.getMyVocabulary);

// POST /api/vocabulary/personal - Thêm từ mới
router.post("/", personalVocabularyController.addWord);

// PUT /api/vocabulary/personal/:id - Cập nhật từ
router.put("/:id", personalVocabularyController.updateWord);

// DELETE /api/vocabulary/personal/:id - Xóa từ
router.delete("/:id", personalVocabularyController.deleteWord);

// POST /api/vocabulary/personal/:id/favorite - Toggle favorite
router.post("/:id/favorite", personalVocabularyController.toggleFavorite);

// POST /api/vocabulary/personal/:id/review - Đánh dấu đã ôn
router.post("/:id/review", personalVocabularyController.markAsReviewed);

export default router;
