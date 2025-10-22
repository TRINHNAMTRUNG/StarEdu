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

adminTeacherRoutes.post(
    "/",
    validationBody(CreateTeacherReqDto),
    teacherController.createTeacher
);

adminTeacherRoutes.get(
    "/",
    teacherController.getTeacherList
);

adminTeacherRoutes.patch(
    "/:userId",
    validationParams(IdParamDto),
    validationBody(UpdateTeacherByAdminReqDto),
    teacherController.updateTeacherInfoByAdmin
);

adminTeacherRoutes.patch(
    "/set-status",
    validationBody(SetTeacherStatusReqDto),
    teacherController.setTeacherStatus
);



export default adminTeacherRoutes;