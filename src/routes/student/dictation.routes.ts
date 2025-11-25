import { Router } from "express";
import { container } from "tsyringe";
import StudentDictationController from "../../controllers/student-dictation.controller";
import { validationParams } from "../../middlewares/validationError.middleware";
import { optionalAuth } from "../../middlewares/auth.middleware";
import { DictationIdParamDto } from "../../dtos/request/dictation.request.dto";

const studentDictationRoutes = Router();
const studentDictationController = container.resolve(StudentDictationController);

// GET /student/dictations (optional auth - public can view but with limited access)
studentDictationRoutes.get(
    "/",
    optionalAuth,
    studentDictationController.getDictations
);

// GET /student/dictations/:id (optional auth - check access in service)
studentDictationRoutes.get(
    "/:id",
    optionalAuth,
    validationParams(DictationIdParamDto),
    studentDictationController.getDictationById
);

export default studentDictationRoutes;
