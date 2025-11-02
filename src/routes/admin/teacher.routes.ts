import { Router } from "express";
import { container } from "tsyringe";
import multer from "multer";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import { CreateTeacherReqDto, IdParamDto, SetTeacherStatusReqDto, UpdateTeacherByAdminReqDto } from "../../dtos/request/Teacher.request.dto";
import TeacherController from "../../controllers/teacher.controller";

const adminTeacherRoutes = Router();
const teacherController = container.resolve(TeacherController);

// Tat ca admin routes can auth va role check
adminTeacherRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Tạo giảng viên mới
adminTeacherRoutes.post(
    "/",
    validationBody(CreateTeacherReqDto),
    teacherController.createTeacher
);

// Lấy danh sách giảng viên
adminTeacherRoutes.get(
    "/",
    teacherController.getTeacherList
);

// ✅ ĐẶT set-status TRƯỚC /:userId
adminTeacherRoutes.patch(
    "/set-status",
    validationBody(SetTeacherStatusReqDto),
    teacherController.setTeacherStatus
);

// Cập nhật thông tin giảng viên bởi admin
adminTeacherRoutes.patch(
    "/:userId",
    validationParams(IdParamDto),
    validationBody(UpdateTeacherByAdminReqDto),
    teacherController.updateTeacherInfoByAdmin
);

export default adminTeacherRoutes;