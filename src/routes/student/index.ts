import { Router } from "express";
import studentAuthRoutes from "./auth.routes";
import studentCourseRoutes from "./course.routes";
import studentRoadmapRoutes from "./roadmap.routes";

const studentRouter = Router();

studentRouter.use("/auth", studentAuthRoutes);
studentRouter.use("/courses", studentCourseRoutes);
studentRouter.use("/roadmaps", studentRoadmapRoutes);

export default studentRouter;