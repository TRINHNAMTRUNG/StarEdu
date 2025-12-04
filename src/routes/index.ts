
import { Router } from "express";
import authRoutes from "./admin/auth.routes";
import adminRouter from "./admin";
// import teacherRouter from "./teacher";
import studentRouter from "./student";
import momoWebhookRoutes from "./webhook/momo.routes"; // ✅ THÊM

const rootRouter = Router();

// rootRouter.use("/teacher", teacherRouter);
rootRouter.use("/admin", adminRouter);
rootRouter.use("/student", studentRouter);
rootRouter.use("/webhooks/momo", momoWebhookRoutes); // ✅ THÊM

export default rootRouter;
