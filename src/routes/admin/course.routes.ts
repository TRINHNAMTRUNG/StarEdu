import { Router } from "express";
import { container } from "tsyringe";
import CourseController from "../../controllers/course.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import {
    CreateCourseReqDto,
    UpdateCourseReqDto,
    AssignTeachersReqDto,
    CourseIdParamDto,
    ToggleModifiableReqDto
} from "../../dtos/request/course.request.dto";

const adminCourseRoutes = Router();
const courseController = container.resolve(CourseController);

// Tat ca admin routes can auth va role check
adminCourseRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// API #1: POST /admin/courses
adminCourseRoutes.post(
    "/",
    validationBody(CreateCourseReqDto),
    courseController.createCourse
);

// API #2: GET /admin/courses
adminCourseRoutes.get("/", courseController.getCourseList);

// API #3: GET /admin/courses/:id
adminCourseRoutes.get(
    "/:id",
    validationParams(CourseIdParamDto),
    courseController.getCourseById
);

// API #3.1: GET /admin/courses/:id/lessons
adminCourseRoutes.get(
    "/:id/lessons",
    validationParams(CourseIdParamDto),
    courseController.getCourseLessons
);

// API #4: PATCH /admin/courses/:id
adminCourseRoutes.patch(
    "/:id",
    validationParams(CourseIdParamDto),
    validationBody(UpdateCourseReqDto),
    courseController.updateCourse
);

// API #5: DELETE /admin/courses/:id
adminCourseRoutes.delete(
    "/:id",
    validationParams(CourseIdParamDto),
    courseController.deleteCourse
);

// API #6: PATCH /admin/courses/:id/publish
adminCourseRoutes.patch(
    "/:id/publish",
    validationParams(CourseIdParamDto),
    courseController.togglePublishCourse
);

// API #7: PATCH /admin/courses/:id/teachers
adminCourseRoutes.patch(
    "/:id/teachers",
    validationParams(CourseIdParamDto),
    validationBody(AssignTeachersReqDto),
    courseController.assignTeachers
);

// API #8: GET /admin/courses/:id/statistics
adminCourseRoutes.get(
    "/:id/statistics",
    validationParams(CourseIdParamDto),
    courseController.getCourseStatistics
);

// API #9: PATCH /admin/courses/:id/modifiable
adminCourseRoutes.patch(
    "/:id/modifiable",
    validationParams(CourseIdParamDto),
    validationBody(ToggleModifiableReqDto),
    courseController.toggleModifiable
);

export default adminCourseRoutes;
