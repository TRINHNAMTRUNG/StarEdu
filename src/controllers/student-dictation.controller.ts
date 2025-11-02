import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import DictationService from "../services/dictation.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    GetStudentDictationListResDto,
    DictationDetailResDto
} from "../dtos/response/dictation.response.dto";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class StudentDictationController {
    constructor(private readonly dictationService: DictationService) {}

    // Student: GET /student/dictations
    getDictations = asyncHandler(async (req: Request, res: Response) => {
        const studentId = req.user?.id; // Optional auth
        const result = await this.dictationService.getDictationsForStudent(studentId);

        const response = instanceToPlain(
            plainToInstance(GetStudentDictationListResDto, { total: result.length, data: result }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách dictation thành công", 200, req.requestId)
        );
    });

    // Student: GET /student/dictations/:id
    getDictationById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const studentId = req.user?.id; // Optional auth
        const result = await this.dictationService.getDictationByIdForStudent(id, studentId);

        const response = instanceToPlain(
            plainToInstance(DictationDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết dictation thành công", 200, req.requestId)
        );
    });
}

export default StudentDictationController;
