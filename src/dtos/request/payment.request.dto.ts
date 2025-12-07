import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentGateway } from "../../types/payment.types";

// POST /student/payments/create
export class CreatePaymentReqDto {
    @IsOptional()
    @IsMongoId()
    roadmap_id?: string; // Single roadmap (legacy support)

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    roadmap_ids?: string[]; // Multiple roadmaps (new)

    @IsNotEmpty()
    @IsEnum(PaymentGateway)
    gateway!: PaymentGateway;

    @IsOptional()
    @IsString()
    redirect_url?: string;
}

// POST /webhooks/momo/ipn
export class MoMoIPNReqDto {
    @IsNotEmpty()
    @IsString()
    partnerCode!: string;

    @IsNotEmpty()
    @IsString()
    orderId!: string;

    @IsNotEmpty()
    @IsString()
    requestId!: string;

    @IsNotEmpty()
    @IsNumber()
    amount!: number;

    @IsNotEmpty()
    @IsString()
    orderInfo!: string;

    @IsNotEmpty()
    @IsString()
    orderType!: string;

    @IsNotEmpty()
    @IsString()
    transId!: string;

    @IsNotEmpty()
    @IsNumber()
    resultCode!: number;

    @IsNotEmpty()
    @IsString()
    message!: string;

    @IsNotEmpty()
    @IsString()
    payType!: string;

    @IsNotEmpty()
    @IsNumber()
    responseTime!: number;

    @IsOptional()
    @IsString()
    extraData?: string;

    @IsNotEmpty()
    @IsString()
    signature!: string;
}

// Param validation
export class PaymentIdParamDto {
    @IsMongoId()
    id!: string;
}
