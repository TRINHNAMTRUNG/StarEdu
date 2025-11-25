import { Expose } from "class-transformer";

// POST /student/payments/create
export class CreatePaymentResDto {
    @Expose()
    payment_id!: string;

    @Expose()
    gateway!: string;

    @Expose()
    amount!: number;

    @Expose()
    status!: string;

    @Expose()
    payment_url!: string; // URL redirect đến cổng thanh toán

    @Expose()
    order_id!: string;
}

// GET /student/payments/:id
export class GetPaymentDetailResDto {
    @Expose()
    _id!: string;

    @Expose()
    student_id!: string;

    @Expose()
    roadmap_id!: string;

    @Expose()
    roadmap_title!: string;

    @Expose()
    amount!: number;

    @Expose()
    gateway!: string;

    @Expose()
    status!: string;

    @Expose()
    order_id!: string;

    @Expose()
    transaction_id?: string;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

// GET /student/payments (list)
export class PaymentListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    roadmap_title!: string;

    @Expose()
    amount!: number;

    @Expose()
    gateway!: string;

    @Expose()
    status!: string;

    @Expose()
    createdAt!: Date;
}

export class GetPaymentListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    data!: PaymentListItemResDto[];
}

// POST /webhooks/momo/ipn
export class MoMoIPNResDto {
    @Expose()
    status!: string;

    @Expose()
    message!: string;
}
