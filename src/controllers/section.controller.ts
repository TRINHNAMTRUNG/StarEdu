import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import SectionService from "../services/section.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreateSectionResDto,
    GetSectionListResDto,
    GetSectionDetailResDto,
    UpdateSectionResDto,
    DeleteSectionResDto
} from "../dtos/response/section.response.dto";
import { CreateSectionReqDto, UpdateSectionReqDto } from "../dtos/request/section.request.dto";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class SectionController {
    constructor(private readonly sectionService: SectionService) {}

    createSection = asyncHandler(async (req: Request, res: Response) => {
        const dto: CreateSectionReqDto = req.body;
        const result = await this.sectionService.createSection(dto);

        const response = instanceToPlain(
            plainToInstance(CreateSectionResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo section thành công", 201, req.requestId)
        );
    });

    getSectionList = asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 10, ...filters } = req.query;
        const result = await this.sectionService.getSectionList(Number(page), Number(limit), filters);

        const response = instanceToPlain(
            plainToInstance(GetSectionListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách section thành công", 200, req.requestId)
        );
    });

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

    updateSection = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto: UpdateSectionReqDto = req.body;
        const result = await this.sectionService.updateSection(id, dto);

        const response = instanceToPlain(
            plainToInstance(UpdateSectionResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật section thành công", 200, req.requestId)
        );
    });

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
