export enum PaymentGateway {
    MOMO = "momo",
    VNPAY = "vnpay",
    ZALOPAY = "zalopay"
}

export enum PaymentStatus {
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
    CANCELLED = "cancelled"
}

export interface MoMoCreatePaymentRequest {
    partnerCode: string;
    storeId: string;
    requestId: string;
    amount: number;
    orderId: string;
    orderInfo: string;
    redirectUrl: string;
    ipnUrl: string;
    requestType: string;
    extraData: string;
    items?: MoMoItem[];
    userInfo?: MoMoUserInfo;
    autoCapture: boolean;
    lang: string;
    signature: string;
}

export interface MoMoItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    quantity: number;
    totalPrice: number;
}

export interface MoMoUserInfo {
    name: string;
    phoneNumber: string;
    email: string;
}

export interface MoMoIPNData {
    partnerCode: string;
    orderId: string;
    requestId: string;
    amount: number;
    orderInfo: string;
    orderType: string;
    transId: string;
    resultCode: number;
    message: string;
    payType: string;
    responseTime: number;
    extraData: string;
    signature: string;
}
