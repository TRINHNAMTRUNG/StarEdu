
import { Router } from "express";
import authRoutes from "./admin/auth.routes";
import adminRouter from "./admin";
import teacherRouter from "./teacher";
import studentRouter from "./student";

const rootRouter = Router();

rootRouter.use("/teacher", teacherRouter);
rootRouter.use("/admin", adminRouter);
rootRouter.use("/student", studentRouter);

export default rootRouter;
