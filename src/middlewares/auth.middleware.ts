import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError";
import { JwtUserPayload, verifyAccessToken } from "../utils/token.util";
import { UserRole } from "../models/user.model";
import UserModel from "../models/user.model";

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw AppError.unauthorizedError("Token không tồn tại hoặc sai định dạng");
    }

    const token = authHeader.split(" ")[1];
    try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch (err) {
        return next(AppError.unauthorizedError("Token không hợp lệ hoặc đã hết hạn"));
    }
};

export const authorizeRoles = (...roles: UserRole[]) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const { id, role } = req.user;

        // Kiểm tra vai trò
        if (!roles.includes(role)) {
            throw AppError.forbiddenError("Không có quyền truy cập tài nguyên này");
        }

        // Kiểm tra tài khoản có tồn tại không
        const user = await UserModel.findById(id).select("+isActive +isVerified");
        if (!user) {
            throw AppError.notFoundError("Tài khoản không tồn tại");
        }

        // Kiểm tra tài khoản có bị đình chỉ không
        if (!user.isActive) {
            throw AppError.forbiddenError("Tài khoản đã bị đình chỉ");
        }

        // Kiểm tra tài khoản đã được xác thực hay chưa
        if (!user.isVerified) {
            throw AppError.unauthorizedError("Tài khoản chưa được xác thực");
        }

        next();
    } catch (err) {
        next(err);
    }
};