import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import TestService from "../services/test.service";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class AdminTestController {
    constructor(private testService: TestService) {}

    /**
     * GET /api/admin/tests - Lấy tất cả đề thi (bao gồm chưa publish)
     */
    getAllTests = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 10, year, source } = req.query;
            // Admin có thể xem tất cả, bỏ filter is_published
            const result = await this.testService.getAllTests(
                Number(page),
                Number(limit),
                { year: year ? Number(year) : undefined, source }
            );
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/admin/tests - Tạo đề thi mới
     */
    createTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const createdBy = req.user!.id;
            const result = await this.testService.createTest(req.body, createdBy);
            res.status(201).json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/admin/tests/:id - Cập nhật đề thi
     */
    updateTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const result = await this.testService.updateTest(id, req.body);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/admin/tests/:id/publish - Xuất bản/Ẩn đề thi
     */
    publishTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { is_published } = req.body;
            const result = await this.testService.publishTest(id, is_published);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * DELETE /api/admin/tests/:id - Xóa đề thi
     */
    deleteTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const result = await this.testService.deleteTest(id);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/admin/tests/:testId/questions - Tạo câu hỏi mới
     */
    createQuestion = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { testId } = req.params;
            const result = await this.testService.createQuestion(testId, req.body);
            res.status(201).json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/admin/tests/:testId/questions/:questionId - Cập nhật câu hỏi
     */
    updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { questionId } = req.params;
            const result = await this.testService.updateQuestion(questionId, req.body);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/admin/tests/upload-media - Upload audio/image file to S3
     */
    uploadMedia = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                return res.status(400).json(ResponseFormat.errorResponse(
                    "No file uploaded", 
                    400, 
                    "FILE_REQUIRED"
                ));
            }

            const type = req.body.type as 'audio' | 'image';
            if (!type || !['audio', 'image'].includes(type)) {
                return res.status(400).json(ResponseFormat.errorResponse(
                    "Invalid type. Must be 'audio' or 'image'", 
                    400, 
                    "INVALID_TYPE"
                ));
            }

            const result = await this.testService.uploadMedia(req.file, type);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };
}

export default AdminTestController;
