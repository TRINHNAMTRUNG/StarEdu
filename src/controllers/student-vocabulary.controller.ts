import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import StudentVocabularyService from "../services/student-vocabulary.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    GetStudentVocabularySetsResDto,
    GetStudentVocabularySetDetailResDto
} from "../dtos/response/student-vocabulary.response.dto";
import ResponseFormat from "../utils/ResponseFormat";
import AppError from "../utils/AppError";

@injectable()
class StudentVocabularyController {
    constructor(private readonly studentVocabularyService: StudentVocabularyService) { }

    // GET /student/vocabulary/sets - Lấy tất cả bộ từ vựng
    getVocabularySets = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const result = await this.studentVocabularyService.getAllVocabularySets(req.user.id);

        const response = instanceToPlain(
            plainToInstance(GetStudentVocabularySetsResDto, { total: result.length, data: result }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách bộ từ vựng thành công", 200, req.requestId)
        );
    });

    // GET /student/vocabulary/sets/:setId
    getVocabularySetById = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const { setId } = req.params;
        const result = await this.studentVocabularyService.getVocabularySetById(req.user.id, setId);

        const response = instanceToPlain(
            plainToInstance(GetStudentVocabularySetDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết bộ từ vựng thành công", 200, req.requestId)
        );
    });
}

export default StudentVocabularyController;
