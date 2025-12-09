
import { Router } from "express";
import authRoutes from "./admin/auth.routes";
import adminRouter from "./admin";
// import teacherRouter from "./teacher";
import studentRouter from "./student";
import momoWebhookRoutes from "./webhook/momo.routes"; // ✅ THÊM
import roadmapRecommendationRoutes from "./roadmapRecommendation.route"; // ✅ THÊM
import learningScheduleRoutes from "./learningSchedule.routes"; // ✅ THÊM
import studentCourseRoutes from "./student/course.routes"; // ✅ THÊM public courses

const rootRouter = Router();

// rootRouter.use("/teacher", teacherRouter);
rootRouter.use("/admin", adminRouter);
rootRouter.use("/student", studentRouter);
rootRouter.use("/webhooks/momo", momoWebhookRoutes); // ✅ THÊM
rootRouter.use("/roadmaps", roadmapRecommendationRoutes); // ✅ THÊM gợi ý lộ trình
rootRouter.use("/schedules", learningScheduleRoutes); // ✅ THÊM learning schedule
rootRouter.use("/courses", studentCourseRoutes); // ✅ THÊM public courses alias

export default rootRouter;
