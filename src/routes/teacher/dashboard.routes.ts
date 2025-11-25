// import { Router } from "express";
// import { container } from "tsyringe";
// import TeacherCourseController from "../../controllers/teacher-course.controller";
// import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
// import { UserRole } from "../../models/user.model";

// const teacherDashboardRoutes = Router();
// const teacherCourseController = container.resolve(TeacherCourseController);

// // Can auth va role check
// teacherDashboardRoutes.use(authenticateToken, authorizeRoles(UserRole.TEACHER));

// // API #6: GET /teacher/dashboard/courses
// teacherDashboardRoutes.get("/courses", teacherCourseController.getDashboard);

// export default teacherDashboardRoutes;
