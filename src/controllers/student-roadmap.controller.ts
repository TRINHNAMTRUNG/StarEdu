import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import StudentRoadmapService from "../services/student-roadmap.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    GetStudentRoadmapListResDto,
    GetStudentRoadmapDetailResDto
} from "../dtos/response/student-roadmap.response.dto";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class StudentRoadmapController {
    constructor(private readonly studentRoadmapService: StudentRoadmapService) {}

    // API #4: GET /student/roadmaps
    getRoadmaps = asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await this.studentRoadmapService.getPublicRoadmaps(
            Number(page),
            Number(limit),
            filters
        );

        const response = instanceToPlain(
            plainToInstance(GetStudentRoadmapListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách lộ trình thành công", 200, req.requestId)
        );
    });

    // API #5: GET /student/roadmaps/:id
    getRoadmapById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.studentRoadmapService.getRoadmapById(id);

        const response = instanceToPlain(
            plainToInstance(GetStudentRoadmapDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết lộ trình thành công", 200, req.requestId)
        );
    });
}

export default StudentRoadmapController;
