import { Router } from "express";
import teacherAuthRoutes from "./auth.routes";
import teacherCourseRoutes from "./course.routes";
import teacherDashboardRoutes from "./dashboard.routes";

const teacherRouter = Router();

teacherRouter.use("/auth", teacherAuthRoutes);
teacherRouter.use("/courses", teacherCourseRoutes);
teacherRouter.use("/dashboard", teacherDashboardRoutes);

export default teacherRouter;