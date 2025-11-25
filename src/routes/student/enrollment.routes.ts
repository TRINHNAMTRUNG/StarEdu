import { Router } from "express";
import { container } from "tsyringe";
import EnrollmentController from "../../controllers/enrollment.controller";
import { validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import { EnrollmentIdParamDto } from "../../dtos/request/enrollment.request.dto";

const studentEnrollmentRoutes = Router();
const enrollmentController = container.resolve(EnrollmentController);

// All routes require STUDENT auth
studentEnrollmentRoutes.use(authenticateToken, authorizeRoles(UserRole.STUDENT));

// GET /student/enrollments
studentEnrollmentRoutes.get("/", enrollmentController.getEnrollmentList);

// GET /student/enrollments/:id
studentEnrollmentRoutes.get(
    "/:id",
    validationParams(EnrollmentIdParamDto),
    enrollmentController.getEnrollmentById
);

export default studentEnrollmentRoutes;
