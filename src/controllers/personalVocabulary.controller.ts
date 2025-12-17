import { Request, Response, NextFunction } from "express";
import { container } from "tsyringe";
import PersonalVocabularyService from "../services/personalVocabulary.service";

class PersonalVocabularyController {
    private service: PersonalVocabularyService;

    constructor() {
        this.service = container.resolve(PersonalVocabularyService);
    }

    /**
     * POST /api/vocabulary/personal/generate
     * Auto-generate từ vựng từ AI
     */
    autoGenerateWord = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const { word } = req.body;
            if (!word) {
                return res.status(400).json({ message: "Word is required" });
            }
            const result = await this.service.autoGenerateWord(req.user.id, word);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/vocabulary/personal
     * Thêm từ mới
     */
    addWord = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const result = await this.service.addWord(req.user.id, req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/vocabulary/personal/as-set
     * Lấy personal vocabulary dạng VocabularySet để luyện tập
     */
    getAsVocabularySet = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const result = await this.service.getAsVocabularySet(req.user.id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/vocabulary/personal
     * Lấy danh sách từ cá nhân
     */
    getMyVocabulary = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            
            const filters = {
                tags: req.query.tags as string,
                mastery_level: req.query.mastery_level ? parseInt(req.query.mastery_level as string) : undefined,
                is_favorite: req.query.is_favorite === 'true' ? true : undefined,
                search: req.query.search as string
            };

            const result = await this.service.getMyVocabulary(req.user.id, page, limit, filters);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/vocabulary/personal/statistics
     * Lấy thống kê
     */
    getStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const result = await this.service.getStatistics(req.user.id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/vocabulary/personal/:id
     * Cập nhật từ
     */
    updateWord = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const { id } = req.params;
            const result = await this.service.updateWord(req.user.id, id, req.body);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * DELETE /api/vocabulary/personal/:id
     * Xóa từ
     */
    deleteWord = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const { id } = req.params;
            const result = await this.service.deleteWord(req.user.id, id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/vocabulary/personal/:id/favorite
     * Toggle favorite
     */
    toggleFavorite = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const { id } = req.params;
            const result = await this.service.toggleFavorite(req.user.id, id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/vocabulary/personal/:id/review
     * Đánh dấu đã ôn
     */
    markAsReviewed = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const { id } = req.params;
            const { mastery_level } = req.body;
            const result = await this.service.markAsReviewed(req.user.id, id, mastery_level);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/vocabulary/personal/review
     * Lấy từ cần ôn
     */
    getWordsToReview = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const limit = parseInt(req.query.limit as string) || 20;
            const result = await this.service.getWordsToReview(req.user.id, limit);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/vocabulary/personal/tags
     * Lấy tất cả tags
     */
    getAllTags = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const result = await this.service.getAllTags(req.user.id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };
}

export default new PersonalVocabularyController();
