import { Router } from "express";
import { container } from "tsyringe";
import CertificationController from "../../controllers/certification.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import {
    CreateCertificationReqDto,
    UpdateCertificationReqDto,
    CertificationIdParamDto
} from "../../dtos/request/certification.request.dto";

const adminCertificationRoutes = Router();
const certificationController = container.resolve(CertificationController);

// Tat ca admin routes can auth va role check
adminCertificationRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// POST /admin/certifications
adminCertificationRoutes.post(
    "/",
    validationBody(CreateCertificationReqDto),
    certificationController.createCertification
);

// GET /admin/certifications
adminCertificationRoutes.get(
    "/",
    certificationController.getCertificationList
);

// PATCH /admin/certifications/:id
adminCertificationRoutes.patch(
    "/:id",
    validationParams(CertificationIdParamDto),
    validationBody(UpdateCertificationReqDto),
    certificationController.updateCertification
);


export default adminCertificationRoutes;
