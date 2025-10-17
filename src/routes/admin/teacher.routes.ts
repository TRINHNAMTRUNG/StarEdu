import { Router } from "express";
import { container } from "tsyringe";
import multer from "multer";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { CreateTeacherReqDto, IdParamDto, SetTeacherStatusReqDto, UpdateTeacherByAdminReqDto } from "../../dtos/request/Teacher.request.dto";
import TeacherController from "../../controllers/teacher.controller";

const adminTeacherRoutes = Router();
const teacherController = container.resolve(TeacherController);

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