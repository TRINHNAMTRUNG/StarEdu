import { Router } from "express";
import { container } from "tsyringe";
import SectionController from "../../controllers/section.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import {
    CreateSectionReqDto,
    UpdateSectionReqDto,
    SectionIdParamDto
} from "../../dtos/request/section.request.dto";

const adminSectionRoutes = Router();
const sectionController = container.resolve(SectionController);

adminSectionRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

adminSectionRoutes.post(
    "/",
    validationBody(CreateSectionReqDto),
    sectionController.createSection
);

adminSectionRoutes.get("/", sectionController.getSectionList);

adminSectionRoutes.get(
    "/:id",
    validationParams(SectionIdParamDto),
    sectionController.getSectionById
);

adminSectionRoutes.patch(
    "/:id",
    validationParams(SectionIdParamDto),
    validationBody(UpdateSectionReqDto),
    sectionController.updateSection
);

adminSectionRoutes.delete(
    "/:id",
    validationParams(SectionIdParamDto),
    sectionController.deleteSection
);

export default adminSectionRoutes;
