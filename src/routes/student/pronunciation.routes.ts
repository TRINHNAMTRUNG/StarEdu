
import { NextFunction, Request, Response, Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "../../controllers/auth.controller";
import multer from "multer";
import { validationBody, log } from "../../middlewares/validationError.middleware";
import { StudentRegisterReqDto, VerifyOtpReqDto, LoginReqDto, LogoutReqDto } from "../../dtos/request/Auth.request.dto";
import PronunciationController from "../../controllers/pronunciation.controller";

const studentPronunciationRoutes = Router();
const pronunciationController = container.resolve(PronunciationController);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

studentPronunciationRoutes.post(
    "/",
    upload.single("audio"),
    pronunciationController.assessPronunciation
);

export default studentPronunciationRoutes;