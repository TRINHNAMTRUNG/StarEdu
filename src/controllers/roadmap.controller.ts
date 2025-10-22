import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import RoadmapService from "../services/roadmap.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreateRoadmapResDto,
    GetRoadmapListResDto,
    GetRoadmapDetailResDto,
    UpdateRoadmapResDto,
    DeleteRoadmapResDto,
    PublishRoadmapResDto,
    AddCoursesResDto,
    RemoveCourseResDto
} from "../dtos/response/roadmap.response.dto";
import {
    CreateRoadmapReqDto,
    UpdateRoadmapReqDto,
    AddCoursesToRoadmapReqDto
} from "../dtos/request/roadmap.request.dto";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class RoadmapController {
    constructor(private readonly roadmapService: RoadmapService) {}

    // API #1: POST /admin/roadmaps
    createRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const dto: CreateRoadmapReqDto = req.body;
        const result = await this.roadmapService.createRoadmap(dto);

        const response = instanceToPlain(
            plainToInstance(CreateRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo lộ trình thành công", 201, req.requestId)
        );
    });

    // API #2: GET /admin/roadmaps
    getRoadmapList = asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await this.roadmapService.getRoadmapList(Number(page), Number(limit), filters);

        const response = instanceToPlain(
            plainToInstance(GetRoadmapListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách lộ trình thành công", 200, req.requestId)
        );
    });

    // API #3: GET /admin/roadmaps/:id
    getRoadmapById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.roadmapService.getRoadmapById(id);

        const response = instanceToPlain(
            plainToInstance(GetRoadmapDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết lộ trình thành công", 200, req.requestId)
        );
    });

    // API #4: PATCH /admin/roadmaps/:id
    updateRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto: UpdateRoadmapReqDto = req.body;
        const result = await this.roadmapService.updateRoadmap(id, dto);

        const response = instanceToPlain(
            plainToInstance(UpdateRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật lộ trình thành công", 200, req.requestId)
        );
    });

    // API #5: DELETE /admin/roadmaps/:id
    deleteRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.roadmapService.deleteRoadmap(id);

        const response = instanceToPlain(
            plainToInstance(DeleteRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa lộ trình thành công", 200, req.requestId)
        );
    });

    // API #6: PATCH /admin/roadmaps/:id/publish
    togglePublishRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.roadmapService.togglePublishRoadmap(id);

        const response = instanceToPlain(
            plainToInstance(PublishRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật trạng thái xuất bản thành công", 200, req.requestId)
        );
    });

    // API #7: POST /admin/roadmaps/:id/courses
    addCourses = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto: AddCoursesToRoadmapReqDto = req.body;
        const result = await this.roadmapService.addCoursesToRoadmap(id, dto);

        const response = instanceToPlain(
            plainToInstance(AddCoursesResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Thêm khóa học vào lộ trình thành công", 200, req.requestId)
        );
    });

    // API #8: DELETE /admin/roadmaps/:id/courses/:courseId
    removeCourse = asyncHandler(async (req: Request, res: Response) => {
        const { id, courseId } = req.params;
        const result = await this.roadmapService.removeCourseFromRoadmap(id, courseId);

        const response = instanceToPlain(
            plainToInstance(RemoveCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa khóa học khỏi lộ trình thành công", 200, req.requestId)
        );
    });
}

export default RoadmapController;
