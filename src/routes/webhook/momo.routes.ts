import { Router } from "express";
import { container } from "tsyringe";
import PaymentController from "../../controllers/payment.controller";
import { validationBody } from "../../middlewares/validationError.middleware";
import { MoMoIPNReqDto } from "../../dtos/request/payment.request.dto";

const momoWebhookRoutes = Router();
const paymentController = container.resolve(PaymentController);

// POST /webhooks/momo/ipn (PUBLIC - không auth)
momoWebhookRoutes.post(
    "/ipn",
    validationBody(MoMoIPNReqDto),
    paymentController.handleMoMoIPN
);

export default momoWebhookRoutes;
