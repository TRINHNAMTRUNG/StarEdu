import { Router } from "express";
import adminAuthRoutes from "./auth.routes";
import adminTeacherRoutes from "./teacher.routes";
import adminVocabularyRoutes from "./vocabulary.routes";
import adminCertificationRoutes from "./certification.routes";
import adminCourseRoutes from "./course.routes";
import adminRoadmapRoutes from "./roadmap.routes";
import adminLessonRoutes from "./lesson.routes";
import adminSectionRoutes from "./section.routes";
import adminTestRoutes from "./test.routes";
import adminDictationRoutes from "./dictation.routes";
import adminUserRoutes from "./user.routes";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import adminWritingRoutes from "./admin-writing.routes";

const adminRouter = Router();

// Public routes (không cần authentication)
adminRouter.use("/auth", adminAuthRoutes);

// Protected routes (chỉ admin mới truy cập được)
adminRouter.use("/teachers", authenticateToken, authorizeRoles(UserRole.ADMIN), adminTeacherRoutes);
adminRouter.use("/vocabulary", authenticateToken, authorizeRoles(UserRole.ADMIN), adminVocabularyRoutes);
adminRouter.use("/certifications", authenticateToken, authorizeRoles(UserRole.ADMIN), adminCertificationRoutes);
adminRouter.use("/courses", authenticateToken, authorizeRoles(UserRole.ADMIN), adminCourseRoutes);
adminRouter.use("/roadmaps", authenticateToken, authorizeRoles(UserRole.ADMIN), adminRoadmapRoutes);
adminRouter.use("/lessons", authenticateToken, authorizeRoles(UserRole.ADMIN), adminLessonRoutes);
adminRouter.use("/sections", authenticateToken, authorizeRoles(UserRole.ADMIN), adminSectionRoutes);
adminRouter.use("/tests", authenticateToken, authorizeRoles(UserRole.ADMIN), adminTestRoutes);
adminRouter.use("/dictations", authenticateToken, authorizeRoles(UserRole.ADMIN), adminDictationRoutes);
adminRouter.use("/users", authenticateToken, authorizeRoles(UserRole.ADMIN), adminUserRoutes);
adminRouter.use("/writing-prompts", authenticateToken, authorizeRoles(UserRole.ADMIN), adminWritingRoutes);

export default adminRouter;