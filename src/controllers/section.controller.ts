import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import SectionService from "../services/section.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreateSectionResDto,
    GetSectionDetailResDto,
    UpdateSectionResDto,
    DeleteSectionResDto
} from "../dtos/response/section.response.dto";
import ResponseFormat from "../utils/ResponseFormat";
import { CreateSectionReqDto, UpdateSectionReqDto } from "../dtos/request/section.request.dto";

@injectable()
class SectionController {
    constructor(private readonly sectionService: SectionService) { }

    /**
     * POST /admin/sections (with file upload)
     */
    createSection = asyncHandler(async (req: Request, res: Response) => {
        const { lesson_id, title, order, description, test_id } = req.body;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const dto: CreateSectionReqDto = {
            lesson_id,
            title,
            order: Number(order),
            description,
            test_id
        };

        const fileObjs = {
            video: files?.video?.[0],
            mindmap: files?.mindmap?.[0]
        };

        const result = await this.sectionService.createSection(dto, fileObjs);

        const response = instanceToPlain(
            plainToInstance(CreateSectionResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo section thành công", 201, req.requestId)
        );
    });

    /**
     * GET /admin/sections/:id
     */
    getSectionById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.sectionService.getSectionById(id);

        const response = instanceToPlain(
            plainToInstance(GetSectionDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết section thành công", 200, req.requestId)
        );
    });

    /**
     * PATCH /admin/sections/:id (with file upload)
     */
    updateSection = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { title, order, description, removeVideo, removeMindmap } = req.body;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const dto: UpdateSectionReqDto = {
            title,
            order: order ? Number(order) : undefined,
            description,
            removeVideo: removeVideo === "true",
            removeMindmap: removeMindmap === "true"
        };

        const fileObjs = {
            video: files?.video?.[0],
            mindmap: files?.mindmap?.[0]
        };

        const result = await this.sectionService.updateSection(id, dto, fileObjs);

        const response = instanceToPlain(
            plainToInstance(UpdateSectionResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật section thành công", 200, req.requestId)
        );
    });

    /**
     * DELETE /admin/sections/:id
     */
    deleteSection = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.sectionService.deleteSection(id);

        const response = instanceToPlain(
            plainToInstance(DeleteSectionResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa section thành công", 200, req.requestId)
        );
    });
}

export default SectionController;
