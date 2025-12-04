import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import EnrollmentService from "../services/enrollment.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    GetEnrollmentDetailResDto,
    GetEnrollmentListResDto
} from "../dtos/response/enrollment.response.dto";
import ResponseFormat from "../utils/ResponseFormat";
import AppError from "../utils/AppError";

@injectable()
class EnrollmentController {
    constructor(private readonly enrollmentService: EnrollmentService) {}

    /**
     * GET /student/enrollments
     */
    getEnrollmentList = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const { page = 1, limit = 10 } = req.query;
        const result = await this.enrollmentService.getEnrollmentList(
            req.user.id,
            Number(page),
            Number(limit)
        );

        const response = instanceToPlain(
            plainToInstance(GetEnrollmentListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách enrollments thành công", 200, req.requestId)
        );
    });

    /**
     * GET /student/enrollments/:id
     */
    getEnrollmentById = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const { id } = req.params;
        const result = await this.enrollmentService.getEnrollmentById(id, req.user.id);

        const response = instanceToPlain(
            plainToInstance(GetEnrollmentDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết enrollment thành công", 200, req.requestId)
        );
    });

    /**
     * GET /student/enrollments/:id/courses
     * Lấy danh sách courses với completion percentage
     */
    getEnrollmentCourses = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const { id } = req.params;
        const result = await this.enrollmentService.getEnrollmentCoursesWithProgress(id, req.user.id);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Lấy danh sách courses thành công", 200, req.requestId)
        );
    });
}

export default EnrollmentController;
