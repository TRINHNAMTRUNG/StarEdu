import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import VocabularyProgressService from "../services/vocabulary-progress.service";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class VocabularyProgressController {
    constructor(private readonly progressService: VocabularyProgressService) {}

    /**
     * POST /student/vocabulary/progress/mark-learned
     * Đánh dấu từ đã học
     */
    markWordLearned = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user.id;
        const { set_id, word_id, recorded } = req.body;

        const result = await this.progressService.markWordLearned(userId, set_id, word_id, recorded);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Đã đánh dấu từ đã học", 200, req.requestId)
        );
    });

    /**
     * GET /student/vocabulary/progress/:setId
     * Lấy tiến độ học của một set
     */
    getProgress = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user.id;
        const { setId } = req.params;

        const result = await this.progressService.getProgress(userId, setId);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Lấy tiến độ thành công", 200, req.requestId)
        );
    });

    /**
     * GET /student/vocabulary/progress
     * Lấy tất cả tiến độ học
     */
    getAllProgress = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user.id;

        const result = await this.progressService.getAllProgress(userId);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Lấy danh sách tiến độ thành công", 200, req.requestId)
        );
    });
}

export default VocabularyProgressController;
