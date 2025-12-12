import { injectable } from "tsyringe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { ENV } from "../config/environment";
import AppError from "../utils/AppError";

@injectable()
class FirebaseAuthService {
    private auth: ReturnType<typeof getAuth>;

    constructor() {
        if (getApps().length === 0) {
            initializeApp({
                credential: cert({
                    projectId: ENV.FIREBASE_PROJECT_ID,
                    privateKey: ENV.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                    clientEmail: ENV.FIREBASE_CLIENT_EMAIL
                })
            });
        }

        this.auth = getAuth();
    }

    /**
     * XÁC THỰC FIREBASE ID TOKEN (phía server)
     * Trả về token đã giải mã nếu hợp lệ, throw AppError.unauthorizedError nếu token không hợp lệ.
     */
    async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
        try {
            if (!idToken) throw AppError.unauthorizedError("Missing Firebase ID token");
            const decoded = await this.auth.verifyIdToken(idToken);
            // decoded chứa uid và phone_number cùng các claims khác
            return decoded;
        } catch (err: any) {
            console.error("❌ [FirebaseAuth] verifyIdToken error:", err?.message || err);
            throw AppError.unauthorizedError("Firebase ID token không hợp lệ");
        }
    }
}

export default FirebaseAuthService;