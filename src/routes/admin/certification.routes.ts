import { Router } from "express";
import { container } from "tsyringe";
import CertificationController from "../../controllers/certification.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import {
    CreateCertificationReqDto,
    UpdateCertificationReqDto,
    CertificationIdParamDto
} from "../../dtos/request/certification.request.dto";

const adminCertificationRoutes = Router();
const certificationController = container.resolve(CertificationController);

// POST /admin/certifications
adminCertificationRoutes.post(
    "/",
    validationBody(CreateCertificationReqDto),
    certificationController.createCertification
);

// GET /admin/certifications
adminCertificationRoutes.get("/", certificationController.getCertificationList);

// PATCH /admin/certifications/:id
adminCertificationRoutes.patch(
    "/:id",
    validationParams(CertificationIdParamDto),
    validationBody(UpdateCertificationReqDto),
    certificationController.updateCertification
);

// DELETE /admin/certifications/:id
adminCertificationRoutes.delete(
    "/:id",
    validationParams(CertificationIdParamDto),
    certificationController.deleteCertification
);

export default adminCertificationRoutes;
