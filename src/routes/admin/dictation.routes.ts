import { Router } from "express";
import { container } from "tsyringe";
import DictationController from "../../controllers/dictation.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { CreateDictationReqDto, DictationIdParamDto, DeleteDictationsReqDto } from "../../dtos/request/dictation.request.dto";

const adminDictationRoutes = Router();
const dictationController = container.resolve(DictationController);

// Middleware đã được apply ở admin/index.ts, không cần apply lại ở đây

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
