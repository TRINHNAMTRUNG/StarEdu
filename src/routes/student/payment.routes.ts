import { Router } from "express";
import { container } from "tsyringe";
import PaymentController from "../../controllers/payment.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import { CreatePaymentReqDto, PaymentIdParamDto } from "../../dtos/request/payment.request.dto";

const studentPaymentRoutes = Router();
const paymentController = container.resolve(PaymentController);

// All routes require STUDENT auth
studentPaymentRoutes.use(authenticateToken, authorizeRoles(UserRole.STUDENT));

/**
 * 1. POST /student/payments/create
 * Mục đích: Tạo record Payment trên hệ thống và nhận payment_url trả về từ gateway (MoMo/VNPay/ZaloPay).
 * Input (body): { roadmap_id: string (MongoId), gateway: PaymentGateway, redirect_url?: string }
 * Output (200/201): { payment_id, gateway, amount, status: "pending", payment_url, order_id }
 * Ghi chú:
 *  - Controller gọi PaymentService.createPayment: validate student, roadmap (phải tồn tại & published), kiểm tra chưa enroll, tạo Payment (pending) rồi gọi gateway API.
 *  - UI flow: frontend gọi endpoint này, nhận payment_url → redirect user tới trang thanh toán gateway.
 *  - Recommendation: giữ endpoint; đảm bảo middleware auth+role đúng; validate DTO.
 */
studentPaymentRoutes.post(
    "/create",
    validationBody(CreatePaymentReqDto),
    paymentController.createPayment
);

/**
 * 2. GET /student/payments
 * Mục đích: Lấy danh sách payments history của student (pagination).
 * Input (query): page, limit
 * Output: { total, page, limit, data: [{ _id, roadmap_title, amount, gateway, status, createdAt }, ...] }
 * Ghi chú:
 *  - Controller gọi PaymentService.getPaymentList(studentId,...).
 *  - Dùng để hiển thị lịch sử thanh toán cho student sau khi login.
 *  - Recommendation: giữ; frontend có thể sử dụng để kiểm tra trạng thái sau redirect.
 */
studentPaymentRoutes.get("/", paymentController.getPaymentList);

/**
 * 3. GET /student/payments/:id
 * Mục đích: Lấy chi tiết 1 payment (status, transaction_id, roadmap info).
 * Input (path): id (paymentId)
 * Output: { _id, student_id, roadmap_id, roadmap_title, amount, gateway, status, order_id, transaction_id?, payment_date?, createdAt }
 * Ghi chú:
 *  - Controller gọi PaymentService.getPaymentById(id, studentId) và kiểm tra quyền (payment.student must match).
 *  - Useful: frontend dùng sau redirect để verify kết quả thanh toán/hiển thị thông báo.
 *  - Recommendation: giữ; bảo đảm validationParams và quyền truy cập chặt (student chỉ xem payment của chính họ).
 */
studentPaymentRoutes.get(
    "/:id",
    validationParams(PaymentIdParamDto),
    paymentController.getPaymentById
);

export default studentPaymentRoutes;
