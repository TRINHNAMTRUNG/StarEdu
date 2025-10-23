import { NextFunction, Request, Response, Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "../../controllers/auth.controller";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import multer from "multer";
import { validationBody, log } from "../../middlewares/validationError.middleware";
import { BanUserReqDto, LoginReqDto, LogoutReqDto, UnbanUserReqDto } from "../../dtos/request/Auth.request.dto";

const adminAuthRoutes = Router();
const authController = container.resolve(AuthController);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// PUBLIC routes (không cần auth)
adminAuthRoutes.post(
    "/login",
    validationBody(LoginReqDto),
    authController.adminLogin  // ✅ Đổi sang adminLogin
);

adminAuthRoutes.post(
    "/logout",
    validationBody(LogoutReqDto),
    authController.logout
);

// PRIVATE routes (cần auth + role ADMIN)
adminAuthRoutes.post(
    "/logout-all-devices",
    authenticateToken,
    authorizeRoles(UserRole.ADMIN),
    validationBody(LogoutReqDto),
    authController.logoutAllDevices
);

adminAuthRoutes.patch(
    "/ban-users",
    authenticateToken,
    authorizeRoles(UserRole.ADMIN),
    validationBody(BanUserReqDto),
    authController.banUsers
);

adminAuthRoutes.patch(
    "/unban-users",
    authenticateToken,
    authorizeRoles(UserRole.ADMIN),
    validationBody(UnbanUserReqDto),
    authController.unbanUsers
);

export default adminAuthRoutes;