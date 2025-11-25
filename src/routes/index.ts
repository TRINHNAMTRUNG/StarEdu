import { Router } from "express";
import authRoutes from "./admin/auth.routes";
import adminRouter from "./admin";
import teacherRouter from "./teacher";
import studentRouter from "./student";
import momoWebhookRoutes from "./webhook/momo.routes"; // ✅ THÊM

const router = Router();

router.use("/teacher", teacherRouter);
router.use("/admin", adminRouter);
router.use("/student", studentRouter);
router.use("/webhooks/momo", momoWebhookRoutes); // ✅ THÊM

export default router;
