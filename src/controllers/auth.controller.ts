import { injectable } from "tsyringe";
import AuthService from "../services/auth.service";
import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import ResponseFormat from "../utils/ResponseFormat";
import { BanUserReqDto, LoginReqDto, StudentRegisterReqDto, VerifyOtpReqDto } from "../dtos/request/Auth.request.dto";
import { BanUserResDto, RefreshTokenResDto, StudentLoginResDto, StudentRegisterResDto, StudentVerifyResDto } from "../dtos/response/Auth.response.dto";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { LogoutReqDto, RefreshTokenReqDto } from "../dtos/request/Auth.request.dto";
import { LogoutResDto, LogoutAllResDto } from "../dtos/response/Auth.response.dto";
import { JwtUserPayload } from "../utils/token.util";
import AppError from "../utils/AppError";

@injectable()
export class AuthController {
    constructor(
        private authService: AuthService
    ) { }

    login = asyncHandler(
        async (req: Request<{}, {}, LoginReqDto>, res: Response, next: NextFunction) => {
            const { phone, password } = req.body;
            const user = await this.authService.login(phone, password);

            // Chuẩn hóa đầu ra dto
            const userResDto = instanceToPlain(
                plainToInstance(
                    StudentLoginResDto,
                    user,
                    { excludeExtraneousValues: true }
                )
            );
            return res.status(200).json(
                ResponseFormat.successResponse(
                    userResDto,
                    "Đăng nhập thành công!",
                    200,
                    req.requestId
                )
            )
        }
    );

    refreshToken = asyncHandler(
        async (req: Request<{}, {}, RefreshTokenReqDto>, res: Response, next: NextFunction) => {
            const { refreshToken } = req.body;

            // Gọi service để xử lý refresh token
            const result = await this.authService.refreshToken(refreshToken);

            // Chuẩn hóa đầu ra DTO
            const response = instanceToPlain(
                plainToInstance(
                    RefreshTokenResDto,
                    result,
                    { excludeExtraneousValues: true }
                )
            );

            return res.status(200).json(
                ResponseFormat.successResponse(
                    response,
                    "Token đã được làm mới thành công",
                    200,
                    req.requestId
                )
            );
        }
    );

    logout = asyncHandler(
        async (req: Request<{}, {}, LogoutReqDto>, res: Response, next: NextFunction) => {
            const { refreshToken } = req.body;
            const result = await this.authService.logout(refreshToken);

            const response = instanceToPlain(
                plainToInstance(
                    LogoutResDto,
                    result,
                    { excludeExtraneousValues: true }
                )
            );

            return res.status(200).json(
                ResponseFormat.successResponse(
                    response,
                    "Đăng xuất thành công",
                    200,
                    req.requestId
                )
            );
        }
    );

    logoutAllDevices = asyncHandler(
        async (req: Request, res: Response, next: NextFunction) => {
            // Kiểm tra xem req.user có tồn tại không
            if (!req.user) {
                throw AppError.unauthorizedError("Chưa xác thực");
            }

            const userInfo = req.user as JwtUserPayload;
            const result = await this.authService.logoutAllDevices(userInfo);

            const response = instanceToPlain(
                plainToInstance(
                    LogoutAllResDto,
                    result,
                    { excludeExtraneousValues: true }
                )
            );

            return res.status(200).json(
                ResponseFormat.successResponse(
                    response,
                    "Đăng xuất tất cả thiết bị thành công",
                    200,
                    req.requestId
                )
            );
        }
    );

    /**
     * --------------
     *  STUDENT APIs
     * --------------
     */
    registerStudentByPhone = asyncHandler(
        async (req: Request<{}, {}, StudentRegisterReqDto>, res: Response, next: NextFunction) => {
            const studentInfo: StudentRegisterReqDto = req.body;
            const student = await this.authService.registerStudentByPhone(studentInfo);

            // Chuẩn hóa đầu ra dto
            const studentResDto = instanceToPlain(
                plainToInstance(
                    StudentRegisterResDto,
                    student,
                    { excludeExtraneousValues: true }
                )
            );
            return res.status(201).json(
                ResponseFormat.successResponse(
                    studentResDto,
                    "Đăng kí tài khoản thành công, vui lòng xác thực otp qua số điện thoại!",
                    201,
                    req.requestId
                )
            )
        }
    );

    verifyStudentOtp = asyncHandler(
        async (req: Request<{}, {}, VerifyOtpReqDto>, res: Response, next: NextFunction) => {
            const { phone, code } = req.body;
            const user = await this.authService.verifyAccountOtp(phone, code);

            // Chuẩn hóa đầu ra dto
            const userResDto = instanceToPlain(
                plainToInstance(
                    StudentVerifyResDto,
                    user,
                    { excludeExtraneousValues: true }
                )
            );
            return res.status(200).json(
                ResponseFormat.successResponse(
                    userResDto,
                    "Xác thực OTP thành công!",
                    200,
                    req.requestId
                )
            )
        }
    );

    /**
     * --------------
     *  ADMIN APIs
     * --------------
     */

    banUsers = asyncHandler(
        async (req: Request<{}, {}, BanUserReqDto>, res: Response, next: NextFunction) => {
            const { userIds } = req.body;
            const result = await this.authService.banUsers(userIds);

            const response = instanceToPlain(
                plainToInstance(BanUserResDto, result, { excludeExtraneousValues: true })
            );

            return res.status(200).json(
                ResponseFormat.successResponse(
                    response,
                    "Ban nhiều tài khoản thành công",
                    200,
                    req.requestId
                )
            );
        }
    );


}