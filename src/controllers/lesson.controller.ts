import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import LessonService from "../services/lesson.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreateLessonResDto,
    GetLessonListResDto,
    GetLessonDetailResDto,
    UpdateLessonResDto,
    DeleteLessonResDto
} from "../dtos/response/lesson.response.dto";
import { CreateLessonReqDto, UpdateLessonReqDto } from "../dtos/request/lesson.request.dto";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class LessonController {
    constructor(private readonly lessonService: LessonService) {}

    // API #1: POST /admin/lessons
    createLesson = asyncHandler(async (req: Request, res: Response) => {
        const dto: CreateLessonReqDto = req.body;
        const result = await this.lessonService.createLesson(dto);

        const response = instanceToPlain(
            plainToInstance(CreateLessonResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo bài học thành công", 201, req.requestId)
        );
    });

    // API #2: GET /admin/lessons
    getLessonList = asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await this.lessonService.getLessonList(Number(page), Number(limit), filters);

        const response = instanceToPlain(
            plainToInstance(GetLessonListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách bài học thành công", 200, req.requestId)
        );
    });

    // API #3: GET /admin/lessons/:id
    getLessonById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.lessonService.getLessonById(id);

        const response = instanceToPlain(
            plainToInstance(GetLessonDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết bài học thành công", 200, req.requestId)
        );
    });

    // API #3.1: GET /admin/lessons/:id/sections
    getLessonSections = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const sections = await this.lessonService.getLessonSections(id);

        return res.status(200).json(
            ResponseFormat.successResponse(sections, "Lấy danh sách sections thành công", 200, req.requestId)
        );
    });

    // API #4: PATCH /admin/lessons/:id
    updateLesson = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto: UpdateLessonReqDto = req.body;
        const result = await this.lessonService.updateLesson(id, dto);

        const response = instanceToPlain(
            plainToInstance(UpdateLessonResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật bài học thành công", 200, req.requestId)
        );
    });

    // API #5: DELETE /admin/lessons/:id
    deleteLesson = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.lessonService.deleteLesson(id);

        const response = instanceToPlain(
            plainToInstance(DeleteLessonResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa bài học thành công", 200, req.requestId)
        );
    });
}

export default LessonController;
