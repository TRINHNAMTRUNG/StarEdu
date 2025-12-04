import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreateCourseResDto, GetCourseListResDto, GetCourseDetailResDto,
    UpdateCourseResDto, DeleteCourseResDto, PublishCourseResDto,
    AssignTeachersResDto, CourseStatisticsResDto, GetCourseFullResDto,
    ToggleFreeCoursesResDto, RestoreCourseResDto, PermanentDeleteCourseResDto,
    CloneCourseResDto, ReorderLessonsResDto, BulkDeleteCoursesResDto,
    GetAvailableCoursesForRoadmapResDto
} from "../dtos/response/course.response.dto";
import {
    CreateCourseReqDto, UpdateCourseReqDto, AssignTeachersReqDto
} from "../dtos/request/course.request.dto";
import ResponseFormat from "../utils/ResponseFormat";
import CourseService from "../services/course.service";

@injectable()
class CourseController {
    constructor(private readonly courseService: CourseService) { }

    // POST /admin/courses - Tạo course mới và gắn vào roadmap
    createCourse = asyncHandler(async (req: Request, res: Response) => {
        const dto: CreateCourseReqDto = req.body;
        const thumbnailFile = req.file as Express.Multer.File | undefined;

        const result = await this.courseService.createCourse(dto, thumbnailFile);

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

    // API #3.1: GET /admin/courses/:id/lessons
    getCourseLessons = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const lessons = await this.courseService.getCourseLessons(id);

        return res.status(200).json(
            ResponseFormat.successResponse(lessons, "Lấy danh sách bài học thành công", 200, req.requestId)
        );
    });

    // API #4: PATCH /admin/courses/:id
    updateCourse = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto: UpdateCourseReqDto = req.body;
        const thumbnailFile = req.file as Express.Multer.File | undefined;
        const removeThumbnail = req.body.removeThumbnail === "true";

        const result = await this.courseService.updateCourse(id, dto, thumbnailFile, removeThumbnail);

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

    // PATCH /admin/courses/free (batch toggle free)
    toggleFreeCourses = asyncHandler(async (req: Request, res: Response) => {
        const { course_ids, is_free } = req.body;
        const result = await this.courseService.toggleFreeCourses(course_ids, is_free);

        const response = instanceToPlain(
            plainToInstance(ToggleFreeCoursesResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, `Cập nhật free cho ${result.modifiedCount} courses thành công`, 200, req.requestId)
        );
    });

    // GET /admin/courses/:id/full
    getCourseFullStructure = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.courseService.getCourseFullStructure(id);

        const response = instanceToPlain(
            plainToInstance(GetCourseFullResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy course full thành công", 200, req.requestId)
        );
    });

    // PATCH /admin/courses/:id/restore
    restoreCourse = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.courseService.restoreCourse(id);

        const response = instanceToPlain(
            plainToInstance(RestoreCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Khôi phục khóa học thành công", 200, req.requestId)
        );
    });

    // DELETE /admin/courses/:id/permanent
    permanentDeleteCourse = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.courseService.permanentDeleteCourse(id);

        const response = instanceToPlain(
            plainToInstance(PermanentDeleteCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa vĩnh viễn khóa học thành công", 200, req.requestId)
        );
    });

    // POST /admin/courses/:id/clone
    cloneCourse = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { new_title } = req.body;
        const result = await this.courseService.cloneCourse(id, new_title);

        const response = instanceToPlain(
            plainToInstance(CloneCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Nhân bản khóa học thành công", 201, req.requestId)
        );
    });

    // PATCH /admin/courses/:id/reorder-lessons
    reorderLessons = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { lesson_orders } = req.body;
        const result = await this.courseService.reorderLessons(id, lesson_orders);

        const response = instanceToPlain(
            plainToInstance(ReorderLessonsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Sắp xếp lại lessons thành công", 200, req.requestId)
        );
    });

    // DELETE /admin/courses/bulk
    bulkDeleteCourses = asyncHandler(async (req: Request, res: Response) => {
        const { course_ids } = req.body;
        const result = await this.courseService.bulkDeleteCourses(course_ids);

        const response = instanceToPlain(
            plainToInstance(BulkDeleteCoursesResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa hàng loạt khóa học thành công", 200, req.requestId)
        );
    });

    // GET /admin/courses/available-for-roadmap/:roadmapId
    // Lấy courses KHÔNG tồn tại trong roadmap hiện tại (để admin chọn thêm vào)
    getAvailableCoursesForRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { roadmapId } = req.params;
        const { page = 1, limit = 20, search } = req.query;

        const result = await this.courseService.getAvailableCoursesForRoadmap(
            roadmapId,
            Number(page),
            Number(limit),
            search as string | undefined
        );

        const response = instanceToPlain(
            plainToInstance(GetAvailableCoursesForRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy courses khả dụng cho roadmap thành công", 200, req.requestId)
        );
    });

    // PATCH /admin/lessons/:id/reorder-sections
    reorderSectionsInLesson = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { section_orders } = req.body;
        
        const result = await this.courseService.reorderSectionsInLesson(id, section_orders);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Đã cập nhật thứ tự sections", 200, req.requestId)
        );
    });

}

export default CourseController;
