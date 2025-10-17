import { NextFunction, Request, Response, Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "../../controllers/auth.controller";
import multer from "multer";
import { validationBody, log } from "../../middlewares/validationError.middleware";
import { StudentRegisterReqDto, VerifyOtpReqDto, LoginReqDto, LogoutReqDto } from "../../dtos/request/Auth.request.dto";

const studentAuthRoutes = Router();
const authController = container.resolve(AuthController);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

studentAuthRoutes.post(
    "/student/register",
    upload.single("avatar"),
    validationBody(StudentRegisterReqDto),
    authController.registerStudentByPhone
);

studentAuthRoutes.post(
    "/student/verify-account",
    validationBody(VerifyOtpReqDto),
    authController.verifyStudentOtp
);

studentAuthRoutes.post(
    "/login",
    validationBody(LoginReqDto),
    authController.login
);
studentAuthRoutes.post(
    "/logout",
    validationBody(LogoutReqDto),
    authController.logout
);
studentAuthRoutes.post(
    "/logout-all-devices",
    validationBody(LogoutReqDto),
    authController.logoutAllDevices
);

studentAuthRoutes.post(
    "/refresh-token",
    authController.refreshToken
);

export default studentAuthRoutes;