import { Router } from "express";
import { container } from "tsyringe";
import DictationController from "../../controllers/dictation.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import { CreateDictationReqDto, DictationIdParamDto, DeleteDictationsReqDto } from "../../dtos/request/dictation.request.dto";

const adminDictationRoutes = Router();
const dictationController = container.resolve(DictationController);

// Tat ca admin routes can auth va role check
adminDictationRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// POST /admin/dictations
adminDictationRoutes.post(
    "/",
    validationBody(CreateDictationReqDto),
    dictationController.createDictation
);

// GET /admin/dictations
adminDictationRoutes.get("/", dictationController.getAllDictations);

// GET /admin/dictations/:id
adminDictationRoutes.get(
    "/:id",
    validationParams(DictationIdParamDto),
    dictationController.getDictationById
);

// DELETE /admin/dictations (delete multiple)
adminDictationRoutes.delete(
    "/",
    validationBody(DeleteDictationsReqDto),
    dictationController.deleteDictations
);

export default adminDictationRoutes;
