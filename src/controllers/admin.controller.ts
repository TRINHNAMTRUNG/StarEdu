import { injectable } from "tsyringe";
import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import ResponseFormat from "../utils/ResponseFormat";
import { instanceToPlain, plainToInstance } from "class-transformer";
import AdminService from "../services/admin.service";
import { CreateTeacherReqDto } from "../dtos/request/Teacher.request.dto";


@injectable()
export class AdminController {
    constructor(
        private adminService: AdminService
    ) { }

    // Get all users with filters
    getAllUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { role, status, search, page = 1, limit = 20 } = req.query;

        const result = await this.adminService.getAllUsers({
            role: role as string,
            status: status as string,
            search: search as string,
            page: Number(page),
            limit: Number(limit)
        });

        res.status(200).json(
            ResponseFormat.successResponse(result, "Lấy danh sách người dùng thành công")
        );
    });

    // Get user by ID
    getUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const user = await this.adminService.getUserById(id);

        res.status(200).json(
            ResponseFormat.successResponse(user, "Lấy thông tin người dùng thành công")
        );
    });

    // Update user status
    updateUserStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const { isActive } = req.body;

        const user = await this.adminService.updateUserStatus(id, isActive);

        res.status(200).json(
            ResponseFormat.successResponse(user, "Cập nhật trạng thái người dùng thành công")
        );
    });

    // Update user info
    updateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const updateData = req.body;

        const user = await this.adminService.updateUser(id, updateData);

        res.status(200).json(
            ResponseFormat.successResponse(user, "Cập nhật thông tin người dùng thành công")
        );
    });

    // Delete user
    deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;

        await this.adminService.deleteUser(id);

        res.status(200).json(
            ResponseFormat.successResponse(null, "Xóa người dùng thành công")
        );
    });

    // Get user statistics
    getUserStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const stats = await this.adminService.getUserStats();

        res.status(200).json(
            ResponseFormat.successResponse(stats, "Lấy thống kê người dùng thành công")
        );
    });

    // Create new user
    createUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userData = req.body;

        const user = await this.adminService.createUser(userData);

        res.status(201).json(
            ResponseFormat.successResponse(user, "Tạo người dùng thành công")
        );
    });
}
