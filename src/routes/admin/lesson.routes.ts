import { Router } from "express";
import { container } from "tsyringe";
import LessonController from "../../controllers/lesson.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import {
    LessonPublishParamDto,
    ToggleFreeLessonReqDto,
    BulkPublishLessonsReqDto,
    CourseIdForLessonsParamDto,
    LessonIdParamDto,
    CreateLessonReqDto,
    UpdateLessonReqDto,
    CourseIdParamDto,
    BulkToggleFreeLessonsReqDto
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

// ============================================
// PHASE 2 - PUBLISH & FREE CONTROLS
// ============================================

// API #6: PATCH /admin/lessons/courses/:courseId/lessons/:lessonId/publish
adminLessonRoutes.patch(
    "/courses/:courseId/lessons/:lessonId/publish",
    validationParams(LessonPublishParamDto),
    lessonController.togglePublishLesson
);

// API #7: PATCH /admin/lessons/courses/:courseId/lessons/bulk-publish
adminLessonRoutes.patch(
    "/courses/:courseId/lessons/bulk-publish",
    validationParams(CourseIdParamDto),
    validationBody(BulkPublishLessonsReqDto),
    lessonController.bulkPublishLessons
);

// API #8: PATCH /admin/lessons/courses/:courseId/lessons/:lessonId/free
adminLessonRoutes.patch(
    "/courses/:courseId/lessons/:lessonId/free",
    validationParams(LessonPublishParamDto),
    validationBody(ToggleFreeLessonReqDto),
    lessonController.toggleFreeLesson
);

// API #9: GET /admin/lessons/courses/:id/free-lessons
adminLessonRoutes.get(
    "/courses/:id/free-lessons",
    validationParams(CourseIdForLessonsParamDto),
    lessonController.getFreeLessons
);

// API MỚI: PATCH /admin/lessons/courses/:courseId/lessons/bulk-free
adminLessonRoutes.patch(
    "/courses/:courseId/lessons/bulk-free",
    validationParams(CourseIdParamDto),
    validationBody(BulkToggleFreeLessonsReqDto),
    lessonController.bulkToggleFreeLessons
);

export default adminLessonRoutes;
