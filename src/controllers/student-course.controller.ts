import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import StudentCourseService from "../services/student-course.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    GetStudentCourseListResDto,
    GetStudentCourseDetailResDto,
    GetStudentEnrolledCoursesResDto
} from "../dtos/response/student-course.response.dto";
import ResponseFormat from "../utils/ResponseFormat";
import AppError from "../utils/AppError";

@injectable()
class StudentCourseController {
    constructor(private readonly studentCourseService: StudentCourseService) {}

    // API #1: GET /student/courses
    getCourses = asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await this.studentCourseService.getPublicCourses(
            Number(page),
            Number(limit),
            filters
        );

        const response = instanceToPlain(
            plainToInstance(GetStudentCourseListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách khóa học thành công", 200, req.requestId)
        );
    });

    // API #2: GET /student/courses/:id
    getCourseById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.studentCourseService.getCourseById(id);

        const response = instanceToPlain(
            plainToInstance(GetStudentCourseDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết khóa học thành công", 200, req.requestId)
        );
    });

    // API #3: GET /student/courses/enrolled
    getEnrolledCourses = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const result = await this.studentCourseService.getEnrolledCourses(req.user.id);

        const response = instanceToPlain(
            plainToInstance(GetStudentEnrolledCoursesResDto, { data: result }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách khóa học đã đăng ký thành công", 200, req.requestId)
        );
    });

    // API #4: GET /student/courses/:id/lessons
    getCourseLessons = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const studentId = req.user?.id; // Optional - neu co thi check enrollment

        const result = await this.studentCourseService.getCourseLessonsWithSections(id, studentId);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Lấy danh sách bài học thành công", 200, req.requestId)
        );
    });
}

export default StudentCourseController;
