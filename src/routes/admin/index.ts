
import { Router } from "express";
import adminAuthRoutes from "./auth.routes";
import adminTeacherRoutes from "./teacher.routes";
import adminVocabularyRoutes from "./vocabulary.routes";

const adminRouter = Router();

adminRouter.use("/auth", adminAuthRoutes);
adminRouter.use("/teachers", adminTeacherRoutes);
adminRouter.use("/vocabulary", adminVocabularyRoutes);


export default adminRouter;