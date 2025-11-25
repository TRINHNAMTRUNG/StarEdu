// import { Request, Response } from "express";
// import { injectable } from "tsyringe";
// import { asyncHandler } from "../middlewares/handleErorr.middleware";
// import TeacherCourseService from "../services/teacher-course.service";
// import { plainToInstance, instanceToPlain } from "class-transformer";
// import {
//     GetTeacherCourseListResDto,
//     GetTeacherCourseDetailResDto,
//     UpdateTeacherCourseResDto,
//     GetTeacherCourseLessonsResDto,
//     TeacherCourseStatisticsResDto,
//     GetTeacherDashboardResDto
// } from "../dtos/response/teacher-course.response.dto";
// import { UpdateCourseReqDto } from "../dtos/request/course.request.dto";
// import ResponseFormat from "../utils/ResponseFormat";
// import AppError from "../utils/AppError";

// @injectable()
// class TeacherCourseController {
//     constructor(private readonly teacherCourseService: TeacherCourseService) {}

//     // API #1: GET /teacher/courses
//     getCourses = asyncHandler(async (req: Request, res: Response) => {
//         if (!req.user) {
//             throw AppError.unauthorizedError("Chưa xác thực");
//         }

//         const { page = 1, limit = 10, ...filters } = req.query;
//         const result = await this.teacherCourseService.getAssignedCourses(
//             req.user.id,
//             Number(page),
//             Number(limit),
//             filters
//         );

//         const response = instanceToPlain(
//             plainToInstance(GetTeacherCourseListResDto, result, { excludeExtraneousValues: true })
//         );

//         return res.status(200).json(
//             ResponseFormat.successResponse(response, "Lấy danh sách khóa học thành công", 200, req.requestId)
//         );
//     });

//     // API #2: GET /teacher/courses/:id
//     getCourseById = asyncHandler(async (req: Request, res: Response) => {
//         if (!req.user) {
//             throw AppError.unauthorizedError("Chưa xác thực");
//         }

//         const { id } = req.params;
//         const result = await this.teacherCourseService.getCourseById(id, req.user.id);

//         const response = instanceToPlain(
//             plainToInstance(GetTeacherCourseDetailResDto, result, { excludeExtraneousValues: true })
//         );

//         return res.status(200).json(
//             ResponseFormat.successResponse(response, "Lấy chi tiết khóa học thành công", 200, req.requestId)
//         );
//     });

//     // API #3: PATCH /teacher/courses/:id
//     updateCourse = asyncHandler(async (req: Request, res: Response) => {
//         if (!req.user) {
//             throw AppError.unauthorizedError("Chưa xác thực");
//         }

//         const { id } = req.params;
//         const dto: UpdateCourseReqDto = req.body;
//         const result = await this.teacherCourseService.updateCourse(id, req.user.id, dto);

//         const response = instanceToPlain(
//             plainToInstance(UpdateTeacherCourseResDto, result, { excludeExtraneousValues: true })
//         );

//         return res.status(200).json(
//             ResponseFormat.successResponse(response, "Cập nhật khóa học thành công", 200, req.requestId)
//         );
//     });

//     // API #4: GET /teacher/courses/:id/lessons
//     getCourseLessons = asyncHandler(async (req: Request, res: Response) => {
//         if (!req.user) {
//             throw AppError.unauthorizedError("Chưa xác thực");
//         }

//         const { id } = req.params;
//         const result = await this.teacherCourseService.getCourseLessons(id, req.user.id);

//         const response = instanceToPlain(
//             plainToInstance(GetTeacherCourseLessonsResDto, { data: result }, { excludeExtraneousValues: true })
//         );

//         return res.status(200).json(
//             ResponseFormat.successResponse(response, "Lấy danh sách bài học thành công", 200, req.requestId)
//         );
//     });

//     // API #5: GET /teacher/courses/:id/statistics
//     getCourseStatistics = asyncHandler(async (req: Request, res: Response) => {
//         if (!req.user) {
//             throw AppError.unauthorizedError("Chưa xác thực");
//         }

//         const { id } = req.params;
//         const result = await this.teacherCourseService.getCourseStatistics(id, req.user.id);

//         const response = instanceToPlain(
//             plainToInstance(TeacherCourseStatisticsResDto, result, { excludeExtraneousValues: true })
//         );

//         return res.status(200).json(
//             ResponseFormat.successResponse(response, "Lấy thống kê khóa học thành công", 200, req.requestId)
//         );
//     });

//     // API #6: GET /teacher/dashboard/courses
//     getDashboard = asyncHandler(async (req: Request, res: Response) => {
//         if (!req.user) {
//             throw AppError.unauthorizedError("Chưa xác thực");
//         }

//         const result = await this.teacherCourseService.getDashboard(req.user.id);

//         const response = instanceToPlain(
//             plainToInstance(GetTeacherDashboardResDto, result, { excludeExtraneousValues: true })
//         );

//         return res.status(200).json(
//             ResponseFormat.successResponse(response, "Lấy dashboard thành công", 200, req.requestId)
//         );
//     });
// }

// export default TeacherCourseController;
