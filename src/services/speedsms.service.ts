import axios from "axios";
import { injectable } from "tsyringe";
import { ENV } from "../config/environment";
import AppError from "../utils/AppError";

/**
 * SpeedSmsService - dùng API 2FA của SpeedSMS (theo docs chính thức)
 * - sendOTP(phone): gọi /index.php/pin/create -> trả về tranId/pinId (lưu vào account.pinId nếu muốn)
 * - verifyOTP(phone, pin): gọi /index.php/pin/verify với phone + pin_code + app_id -> trả về boolean
 *
 * LƯU Ý:
 * - sender KHÔNG bắt buộc cho 2FA API: nếu không cấu hình app sẽ dùng sender mặc định.
 * - Bắt buộc phải set ENV.SPEEDSMS_ACCESS_TOKEN và ENV.SPEEDSMS_APP_ID
 */

@injectable()
class SpeedSmsService {
    // base url chính thức
    private apiBase = "https://api.speedsms.vn";
    private accessToken = ENV.SPEEDSMS_ACCESS_TOKEN;

    private authHeader() {
        return "Basic " + Buffer.from(`${this.accessToken}:x`).toString("base64");
    }

    /**
     * Gọi API tạo PIN (Send OTP)
     * Request body theo docs: { to, content, app_id }
     * content cần chứa placeholder {pin_code} để SpeedSMS thay thế mã do họ tạo
     * Trả về tranId/pinId (string) – backend có thể lưu vào account.pinId (tùy chọn).
     */
    async sendOTP(phone: string): Promise<string> {
        if (!this.accessToken) {
            throw AppError.internalServerError("SpeedSMS access token chưa cấu hình (ENV.SPEEDSMS_ACCESS_TOKEN).");
        }
        if (!ENV.SPEEDSMS_APP_ID) {
            throw AppError.internalServerError("SpeedSMS app_id chưa cấu hình (ENV.SPEEDSMS_APP_ID).");
        }

        const payload = {
            to: phone, // theo docs: "to": "0912345678"
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

            // Theo docs: success response chứa data.tranId và/hoặc data.pin_code.
            // Trả về tranId/pinId nếu có (dùng làm reference), nếu không có -> throw lỗi để caller biết
            if (data && data.status === "success" && data.data) {
                const id = data.data.tranId || data.data.pinId;
                if (id) return id;
                // Một số account/sample trả pin_code trực tiếp (test) nhưng không có tranId => không nên lưu rỗng
                // Trường hợp này trả về empty string gây caller xử lý (hoặc có thể return pin_code ở dev mode)
                console.warn("SpeedSMS.create returned success but no tranId/pinId; data:", data.data);
                return data.data.tranId || data.data.pin_code || "";
            }

            // Xử lý lỗi từ API
            console.error("SpeedSMS sendOTP failed:", data);
            throw AppError.badRequestError("Không gửi được mã OTP qua SpeedSMS.");
        } catch (err: any) {
            // Nếu rate limit -> truyền thông tin reset (X-Rate-Limit-Reset)
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

    /**
     * Verify OTP qua SpeedSMS service
     * Theo docs: gửi { phone, pin_code, app_id } và kiểm tra data.status === "success"
     */
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
            // data.status === 'success' => verified
            return data && data.status === "success";
        } catch (err: any) {
            // Xử lý rate-limit tương tự
            const resp = err?.response;
            if (resp && resp.status === 429) {
                const resetSec = resp.headers?.["x-rate-limit-reset"];
                console.error("SpeedSMS rate limit on verify:", resp.data || resetSec);
            }
            console.error("SpeedSMS API error (verifyOTP):", err?.response?.data || err?.message || err);
            return false;
        }
    }

    /* === Mock helpers (dev) === */
    async mockSendOTP(phone: string): Promise<string> {
        return `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    async mockVerifyOTP(phoneOrId: string, pin: string): Promise<boolean> {
        return pin === "123456" || pin === "000000";
    }
}

export default SpeedSmsService;
