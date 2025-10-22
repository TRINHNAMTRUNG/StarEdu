import { Router } from "express";
import adminAuthRoutes from "./auth.routes";
import adminTeacherRoutes from "./teacher.routes";
import adminVocabularyRoutes from "./vocabulary.routes";
import adminCertificationRoutes from "./certification.routes";
import adminCourseRoutes from "./course.routes";
import adminRoadmapRoutes from "./roadmap.routes";
import adminLessonRoutes from "./lesson.routes";
import adminSectionRoutes from "./section.routes";

const adminRouter = Router();

adminRouter.use("/auth", adminAuthRoutes);
adminRouter.use("/teachers", adminTeacherRoutes);
adminRouter.use("/vocabulary", adminVocabularyRoutes);
adminRouter.use("/certifications", adminCertificationRoutes);
adminRouter.use("/courses", adminCourseRoutes);
adminRouter.use("/roadmaps", adminRoadmapRoutes);
adminRouter.use("/lessons", adminLessonRoutes);
adminRouter.use("/sections", adminSectionRoutes);

export default adminRouter;