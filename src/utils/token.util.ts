// src/utils/jwt.util.ts
import jwt, { Secret, SignOptions, JwtPayload, TokenExpiredError, JsonWebTokenError, NotBeforeError } from "jsonwebtoken";
import AppError from "./AppError";
import { ENV } from "../config/environment";
import { UserRole } from "../models/user.model";


export interface JwtUserPayload {
    id: string;
    role: UserRole;
}

export const generateTokens = (payload: JwtUserPayload) => {
    const accessToken = jwt.sign(payload, ENV.AT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, ENV.RT_SECRET, { expiresIn: "7d" });
    return { accessToken, refreshToken };
}


export const verifyAccessToken = (token: string): JwtUserPayload => {
    try {
        return jwt.verify(token, ENV.AT_SECRET) as JwtUserPayload;
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            throw AppError.unauthorizedError("Access token đã hết hạn");
        }
        if (err instanceof JsonWebTokenError) {
            throw AppError.unauthorizedError("Access token không hợp lệ");
        }
        if (err instanceof NotBeforeError) {
            throw AppError.unauthorizedError("Access token chưa được kích hoạt");
        }
        throw AppError.unauthorizedError("Lỗi xác thực token");
    }
};

export const verifyRefreshToken = (token: string): JwtUserPayload => {
    try {
        return jwt.verify(token, ENV.RT_SECRET) as JwtUserPayload;
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            throw AppError.unauthorizedError("Refresh token đã hết hạn, cần đăng nhập lại");
        }
        if (err instanceof JsonWebTokenError) {
            throw AppError.unauthorizedError("Refresh token không hợp lệ");
        }
        throw AppError.unauthorizedError("Lỗi xác thực refresh token");
    }
};
