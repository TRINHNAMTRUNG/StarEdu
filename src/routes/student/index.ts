
import { Router } from "express";
import studentAuthRoutes from "./auth.routes";
import studentPronunciationRoutes from "./pronunciation.routes";

const studentRouter = Router();

studentRouter.use("/auth", studentAuthRoutes);
studentRouter.use("/pronunciation", studentPronunciationRoutes);


export default studentRouter;