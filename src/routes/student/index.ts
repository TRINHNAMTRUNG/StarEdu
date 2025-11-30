import { Router } from "express";
import studentAuthRoutes from "./auth.routes";
import studentCourseRoutes from "./course.routes";
import studentRoadmapRoutes from "./roadmap.routes";
import studentVocabularyRoutes from "./vocabulary.routes";
import studentTestRoutes from "./test.routes";
import studentDictationRoutes from "./dictation.routes";
import studentPaymentRoutes from "./payment.routes"; // ✅ THÊM
import studentEnrollmentRoutes from "./enrollment.routes"; // ✅ THÊM
const studentRouter = Router();

studentRouter.use("/auth", studentAuthRoutes);
studentRouter.use("/courses", studentCourseRoutes);
studentRouter.use("/roadmaps", studentRoadmapRoutes);
studentRouter.use("/vocabulary", studentVocabularyRoutes);
studentRouter.use("/tests", studentTestRoutes);
studentRouter.use("/dictations", studentDictationRoutes);
studentRouter.use("/payments", studentPaymentRoutes); // ✅ THÊM
studentRouter.use("/enrollments", studentEnrollmentRoutes); // ✅ THÊM

export default studentRouter;