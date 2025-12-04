import { Router } from "express";
import { container } from "tsyringe";
import AdminWritingController from "../../controllers/admin-writing.controller";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import multer from "multer";
import { validationParams } from "../../middlewares/validationError.middleware";
import { WritingPromptIdParamDto } from "../../dtos/request/writing.request.dto";

const adminWritingRoutes = Router();
const controller = container.resolve(AdminWritingController);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

adminWritingRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

adminWritingRoutes.get("/", controller.getAllPrompts);
adminWritingRoutes.post("/", upload.single("image"), controller.createPrompt);
adminWritingRoutes.patch("/:id", validationParams(WritingPromptIdParamDto), upload.single("image"), controller.updatePrompt);
adminWritingRoutes.delete("/:id", validationParams(WritingPromptIdParamDto), controller.deletePrompt);

export default adminWritingRoutes;
