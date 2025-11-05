import { Router } from "express";
import { container } from "tsyringe";
import LessonController from "../../controllers/lesson.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import {
    CreateLessonReqDto,
    UpdateLessonReqDto,
    LessonIdParamDto
} from "../../dtos/request/lesson.request.dto";

const adminLessonRoutes = Router();
const lessonController = container.resolve(LessonController);

// Tat ca admin routes can auth va role check
adminLessonRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// API #1: POST /admin/lessons
adminLessonRoutes.post(
    "/",
    validationBody(CreateLessonReqDto),
    lessonController.createLesson
);

// API #2: GET /admin/lessons
adminLessonRoutes.get("/", lessonController.getLessonList);

// API #3: GET /admin/lessons/:id
adminLessonRoutes.get(
    "/:id",
    validationParams(LessonIdParamDto),
    lessonController.getLessonById
);

// API #3.1: GET /admin/lessons/:id/sections
adminLessonRoutes.get(
    "/:id/sections",
    validationParams(LessonIdParamDto),
    lessonController.getLessonSections
);

// API #4: PATCH /admin/lessons/:id
adminLessonRoutes.patch(
    "/:id",
    validationParams(LessonIdParamDto),
    validationBody(UpdateLessonReqDto),
    lessonController.updateLesson
);

// API #5: DELETE /admin/lessons/:id
adminLessonRoutes.delete(
    "/:id",
    validationParams(LessonIdParamDto),
    lessonController.deleteLesson
);

export default adminLessonRoutes;
