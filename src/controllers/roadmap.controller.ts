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
    RemoveCourseResDto,
    GetRoadmapStructureResDto,
    GetPublishPreviewResDto,
    SmartPublishRoadmapResDto,
    ToggleFreeRoadmapResDto
} from "../dtos/response/roadmap.response.dto";
import { StructureContext } from "../dtos/request/roadmap.request.dto";
import ResponseFormat from "../utils/ResponseFormat";
import { CreateCourseReqDto } from "../dtos/request/course.request.dto";
import { CreateCourseResDto } from "../dtos/response/course.response.dto";

@injectable()
class RoadmapController {
    constructor(private readonly roadmapService: RoadmapService) { }

    createRoadmap = asyncHandler(async (req: Request, res: Response) => {
        // Truyền file (nếu có) xuống service
        const result = await this.roadmapService.createRoadmap(req.body, req.file as Express.Multer.File | undefined);

        const response = instanceToPlain(
            plainToInstance(CreateRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo lộ trình thành công", 201, req.requestId)
        );
    });

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

    updateRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        // removeThumbnail có thể được gửi từ form (string) hoặc boolean
        const removeThumbnailRaw = (req.body && req.body.removeThumbnail) ?? (req.body && req.body.remove_thumbnail);
        const removeThumbnail = removeThumbnailRaw === true || removeThumbnailRaw === "true";

        const result = await this.roadmapService.updateRoadmap(
            id,
            req.body,
            req.file as Express.Multer.File | undefined,
            removeThumbnail
        );

        const response = instanceToPlain(
            plainToInstance(UpdateRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật lộ trình thành công", 200, req.requestId)
        );
    });

    deleteRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.roadmapService.deleteRoadmap(id);

        const response = instanceToPlain(
            plainToInstance(DeleteRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa roadmap thành công", 200, req.requestId)
        );
    });

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

    addCoursesToRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.roadmapService.addCoursesToRoadmap(id, req.body);

        const response = instanceToPlain(
            plainToInstance(AddCoursesResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Thêm courses vào roadmap thành công", 200, req.requestId)
        );
    });

    removeCourseFromRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id, courseId } = req.params;
        const result = await this.roadmapService.removeCourseFromRoadmap(id, courseId);

        const response = instanceToPlain(
            plainToInstance(RemoveCourseResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa course khỏi roadmap thành công", 200, req.requestId)
        );
    });

    /**
     * PHASE 1: GET ROADMAP STRUCTURE
     */
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

    /**
     * PHASE 1: GET PUBLISH PREVIEW
     */
    getPublishPreview = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const result = await this.roadmapService.getPublishPreview(id);

        const response = instanceToPlain(
            plainToInstance(GetPublishPreviewResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy preview thành công", 200, req.requestId)
        );
    });

    /**
     * PHASE 3 - API #8: SMART PUBLISH ROADMAP
     */
    smartPublishRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { mode, freeLessonsPerCourse } = req.body;

        const result = await this.roadmapService.smartPublishRoadmap(id, mode, freeLessonsPerCourse);

        const response = instanceToPlain(
            plainToInstance(SmartPublishRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Smart publish thành công", 200, req.requestId)
        );
    });

    /**
     * PHASE 3 - API #9: TOGGLE FREE ROADMAP
     */
    toggleFreeRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { is_free } = req.body;

        const result = await this.roadmapService.toggleFreeRoadmap(id, is_free);

        const response = instanceToPlain(
            plainToInstance(ToggleFreeRoadmapResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật free roadmap thành công", 200, req.requestId)
        );
    });

    /**
     * REORDER COURSES IN ROADMAP
     */
    reorderCoursesInRoadmap = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { course_orders } = req.body;

        const result = await this.roadmapService.reorderCoursesInRoadmap(id, course_orders);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Đã cập nhật thứ tự courses", 200, req.requestId)
        );
    });
}

export default RoadmapController;
