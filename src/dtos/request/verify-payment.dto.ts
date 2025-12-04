import { IsMongoId, IsOptional, IsString } from "class-validator";
import { Expose } from "class-transformer";

// POST /student/payments/:id/verify
export class VerifyPaymentParamDto {
    @IsMongoId({ message: "ID không hợp lệ" })
    id!: string;
}

export class VerifyPaymentQueryDto {
    @IsOptional()
    @IsString()
    resultCode?: string;

    @IsOptional()
    @IsString()
    orderId?: string;
}

// Response
export class VerifyPaymentResDto {
    @Expose()
    payment_id!: string;

    @Expose()
    status!: string;

    @Expose()
    message!: string;

    @Expose()
    enrollment_id?: string;
}
