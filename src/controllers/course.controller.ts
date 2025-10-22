import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import CourseService from "../services/course.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreateCourseResDto,
    GetCourseListResDto,
    GetCourseDetailResDto,
    UpdateCourseResDto,
    DeleteCourseResDto,
    PublishCourseResDto,
    AssignTeachersResDto,
    CourseStatisticsResDto,
    ToggleModifiableResDto
} from "../dtos/response/course.response.dto";
import {
    CreateCourseReqDto,
    UpdateCourseReqDto,
    AssignTeachersReqDto,
    ToggleModifiableReqDto
} from "../dtos/request/course.request.dto";
import ResponseFormat from "../utils/ResponseFormat";
import AppError from "../utils/AppError";

@injectable()
class CourseController {
    constructor(private readonly courseService: CourseService) {}

    // API #1: POST /admin/courses
    createCourse = asyncHandler(async (req: Request, res: Response) => {
        const dto: CreateCourseReqDto = req.body;
        const result = await this.courseService.createCourse(dto);

        const response = instanceToPlain(
            plainToInstance(CreateCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo khóa học thành công", 201, req.requestId)
        );
    });

    // API #2: GET /admin/courses
    getCourseList = asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await this.courseService.getCourseList(Number(page), Number(limit), filters);

        const response = instanceToPlain(
            plainToInstance(GetCourseListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách khóa học thành công", 200, req.requestId)
        );
    });

    // API #3: GET /admin/courses/:id
    getCourseById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.courseService.getCourseById(id);

        const response = instanceToPlain(
            plainToInstance(GetCourseDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết khóa học thành công", 200, req.requestId)
        );
    });

    // API #4: PATCH /admin/courses/:id
    updateCourse = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto: UpdateCourseReqDto = req.body;
        const result = await this.courseService.updateCourse(id, dto);

        const response = instanceToPlain(
            plainToInstance(UpdateCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật khóa học thành công", 200, req.requestId)
        );
    });

    // API #5: DELETE /admin/courses/:id
    deleteCourse = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.courseService.deleteCourse(id);

        const response = instanceToPlain(
            plainToInstance(DeleteCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa khóa học thành công", 200, req.requestId)
        );
    });

    // API #6: PATCH /admin/courses/:id/publish
    togglePublishCourse = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.courseService.togglePublishCourse(id);

        const response = instanceToPlain(
            plainToInstance(PublishCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật trạng thái xuất bản thành công", 200, req.requestId)
        );
    });

    // API #7: PATCH /admin/courses/:id/teachers
    assignTeachers = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto: AssignTeachersReqDto = req.body;
        const result = await this.courseService.assignTeachersToCourse(id, dto);

        const response = instanceToPlain(
            plainToInstance(AssignTeachersResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Gán giáo viên thành công", 200, req.requestId)
        );
    });

    // API #8: GET /admin/courses/:id/statistics
    getCourseStatistics = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.courseService.getCourseStatistics(id);

        const response = instanceToPlain(
            plainToInstance(CourseStatisticsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy thống kê khóa học thành công", 200, req.requestId)
        );
    });

    // API #9: PATCH /admin/courses/:id/modifiable
    toggleModifiable = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto: ToggleModifiableReqDto = req.body;

        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const result = await this.courseService.toggleModifiable(id, dto, req.user.id);

        const response = instanceToPlain(
            plainToInstance(ToggleModifiableResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật trạng thái sửa đổi thành công", 200, req.requestId)
        );
    });
}

export default CourseController;
