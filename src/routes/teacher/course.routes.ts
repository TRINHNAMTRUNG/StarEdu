import { Router } from "express";
import { container } from "tsyringe";
import TeacherCourseController from "../../controllers/teacher-course.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import { UpdateCourseReqDto, CourseIdParamDto } from "../../dtos/request/course.request.dto";

const teacherCourseRoutes = Router();
const teacherCourseController = container.resolve(TeacherCourseController);

// Tat ca teacher routes can auth va role check
teacherCourseRoutes.use(authenticateToken, authorizeRoles(UserRole.TEACHER));

// API #1: GET /teacher/courses
teacherCourseRoutes.get("/", teacherCourseController.getCourses);

// API #2: GET /teacher/courses/:id
teacherCourseRoutes.get(
    "/:id",
    validationParams(CourseIdParamDto),
    teacherCourseController.getCourseById
);

// API #3: PATCH /teacher/courses/:id
teacherCourseRoutes.patch(
    "/:id",
    validationParams(CourseIdParamDto),
    validationBody(UpdateCourseReqDto),
    teacherCourseController.updateCourse
);

// API #4: GET /teacher/courses/:id/lessons
teacherCourseRoutes.get(
    "/:id/lessons",
    validationParams(CourseIdParamDto),
    teacherCourseController.getCourseLessons
);

// API #5: GET /teacher/courses/:id/statistics
teacherCourseRoutes.get(
    "/:id/statistics",
    validationParams(CourseIdParamDto),
    teacherCourseController.getCourseStatistics
);

export default teacherCourseRoutes;
