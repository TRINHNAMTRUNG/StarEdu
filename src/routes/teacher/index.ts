
import { Router } from "express";
import teacherAuthRoutes from "./auth.routes";

const teacherRouter = Router();

teacherRouter.use("/auth", teacherAuthRoutes);


export default teacherRouter;