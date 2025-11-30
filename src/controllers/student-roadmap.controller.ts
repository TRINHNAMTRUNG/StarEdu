import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import RoadmapService from "../services/roadmap.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import { GetRoadmapStructureResDto } from "../dtos/response/roadmap.response.dto";
import { StructureContext } from "../dtos/request/roadmap.request.dto";
import ResponseFormat from "../utils/ResponseFormat";
import { GetStudentRoadmapDetailResDto, GetStudentRoadmapListResDto } from "../dtos/response/student-roadmap.response.dto";

@injectable()
class StudentRoadmapController {
    constructor(private readonly roadmapService: RoadmapService) { }

    // API #4: GET /student/roadmaps
    getRoadmaps = asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await this.roadmapService.getPublicRoadmaps(
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
        const result = await this.roadmapService.getRoadmapById(id);

        const response = instanceToPlain(
            plainToInstance(GetStudentRoadmapDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết lộ trình thành công", 200, req.requestId)
        );
    });

    // Add: GET /student/roadmaps/:id/structure
    getRoadmapStructure = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const context = (req.query.context as StructureContext) || StructureContext.PUBLIC;

        const result = await this.roadmapService.getRoadmapStructure(id, context);

        const response = instanceToPlain(
            plainToInstance(GetRoadmapStructureResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy cấu trúc roadmap thành công", 200, req.requestId)
        );
    });
}

export default StudentRoadmapController;
