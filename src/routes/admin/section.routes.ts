import { Router } from "express";
import { container } from "tsyringe";
import multer from "multer";
import SectionController from "../../controllers/section.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import { SectionIdParamDto, CreateSectionReqDto, UpdateSectionReqDto } from "../../dtos/request/section.request.dto";
import os from "os";
import path from "path";
import fs from "fs";

const adminSectionRoutes = Router();
const sectionController = container.resolve(SectionController);

// --- CHANGED: Multer config: use diskStorage, optional size limit via env ---
const uploadTmpDir = path.join(os.tmpdir(), "staredu-uploads");
if (!fs.existsSync(uploadTmpDir)) {
    // create tmp dir for uploads
    fs.mkdirSync(uploadTmpDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadTmpDir);
    },
    filename: function (_req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// Read optional max file size from env (MB). If not set => no limit enforced by multer.
const maxSizeMb = process.env.UPLOAD_MAX_FILE_SIZE_MB ? Number(process.env.UPLOAD_MAX_FILE_SIZE_MB) : undefined;
const multerOptions: multer.Options = { storage };
if (typeof maxSizeMb === "number" && !Number.isNaN(maxSizeMb) && maxSizeMb > 0) {
    multerOptions.limits = { fileSize: maxSizeMb * 1024 * 1024 };
}

const upload = multer(multerOptions);
// --- END CHANGED ---

adminSectionRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// POST /admin/sections (multipart/form-data)
adminSectionRoutes.post(
    "/",
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "mindmap", maxCount: 1 }
    ]),
    // validationBody(CreateSectionReqDto), // ❌ SKIP vì multipart/form-data
    sectionController.createSection
);

// GET /admin/sections/:id
adminSectionRoutes.get(
    "/:id",
    validationParams(SectionIdParamDto),
    sectionController.getSectionById
);

// PATCH /admin/sections/:id (multipart/form-data)
adminSectionRoutes.patch(
    "/:id",
    validationParams(SectionIdParamDto),
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "mindmap", maxCount: 1 }
    ]),
    // validationBody(UpdateSectionReqDto), // ❌ SKIP vì multipart/form-data
    sectionController.updateSection
);

// DELETE /admin/sections/:id
adminSectionRoutes.delete(
    "/:id",
    validationParams(SectionIdParamDto),
    sectionController.deleteSection
);

export default adminSectionRoutes;
