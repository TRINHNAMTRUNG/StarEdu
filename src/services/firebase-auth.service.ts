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
     * VERIFY FIREBASE ID TOKEN (server-side)
     * Returns decoded token if valid, throws AppError.unauthorizedError on invalid token.
     */
    async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
        try {
            if (!idToken) throw AppError.unauthorizedError("Missing Firebase ID token");
            const decoded = await this.auth.verifyIdToken(idToken);
            // decoded contains uid and phone_number among other claims
            return decoded;
        } catch (err: any) {
            console.error("❌ [FirebaseAuth] verifyIdToken error:", err?.message || err);
            throw AppError.unauthorizedError("Firebase ID token không hợp lệ");
        }
    }
}

export default FirebaseAuthService;