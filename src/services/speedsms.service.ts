// ============================================================================
// DEPRECATED: SpeedSMS service đã được thay thế bằng Firebase Authentication
// File này được giữ lại để tham khảo, toàn bộ code đã được comment
// ============================================================================

/*
import axios from "axios";
import { injectable } from "tsyringe";
import { ENV } from "../config/environment";
import AppError from "../utils/AppError";

@injectable()
class SpeedSmsService {
    private apiBase = "https://api.speedsms.vn";
    private accessToken = ENV.SPEEDSMS_ACCESS_TOKEN;

    private authHeader() {
        return "Basic " + Buffer.from(`${this.accessToken}:x`).toString("base64");
    }

    async sendOTP(phone: string): Promise<string> {
        if (!this.accessToken) {
            throw AppError.internalServerError("SpeedSMS access token chưa cấu hình (ENV.SPEEDSMS_ACCESS_TOKEN).");
        }
        if (!ENV.SPEEDSMS_APP_ID) {
            throw AppError.internalServerError("SpeedSMS app_id chưa cấu hình (ENV.SPEEDSMS_APP_ID).");
        }

        const payload = {
            to: phone,
            content: "Mã OTP của bạn: {pin_code}. Mã có hiệu lực trong 3 phút.",
            app_id: ENV.SPEEDSMS_APP_ID,
            sender: "Notify"
        };

        try {
            const res = await axios.post(`${this.apiBase}/index.php/pin/create`, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader()
                },
                timeout: 15000
            });

            const data = res.data;

            if (data && data.status === "success" && data.data) {
                const id = data.data.tranId || data.data.pinId;
                if (id) return id;
                console.warn("SpeedSMS.create returned success but no tranId/pinId; data:", data.data);
                return data.data.tranId || data.data.pin_code || "";
            }

            console.error("SpeedSMS sendOTP failed:", data);
            throw AppError.badRequestError("Không gửi được mã OTP qua SpeedSMS.");
        } catch (err: any) {
            const resp = err?.response;
            if (resp && resp.status === 429) {
                const resetSec = resp.headers?.["x-rate-limit-reset"];
                const msg = resetSec ? `Rate limit exceeded. Retry after ${resetSec}s` : "Rate limit exceeded.";
                console.error("SpeedSMS rate limit:", resp.data || msg);
                throw AppError.internalServerError(msg);
            }

            console.error("SpeedSMS API error (sendOTP):", err?.response?.data || err?.message || err);
            throw AppError.internalServerError("Lỗi khi gửi OTP qua SpeedSMS.");
        }
    }

    async verifyOTP(phone: string, pin: string): Promise<boolean> {
        if (!this.accessToken) {
            console.error("SpeedSMS verifyOTP called but access token missing");
            return false;
        }
        if (!ENV.SPEEDSMS_APP_ID) {
            console.error("SpeedSMS verifyOTP called but app_id missing");
            return false;
        }

        try {
            const payload = { phone, pin_code: pin, app_id: ENV.SPEEDSMS_APP_ID };

            const res = await axios.post(`${this.apiBase}/index.php/pin/verify`, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader()
                },
                timeout: 15000
            });

            const data = res.data;
            return data && data.status === "success";
        } catch (err: any) {
            const resp = err?.response;
            if (resp && resp.status === 429) {
                const resetSec = resp.headers?.["x-rate-limit-reset"];
                console.error("SpeedSMS rate limit on verify:", resp.data || resetSec);
            }
            console.error("SpeedSMS API error (verifyOTP):", err?.response?.data || err?.message || err);
            return false;
        }
    }

    async mockSendOTP(phone: string): Promise<string> {
        return `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    async mockVerifyOTP(phoneOrId: string, pin: string): Promise<boolean> {
        return pin === "123456" || pin === "000000";
    }
}

export default SpeedSmsService;
*/

// Stub export để tránh lỗi import
export default class SpeedSmsService {}

