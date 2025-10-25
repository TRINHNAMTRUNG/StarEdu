import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import DictationService from "../services/dictation.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreateDictationResDto,
    GetDictationListResDto,
    DictationDetailResDto
} from "../dtos/response/dictation.response.dto";
import { CreateDictationReqDto } from "../dtos/request/dictation.request.dto";
import ResponseFormat from "../utils/ResponseFormat";
import { DeleteDictationsReqDto } from "../dtos/request/dictation.request.dto";
import { DeleteDictationsResDto } from "../dtos/response/dictation.response.dto";

@injectable()
class DictationController {
    constructor(private readonly dictationService: DictationService) {}

    // Admin: POST /admin/dictations
    createDictation = asyncHandler(async (req: Request, res: Response) => {
        const { title, youtubeVideoId } = req.body as CreateDictationReqDto;
        const result = await this.dictationService.createAndSaveLesson(youtubeVideoId, title);

        const response = instanceToPlain(
            plainToInstance(CreateDictationResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo bài học dictation thành công", 201, req.requestId)
        );
    });

    // Admin: GET /admin/dictations
    getAllDictations = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.dictationService.getAllDictations();

        const response = instanceToPlain(
            plainToInstance(GetDictationListResDto, { total: result.length, data: result }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách dictation thành công", 200, req.requestId)
        );
    });

    // Admin: GET /admin/dictations/:id
    getDictationById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.dictationService.findLessonById(id);

        const response = instanceToPlain(
            plainToInstance(DictationDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết dictation thành công", 200, req.requestId)
        );
    });

    /**
     * DELETE /admin/dictations
     */
    deleteDictations = asyncHandler(async (req: Request, res: Response) => {
        const dto: DeleteDictationsReqDto = req.body;
        const result = await this.dictationService.deleteDictations(dto.lessonIds);

        const response = instanceToPlain(
            plainToInstance(DeleteDictationsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa bài học dictation thành công", 200, req.requestId)
        );
    });
}

export default DictationController;
