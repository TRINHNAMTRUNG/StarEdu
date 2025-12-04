import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import { plainToInstance, instanceToPlain } from "class-transformer";
import ResponseFormat from "../utils/ResponseFormat";
import ImageWritingService from "../services/imageWriting.service";
import {
    CreateImageQuestionReqDto,
    GetImageQuestionReqDto,
    UpdateImageQuestionReqDto,
    AnalyzeImageReqDto
} from "../dtos/request/imageWriting.request.dto";
import {
    UploadImageResDto,
    AnalyzeImageResDto,
    CreateImageQuestionResDto,
    GetImageQuestionResDto,
    ListImageQuestionsResDto
} from "../dtos/response/imageWriting.response.dto";

@injectable()
class ImageWritingController {
    constructor(private readonly imageWritingService: ImageWritingService) {}

    /**
     * =========================================
     * ADMIN APIs
     * =========================================
     */

    /**
     * POST /api/admin/writing/upload-image
     * Upload ảnh lên S3
     */
    uploadImage = asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json(
                ResponseFormat.errorResponse(
                    "File ảnh là bắt buộc",
                    400,
                    req.requestId || "unknown"
                )
            );
        }

        const result = await this.imageWritingService.uploadImage(req.file);

        const response = instanceToPlain(
            plainToInstance(UploadImageResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Upload ảnh thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * POST /api/admin/writing/analyze-image
     * Phân tích ảnh bằng Gemini AI
     */
    analyzeImage = asyncHandler(async (req: Request, res: Response) => {
        const dto: AnalyzeImageReqDto = req.body;

        const result = await this.imageWritingService.analyzeImageWithGemini(dto);

        const response = instanceToPlain(
            plainToInstance(AnalyzeImageResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Phân tích ảnh thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * POST /api/admin/writing/image-questions
     * Tạo đề bài Image Writing mới
     */
    createImageQuestion = asyncHandler(async (req: Request, res: Response) => {
        const dto: CreateImageQuestionReqDto = req.body;
        const adminId = (req.user as any)?._id || (req.user as any)?.id;

        if (!adminId) {
            return res.status(401).json(
                ResponseFormat.errorResponse(
                    "Unauthorized",
                    401,
                    req.requestId || "unknown"
                )
            );
        }

        const result = await this.imageWritingService.createImageQuestion(dto, adminId.toString());

        const response = instanceToPlain(
            plainToInstance(CreateImageQuestionResDto, {
                question_id: (result as any)._id.toString(),
                image_url: result.image_url,
                image_description: result.image_description,
                required_words: result.required_words,
                difficulty: result.difficulty,
                category: result.category,
                hint: result.hint,
                sample_answer: result.sample_answer,
                createdAt: result.createdAt
            }, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(
                response,
                "Tạo đề bài thành công",
                201,
                req.requestId
            )
        );
    });

    /**
     * GET /api/admin/writing/image-questions
     * Lấy danh sách đề bài
     */
    getImageQuestions = asyncHandler(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const difficulty = req.query.difficulty as any;
        const category = req.query.category as any;

        const result = await this.imageWritingService.getImageQuestions(
            page,
            limit,
            difficulty,
            category
        );

        const questions = result.questions.map((q: any) => ({
            question_id: q._id.toString(),
            image_url: q.image_url,
            image_description: q.image_description,
            required_words: q.required_words,
            difficulty: q.difficulty,
            category: q.category,
            hint: q.hint,
            sample_answer: q.sample_answer,
            createdAt: q.createdAt
        }));

        const response = instanceToPlain(
            plainToInstance(ListImageQuestionsResDto, {
                questions,
                total: result.total,
                page: result.page,
                limit: result.limit
            }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Lấy danh sách đề bài thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * PUT /api/admin/writing/image-questions/:id
     * Cập nhật đề bài
     */
    updateImageQuestion = asyncHandler(async (req: Request, res: Response) => {
        const questionId = req.params.id;
        const dto: UpdateImageQuestionReqDto = req.body;

        const result = await this.imageWritingService.updateQuestion(questionId, dto);

        const response = instanceToPlain(
            plainToInstance(CreateImageQuestionResDto, {
                question_id: (result as any)._id.toString(),
                image_url: result.image_url,
                image_description: result.image_description,
                required_words: result.required_words,
                difficulty: result.difficulty,
                category: result.category,
                hint: result.hint,
                sample_answer: result.sample_answer,
                createdAt: result.createdAt
            }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Cập nhật đề bài thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * DELETE /api/admin/writing/image-questions/:id
     * Xóa đề bài (soft delete)
     */
    deleteImageQuestion = asyncHandler(async (req: Request, res: Response) => {
        const questionId = req.params.id;

        await this.imageWritingService.deleteQuestion(questionId);

        return res.status(200).json(
            ResponseFormat.successResponse(
                null,
                "Xóa đề bài thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * =========================================
     * STUDENT APIs
     * =========================================
     */

    /**
     * GET /api/student/writing/image-writing/get-question
     * Lấy đề bài ngẫu nhiên cho học sinh
     */
    getRandomQuestion = asyncHandler(async (req: Request, res: Response) => {
        const dto: GetImageQuestionReqDto = {
            difficulty: req.query.difficulty as any,
            category: req.query.category as any
        };

        const result = await this.imageWritingService.getRandomQuestion(dto);

        const response = instanceToPlain(
            plainToInstance(GetImageQuestionResDto, {
                question_id: (result as any)._id.toString(),
                image_url: result.image_url,
                image_description: result.image_description,
                required_words: result.required_words,
                difficulty: result.difficulty,
                category: result.category,
                hint: result.hint
                // Không trả về sample_answer cho student
            }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Lấy đề bài thành công",
                200,
                req.requestId || "unknown"
            )
        );
    });

    /**
     * GET /api/student/writing/image-writing/get-question/:id
     * Lấy đề bài theo ID (cho trường hợp làm lại bài cũ)
     */
    getQuestionById = asyncHandler(async (req: Request, res: Response) => {
        const questionId = req.params.id;

        const result = await this.imageWritingService.getQuestionById(questionId);

        const response = instanceToPlain(
            plainToInstance(GetImageQuestionResDto, {
                question_id: (result as any)._id.toString(),
                image_url: result.image_url,
                image_description: result.image_description,
                required_words: result.required_words,
                difficulty: result.difficulty,
                category: result.category,
                hint: result.hint
            }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Lấy đề bài thành công",
                200,
                req.requestId || "unknown"
            )
        );
    });
}

export default ImageWritingController;
