import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import StudentVocabularyService from "../services/student-vocabulary.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    GetStudentVocabularySetsResDto,
    GetStudentVocabularySetDetailResDto
} from "../dtos/response/student-vocabulary.response.dto";
import { GenerateVocabularySetDto } from "../dtos/request/vocabulary.request.dto";
import ResponseFormat from "../utils/ResponseFormat";
import AppError from "../utils/AppError";

@injectable()
class StudentVocabularyController {
    constructor(private readonly studentVocabularyService: StudentVocabularyService) { }

    // GET /student/vocabulary/sets - Lấy tất cả bộ từ vựng
    getVocabularySets = asyncHandler(async (req: Request, res: Response) => {
        const studentId = req.user?.id;
        const { part_of_speech } = req.query;

        if (!studentId) {
            throw AppError.unauthorizedError("Vui lòng đăng nhập");
        }

        if (!part_of_speech) {
            throw AppError.badRequestError("part_of_speech là bắt buộc");
        }

        // Truyền part_of_speech vào service để lọc
        const result = await this.studentVocabularyService.getAllVocabularySets(
            studentId,
            part_of_speech as string
        );

        const response = instanceToPlain(
            plainToInstance(GetStudentVocabularySetsResDto, { total: result.length, data: result }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách bộ từ vựng thành công", 200, req.requestId)
        );
    });

    // GET /student/vocabulary/sets/:setId (Public hoac Private)
    getVocabularySetById = asyncHandler(async (req: Request, res: Response) => {
        const studentId = req.user?.id; // Optional
        const { setId } = req.params;
        console.log("studentId:", studentId);
        const result = await this.studentVocabularyService.getVocabularySetById(setId, studentId);

        const response = instanceToPlain(
            plainToInstance(GetStudentVocabularySetDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết bộ từ vựng thành công", 200, req.requestId)
        );
    });

    /**
     * POST /student/vocabulary/generate - Tạo set từ vựng bằng AI
     */
    generateVocabularySet = asyncHandler(async (req: Request<{}, {}, GenerateVocabularySetDto>, res: Response) => {
        const studentId = req.user?.id;
        
        if (!studentId) {
            throw AppError.unauthorizedError("Vui lòng đăng nhập");
        }

        const { topic, count } = req.body;

        const result = await this.studentVocabularyService.generateVocabularySetByTopic(
            studentId,
            topic,
            count || 15
        );

        return res.status(201).json(
            ResponseFormat.successResponse(result, "Đã tạo set từ vựng thành công", 201, req.requestId)
        );
    });

    /**
     * GET /student/vocabulary/my-sets - Lấy tất cả set từ vựng cá nhân
     */
    getMyCustomSets = asyncHandler(async (req: Request, res: Response) => {
        const studentId = req.user?.id;
        
        if (!studentId) {
            throw AppError.unauthorizedError("Vui lòng đăng nhập");
        }

        const sets = await this.studentVocabularyService.getMyCustomVocabularySets(studentId);

        return res.status(200).json(
            ResponseFormat.successResponse({ total: sets.length, data: sets }, "Lấy danh sách set từ vựng cá nhân thành công", 200, req.requestId)
        );
    });

    /**
     * GET /student/vocabulary/my-sets/:setId - Lấy chi tiết set từ vựng cá nhân
     */
    getMyCustomSetById = asyncHandler(async (req: Request, res: Response) => {
        const studentId = req.user?.id;
        const { setId } = req.params;

        if (!studentId) {
            throw AppError.unauthorizedError("Vui lòng đăng nhập");
        }

        const set = await this.studentVocabularyService.getMyCustomVocabularySetById(studentId, setId);

        return res.status(200).json(
            ResponseFormat.successResponse(set, "Lấy chi tiết set từ vựng thành công", 200, req.requestId)
        );
    });

    /**
     * DELETE /student/vocabulary/my-sets/:setId - Xóa set từ vựng cá nhân
     */
    deleteMyCustomSet = asyncHandler(async (req: Request, res: Response) => {
        const studentId = req.user?.id;
        const { setId } = req.params;

        if (!studentId) {
            throw AppError.unauthorizedError("Vui lòng đăng nhập");
        }

        const result = await this.studentVocabularyService.deleteMyCustomVocabularySet(studentId, setId);

        return res.status(200).json(
            ResponseFormat.successResponse(null, result.message, 200, req.requestId)
        );
    });
}

export default StudentVocabularyController;
