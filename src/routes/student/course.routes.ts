import { Router } from "express";
import { container } from "tsyringe";
import StudentCourseController from "../../controllers/student-course.controller";
import { validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import { CourseIdParamDto } from "../../dtos/request/course.request.dto";

const studentCourseRoutes = Router();
const studentCourseController = container.resolve(StudentCourseController);

// API #1: GET /student/courses (public)
studentCourseRoutes.get("/", studentCourseController.getCourses);

// API #2: GET /student/courses/:id (public)
studentCourseRoutes.get(
    "/:id",
    validationParams(CourseIdParamDto),
    studentCourseController.getCourseById
);

// API #3: GET /student/courses/enrolled (private - CẦN auth)
studentCourseRoutes.get(
    "/enrolled",
    authenticateToken,
    authorizeRoles(UserRole.STUDENT),
    studentCourseController.getEnrolledCourses
);

export default studentCourseRoutes;
