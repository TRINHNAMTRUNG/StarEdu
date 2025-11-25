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
    DeleteLessonResDto,
    TogglePublishLessonResDto,
    ToggleFreeLessonResDto,
    BulkPublishLessonsResDto,
    GetFreeLessonsResDto,
    BulkToggleFreeLessonsResDto
} from "../dtos/response/lesson.response.dto";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class LessonController {
    constructor(private readonly lessonService: LessonService) {}

    /**
     * API #1: POST /admin/lessons
     */
    createLesson = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.lessonService.createLesson(req.body);

        const response = instanceToPlain(
            plainToInstance(CreateLessonResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo lesson thành công", 201, req.requestId)
        );
    });

    /**
     * API #2: GET /admin/lessons
     */
    getLessonList = asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await this.lessonService.getLessonList(Number(page), Number(limit), filters);

        const response = instanceToPlain(
            plainToInstance(GetLessonListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách lessons thành công", 200, req.requestId)
        );
    });

    /**
     * API #3: GET /admin/lessons/:id
     */
    getLessonById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.lessonService.getLessonById(id);

        const response = instanceToPlain(
            plainToInstance(GetLessonDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết lesson thành công", 200, req.requestId)
        );
    });

    /**
     * API #4: PATCH /admin/lessons/:id
     */
    updateLesson = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.lessonService.updateLesson(id, req.body);

        const response = instanceToPlain(
            plainToInstance(UpdateLessonResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật lesson thành công", 200, req.requestId)
        );
    });

    /**
     * API #5: DELETE /admin/lessons/:id
     */
    deleteLesson = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.lessonService.deleteLesson(id);

        const response = instanceToPlain(
            plainToInstance(DeleteLessonResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa lesson thành công", 200, req.requestId)
        );
    });

    /**
     * PHASE 2 - API #6: PATCH /admin/lessons/courses/:courseId/lessons/:lessonId/publish
     */
    togglePublishLesson = asyncHandler(async (req: Request, res: Response) => {
        const { courseId, lessonId } = req.params;
        const result = await this.lessonService.togglePublishLesson(courseId, lessonId);

        const response = instanceToPlain(
            plainToInstance(TogglePublishLessonResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật publish lesson thành công", 200, req.requestId)
        );
    });

    /**
     * PHASE 2 - API #7: PATCH /admin/lessons/courses/:courseId/lessons/bulk-publish
     */
    bulkPublishLessons = asyncHandler(async (req: Request, res: Response) => {
        const { courseId } = req.params;
        const { lessonIds, is_published } = req.body;

        const result = await this.lessonService.bulkPublishLessons(courseId, lessonIds, is_published);

        const response = instanceToPlain(
            plainToInstance(BulkPublishLessonsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Bulk publish thành công", 200, req.requestId)
        );
    });

    /**
     * PHASE 2 - API #8: PATCH /admin/lessons/courses/:courseId/lessons/:lessonId/free
     */
    toggleFreeLesson = asyncHandler(async (req: Request, res: Response) => {
        const { courseId, lessonId } = req.params;
        const { is_free } = req.body;

        const result = await this.lessonService.toggleFreeLesson(courseId, lessonId, is_free);

        const response = instanceToPlain(
            plainToInstance(ToggleFreeLessonResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật free lesson thành công", 200, req.requestId)
        );
    });

    /**
     * PHASE 2 - API #9: GET /admin/lessons/courses/:id/free-lessons
     */
    getFreeLessons = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.lessonService.getFreeLessons(id);

        const response = instanceToPlain(
            plainToInstance(GetFreeLessonsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy free lessons thành công", 200, req.requestId)
        );
    });

    /**
     * API MỚI: PATCH /admin/lessons/courses/:courseId/lessons/bulk-free
     */
    bulkToggleFreeLessons = asyncHandler(async (req: Request, res: Response) => {
        const { courseId } = req.params;
        const { lessonIds, is_free } = req.body;

        const result = await this.lessonService.bulkToggleFreeLessons(courseId, lessonIds, is_free);

        const response = instanceToPlain(
            plainToInstance(BulkToggleFreeLessonsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Bulk toggle free lessons thành công", 200, req.requestId)
        );
    });
}

export default LessonController;
