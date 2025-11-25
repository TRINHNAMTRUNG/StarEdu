import { injectable } from "tsyringe";
import PaymentModel from "../models/payment.model";
import EnrollmentModel from "../models/enrollment.model";
import RoadmapModel from "../models/roadmap.model";
import StudentModel from "../models/student.model";
import AppError from "../utils/AppError";
import { PaymentGateway, PaymentStatus, MoMoIPNData } from "../types/payment.types";
import crypto from "crypto";
import axios from "axios";
import { ENV } from "../config/environment";

@injectable()
class PaymentService {
    /**
     * CREATE PAYMENT
     */
    async createPayment(studentId: string, roadmapId: string, gateway: PaymentGateway, redirectUrl?: string) {
        const student = await StudentModel.findOne({ user: studentId });
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        // ✅ FIX: lean() với generic type
        const roadmap = await RoadmapModel.findById(roadmapId).lean<{
            _id: any;
            title: string;
            thumbnail?: string;
            is_published: boolean;
            discount_price?: number;
            price: number;
        }>();

        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        if (!roadmap.is_published) {
            throw AppError.badRequestError("Roadmap chưa được publish");
        }

        const existingEnrollment = await EnrollmentModel.findOne({
            student: student._id,
            roadmap: roadmapId
        });

        if (existingEnrollment) {
            throw AppError.conflictError("Bạn đã đăng ký roadmap này rồi");
        }

        const amount = roadmap.discount_price || roadmap.price;
        const orderId = `${gateway.toUpperCase()}_${Date.now()}`;

        const payment = await PaymentModel.create({
            student: student._id,
            roadmap: roadmapId,
            amount,
            gateway: gateway,
            status: "pending",
            order_id: orderId
        });

        let paymentUrl: string;

        switch (gateway) {
            case PaymentGateway.MOMO:
                paymentUrl = await this.createMoMoPayment(payment._id.toString(), roadmap, amount, orderId, redirectUrl);
                break;
            case PaymentGateway.VNPAY:
                paymentUrl = await this.createVNPayPayment(payment._id.toString(), roadmap, amount, orderId, redirectUrl);
                break;
            case PaymentGateway.ZALOPAY:
                paymentUrl = await this.createZaloPayPayment(payment._id.toString(), roadmap, amount, orderId, redirectUrl);
                break;
            default:
                throw AppError.badRequestError("Gateway không được hỗ trợ");
        }

        return {
            payment_id: payment._id.toString(),
            gateway: payment.gateway,
            amount: payment.amount,
            status: payment.status,
            payment_url: paymentUrl,
            order_id: payment.order_id
        };
    }

    /**
     * MOMO - Create payment
     */
    private async createMoMoPayment(
        paymentId: string,
        roadmap: { title: string;[key: string]: any }, // ✅ Type-safe roadmap
        amount: number,
        orderId: string,
        redirectUrl?: string
    ): Promise<string> {
        const accessKey = ENV.MOMO_ACCESS_KEY;
        const secretKey = ENV.MOMO_SECRET_KEY;
        const partnerCode = "MOMO";
        const orderInfo = `Thanh toán roadmap: ${roadmap.title}`;
        const defaultRedirectUrl = `${ENV.FRONTEND_URL}/payment/result`;
        const ipnUrl = `${ENV.BACKEND_URL}/webhooks/momo/ipn`;
        const requestId = orderId;
        const requestType = "payWithMethod";
        const extraData = paymentId;
        const autoCapture = true;
        const lang = "vi";

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl || defaultRedirectUrl}&requestId=${requestId}&requestType=${requestType}`;

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(rawSignature)
            .digest("hex");

        const requestBody = {
            partnerCode,
            storeId: "MomoTestStore",
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl: redirectUrl || defaultRedirectUrl,
            ipnUrl,
            requestType,
            extraData,
            autoCapture,
            lang,
            signature
        };

        try {
            const response = await axios.post(
                "https://test-payment.momo.vn/v2/gateway/api/create",
                requestBody,
                { headers: { "Content-Type": "application/json" } }
            );

            if (response.data.resultCode !== 0) {
                throw AppError.badRequestError(`MoMo error: ${response.data.message}`);
            }

            return response.data.payUrl;
        } catch (error: any) {
            console.error("MoMo API Error:", error);
            throw AppError.internalServerError("Lỗi kết nối MoMo", error.message);
        }
    }

    private async createVNPayPayment(
        paymentId: string,
        roadmap: { title: string;[key: string]: any },
        amount: number,
        orderId: string,
        redirectUrl?: string
    ): Promise<string> {
        throw AppError.badRequestError("VNPay chưa được hỗ trợ");
    }

    private async createZaloPayPayment(
        paymentId: string,
        roadmap: { title: string;[key: string]: any },
        amount: number,
        orderId: string,
        redirectUrl?: string
    ): Promise<string> {
        throw AppError.badRequestError("ZaloPay chưa được hỗ trợ");
    }

    /**
     * MOMO IPN
     */
    async handleMoMoIPN(ipnData: MoMoIPNData) {
        const accessKey = ENV.MOMO_ACCESS_KEY;
        const secretKey = ENV.MOMO_SECRET_KEY;

        const rawSignature = `accessKey=${accessKey}&amount=${ipnData.amount}&extraData=${ipnData.extraData}&message=${ipnData.message}&orderId=${ipnData.orderId}&orderInfo=${ipnData.orderInfo}&orderType=${ipnData.orderType}&partnerCode=${ipnData.partnerCode}&payType=${ipnData.payType}&requestId=${ipnData.requestId}&responseTime=${ipnData.responseTime}&resultCode=${ipnData.resultCode}&transId=${ipnData.transId}`;

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(rawSignature)
            .digest("hex");

        if (signature !== ipnData.signature) {
            throw AppError.badRequestError("Invalid signature");
        }

        const paymentId = ipnData.extraData;
        const payment = await PaymentModel.findById(paymentId);

        if (!payment) {
            throw AppError.notFoundError("Payment không tồn tại");
        }

        if (ipnData.resultCode === 0) {
            payment.status = "success"; // ✅ Literal string
            payment.transaction_id = ipnData.transId;
            payment.payment_date = new Date();
            await payment.save();

            await this.createEnrollment(payment);

            return { status: "success", message: "Payment processed successfully" };
        } else {
            payment.status = "failed"; // ✅ Literal string
            await payment.save();

            return { status: "failed", message: ipnData.message };
        }
    }

    /**
     * CREATE ENROLLMENT sau khi payment success
     */
    private async createEnrollment(payment: any) {
        const student = await StudentModel.findById(payment.student);
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        const existingEnrollment = await EnrollmentModel.findOne({
            student: student._id,
            roadmap: payment.roadmap
        });

        if (existingEnrollment) {
            console.warn(`Enrollment already exists for payment ${payment._id}`);
            return existingEnrollment;
        }

        // ✅ FIX: Tạo enrollment đúng schema model
        const enrollment = await EnrollmentModel.create({
            student: student._id,
            roadmap: payment.roadmap,
            payment_id: payment._id, // ✅ Thêm payment_id (required trong model)
            enrolled_date: new Date(), // ✅ enrolled_date (không phải enrollment_date)
            enrolled_by: "momo", // ✅ enrolled_by (EnrolledBy enum)
            status: "active", // ✅ status (EnrollmentStatus enum)
            enrolled_price: payment.amount, // ✅ Match model
            completion_percentage: 0 // ✅ Match model
            // last_accessed: không set (optional)
            // expire_date: không set (optional)
            // certificate: không set (optional)
        });

        return enrollment;
    }

    /**
     * GET PAYMENT BY ID
     */
    async getPaymentById(paymentId: string, studentId: string) {
        // ✅ FIX: Đổi interface sang type annotation
        interface PopulatedPayment {
            _id: any;
            student: any;
            roadmap: {
                _id: any;
                title: string;
            };
            amount: number;
            gateway: string;
            status: string;
            order_id: string;
            transaction_id?: string;
            payment_date?: Date;
            createdAt: Date;
            updatedAt: Date;
        }

        const payment = await PaymentModel.findById(paymentId)
            .populate("roadmap", "title")
            .lean() as PopulatedPayment | null;

        if (!payment) {
            throw AppError.notFoundError("Payment không tồn tại");
        }

        const student = await StudentModel.findOne({ user: studentId });
        if (!student || payment.student.toString() !== student._id.toString()) {
            throw AppError.forbiddenError("Bạn không có quyền truy cập payment này");
        }

        return {
            _id: payment._id.toString(),
            student_id: payment.student.toString(),
            roadmap_id: payment.roadmap._id.toString(),
            roadmap_title: payment.roadmap.title,
            amount: payment.amount,
            gateway: payment.gateway,
            status: payment.status,
            order_id: payment.order_id,
            transaction_id: payment.transaction_id,
            payment_date: payment.payment_date,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt
        };
    }

    /**
     * GET PAYMENT LIST
     */
    async getPaymentList(studentId: string, page: number = 1, limit: number = 10) {
        const student = await StudentModel.findOne({ user: studentId });
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        // ✅ FIX: Type annotation cho populated array
        interface PopulatedPayment {
            _id: any;
            roadmap: {
                _id: any;
                title: string;
            };
            amount: number;
            gateway: string;
            status: string;
            createdAt: Date;
        }

        const [total, payments] = await Promise.all([
            PaymentModel.countDocuments({ student: student._id }),
            PaymentModel.find({ student: student._id })
                .populate("roadmap", "title")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean() as unknown as Promise<PopulatedPayment[]>
        ]);

        const data = payments.map(p => ({
            _id: p._id.toString(),
            roadmap_title: p.roadmap.title,
            amount: p.amount,
            gateway: p.gateway,
            status: p.status,
            createdAt: p.createdAt
        }));

        return { total, page, limit, data };
    }
}

export default PaymentService;
