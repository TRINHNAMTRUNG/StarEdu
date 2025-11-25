import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import PaymentService from "../services/payment.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreatePaymentResDto,
    GetPaymentDetailResDto,
    GetPaymentListResDto,
    MoMoIPNResDto
} from "../dtos/response/payment.response.dto";
import ResponseFormat from "../utils/ResponseFormat";
import AppError from "../utils/AppError";

@injectable()
class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    /**
     * POST /student/payments/create
     */
    createPayment = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const { roadmap_id, gateway, redirect_url } = req.body;
        const result = await this.paymentService.createPayment(
            req.user.id,
            roadmap_id,
            gateway,
            redirect_url
        );

        const response = instanceToPlain(
            plainToInstance(CreatePaymentResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo thanh toán thành công", 201, req.requestId)
        );
    });

    /**
     * GET /student/payments/:id
     */
    getPaymentById = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const { id } = req.params;
        const result = await this.paymentService.getPaymentById(id, req.user.id);

        const response = instanceToPlain(
            plainToInstance(GetPaymentDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết payment thành công", 200, req.requestId)
        );
    });

    /**
     * GET /student/payments
     */
    getPaymentList = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw AppError.unauthorizedError("Chưa xác thực");
        }

        const { page = 1, limit = 10 } = req.query;
        const result = await this.paymentService.getPaymentList(
            req.user.id,
            Number(page),
            Number(limit)
        );

        const response = instanceToPlain(
            plainToInstance(GetPaymentListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách payments thành công", 200, req.requestId)
        );
    });

    /**
     * POST /webhooks/momo/ipn (PUBLIC - không cần auth)
     */
    handleMoMoIPN = asyncHandler(async (req: Request, res: Response) => {
        const ipnData = req.body;
        const result = await this.paymentService.handleMoMoIPN(ipnData);

        const response = instanceToPlain(
            plainToInstance(MoMoIPNResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(response); // MoMo yêu cầu response đơn giản
    });
}

export default PaymentController;
