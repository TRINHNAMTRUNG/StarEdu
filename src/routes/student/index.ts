import { Router } from "express";
import studentAuthRoutes from "./auth.routes";
import studentCourseRoutes from "./course.routes";
import studentRoadmapRoutes from "./roadmap.routes";
import studentVocabularyRoutes from "./vocabulary.routes";
import studentTestRoutes from "./test.routes";
import studentDictationRoutes from "./dictation.routes";
import studentPaymentRoutes from "./payment.routes"; // ✅ THÊM
import studentEnrollmentRoutes from "./enrollment.routes"; // ✅ THÊM
import sectionProgressRoutes from "./section-progress.routes"; // ✅ THÊM - Section Progress
import vocabularyProgressRoutes from "./vocabulary-progress.routes"; // ✅ THÊM - Vocabulary Progress
const studentRouter = Router();

studentRouter.use("/auth", studentAuthRoutes);
studentRouter.use("/courses", studentCourseRoutes);
studentRouter.use("/roadmaps", studentRoadmapRoutes);
studentRouter.use("/vocabulary", studentVocabularyRoutes);
studentRouter.use("/vocabulary/progress", vocabularyProgressRoutes); // ✅ THÊM - Vocabulary Progress
studentRouter.use("/tests", studentTestRoutes);
studentRouter.use("/dictations", studentDictationRoutes);
studentRouter.use("/payments", studentPaymentRoutes); // ✅ THÊM
studentRouter.use("/enrollments", studentEnrollmentRoutes); // ✅ THÊM
studentRouter.use(sectionProgressRoutes); // ✅ THÊM - Section Progress (không prefix vì đã có /sections và /courses)

export default studentRouter;