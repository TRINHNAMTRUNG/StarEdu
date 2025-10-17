import { NextFunction, Request, Response, Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "../../controllers/auth.controller";
import multer from "multer";
import { validationBody, log } from "../../middlewares/validationError.middleware";
import { LoginReqDto, LogoutReqDto } from "../../dtos/request/Auth.request.dto";

const teacherAuthRoutes = Router();
const authController = container.resolve(AuthController);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

teacherAuthRoutes.post(
    "/login",
    validationBody(LoginReqDto),
    authController.login
);

teacherAuthRoutes.post(
    "/logout",
    validationBody(LogoutReqDto),
    authController.logout
);

teacherAuthRoutes.post(
    "/refresh-token",
    authController.refreshToken
);

export default teacherAuthRoutes;