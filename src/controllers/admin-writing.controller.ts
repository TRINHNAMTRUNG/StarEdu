import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import AdminWritingService from "../services/admin-writing.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class AdminWritingController {
    constructor(private readonly adminWritingService: AdminWritingService) { }

    createPrompt = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) throw new Error("Unauthenticated");
        const dto = req.body;
        const file = req.file;
        const result = await this.adminWritingService.createPrompt(dto, req.user.id, file);
        return res.status(201).json(ResponseFormat.successResponse(result, "Tạo đề writing thành công", 201, req.requestId));
    });

    updatePrompt = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const dto = req.body;
        const file = req.file;
        const result = await this.adminWritingService.updatePrompt(id, dto, file);
        return res.status(200).json(ResponseFormat.successResponse(result, "Cập nhật đề thành công", 200, req.requestId));
    });

    deletePrompt = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.adminWritingService.deletePrompt(id);
        return res.status(200).json(ResponseFormat.successResponse(result, "Xóa đề thành công", 200, req.requestId));
    });

    getAllPrompts = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.adminWritingService.getAllPrompts();
        return res.status(200).json(ResponseFormat.successResponse(result, "Lấy danh sách đề thành công", 200, req.requestId));
    });
}

export default AdminWritingController;
