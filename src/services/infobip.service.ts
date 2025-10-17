import twilio from "twilio";
import { ENV } from "../config/environment";
import { injectable } from "tsyringe";
import axios from "axios";
import UserModel from "../models/user.model";

enum NcStatus {
    NC_DESTINATION_UNKNOWN = "NC_DESTINATION_UNKNOWN",
    NC_DESTINATION_REACHABLE = "NC_DESTINATION_REACHABLE",
    NC_DESTINATION_NOT_REACHABLE = "NC_DESTINATION_NOT_REACHABLE",
    NC_NOT_CONFIGURED = "NC_NOT_CONFIGURED"
}

enum SmsStatus {
    MESSAGE_SENT = "MESSAGE_SENT",
    MESSAGE_NOT_SENT = "MESSAGE_NOT_SENT"
}

enum PinError {
    PIN_NOT_VALID = "PIN_NOT_VALID",
    PIN_EXPIRED = "PIN_EXPIRED",
    PIN_ATTEMPTS_EXCEEDED = "PIN_ATTEMPTS_EXCEEDED",
    UNKNOWN = "UNKNOWN" // fallback cho case khác
}

export interface InfobipSendOtpResponse {
    callStatus?: string; // Trạng thái cuộc gọi (nếu gửi OTP qua voice). Ví dụ: "PENDING_ACCEPTED"
    ncStatus: NcStatus;
    pinId: string; // ID duy nhất của OTP, cần giữ lại để verify
    smsStatus: SmsStatus;
    to: string; // Số điện thoại nhận OTP, ví dụ: "84123456789"
}

export interface InfobipVerifyOtpResponse {
    attemptsRemaining: number; // số lần nhập PIN còn lại
    msisdn: string;            // số điện thoại (E.164 format, vd: +84966970854)
    pinError?: PinError;       // lỗi nếu có (optional)
    pinId: string;             // ID OTP đã gửi
    verified: boolean;         // true nếu verify thành công
}

@injectable()
class InfobipService {
    private baseUrl: string;
    private apiKey: string;
    private applicationId: string;
    private messageId: string;
    private mockStore: Map<string, string>;
    constructor() {
        this.baseUrl = ENV.INFOBIP_BASE_URL;
        this.apiKey = ENV.INFOBIP_API_KEY;
        this.applicationId = ENV.INFOBIP_APP_ID;
        this.messageId = ENV.INFOBIP_MSG_ID;
        this.mockStore = new Map<string, string>();
    }

    /**
     * Gửi OTP tới số điện thoại
     */
    sendOTP = async (toPhone: string): Promise<string> => {
        if (!toPhone) {
            throw new Error("Số điện thoại không hợp lệ");
        }
        // Gọi API Infobip để gửi OTP
        const response = await axios.post(
            `${this.baseUrl}/2fa/2/pin`,
            {
                applicationId: this.applicationId,
                messageId: this.messageId,
                from: "Infobip 2FA",
                to: toPhone,
            },
            {
                headers: {
                    Authorization: `App ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
            }
        );
        const data: InfobipSendOtpResponse = response.data;

        console.log("Kết quả gửi OTP:", data);
        // Kiểm tra kết quả trả về từ Infobip
        if (data.smsStatus !== SmsStatus.MESSAGE_SENT) {
            throw new Error("Không thể gửi OTP đến số điện thoại");
        }

        return data.pinId;
    }

    /**
     * Xác minh OTP do user nhập
     */
    verifyOTP = async (pinId: string, code: string) => {
        if (!pinId || !code) {
            throw new Error("OTP không hợp lệ");
        }
        // Gọi API Infobip để xác minh OTP https://pe2w83.api.infobip.com
        const response = await axios.post(
            `${this.baseUrl}/2fa/2/pin/${pinId}/verify`,
            { pin: code },
            {
                headers: {
                    Authorization: `App ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
            }
        );
        const data: InfobipVerifyOtpResponse = response.data;

        console.log("Kết quả xác minh:", data.verified);
        return data.verified;
    }

    /**
     * Giả lập gửi OTP: tạo pinId random và lưu code "123456"
     */
    mockSendOTP = async (toPhone: string): Promise<string> => {
        if (!toPhone) {
            throw new Error("Số điện thoại không hợp lệ");
        }

        const pinId = Math.random().toString(36).substring(2, 15); // fake pinId
        const code = "1234"; // fixed OTP để test
        this.mockStore.set(pinId, code);

        const fakeResponse: InfobipSendOtpResponse = {
            pinId,
            to: toPhone,
            ncStatus: NcStatus.NC_DESTINATION_REACHABLE,
            smsStatus: SmsStatus.MESSAGE_SENT,
        };

        console.log("Mock kết quả gửi OTP:", fakeResponse);
        return pinId;
    };

    /**
     * Giả lập verify OTP: chỉ thành công nếu code === "123456"
     */
    mockVerifyOTP = async (pinId: string, code: string): Promise<boolean> => {
        if (!pinId || !code) {
            throw new Error("OTP không hợp lệ");
        }

        const savedCode = this.mockStore.get(pinId);
        const verified = savedCode === code;

        const fakeResponse: InfobipVerifyOtpResponse = {
            pinId,
            msisdn: "84966970852", // fake số điện thoại
            attemptsRemaining: verified ? 3 : 2,
            verified,
            pinError: verified ? undefined : "PIN_NOT_VALID" as any,
        };

        console.log("Mock kết quả xác minh OTP:", fakeResponse);
        return verified;
    };
}

export default InfobipService;
