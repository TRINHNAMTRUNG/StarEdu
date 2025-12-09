import { z } from "zod";

const envSchema = z.object({
    PORT: z.string().regex(/^\d+$/),
    ORIGIN: z.string().url(),
    NODE_ENV: z.string().min(1),

    DB_NAME: z.string().min(1),
    DB_URI: z.string().url(),

    AT_SECRET: z.string().min(10),
    RT_SECRET: z.string().min(10),
    AT_EXPIRES_IN: z.string().min(1),
    RT_EXPIRES_IN: z.string().min(1),

    // TWILIO_ACCOUNT_SID: z.string().min(1),
    // TWILIO_AUTH_TOKEN: z.string().min(1),
    // TWILIO_PHONE_NUMBER: z.string().regex(/^\+84\d{9}$/),
    // TWILIO_VERIFY_SERVICE_SID: z.string().min(1),

    INFOBIP_API_KEY: z.string().min(1),
    INFOBIP_BASE_URL: z.string().url(),
    INFOBIP_APP_ID: z.string().min(1),
    INFOBIP_MSG_ID: z.string().min(1),

    // --- THÔNG TIN GOOGLE GEMINI ---
    GEMINI_API_KEY: z.string().min(1),

    // --- THÔNG TIN YOUTUBE DATA API v3
    YOUTUBE_API_KEY: z.string().min(1),

    // --- THÔNG TIN GOOGLE CLOUD TRANSLATE
    GOOGLE_CLOUD_CREDENTIALS_JSON: z.string().min(1),

    // --- THÔNG TIN AZURE SPEECH (TTS) ---
    AZURE_SPEECH_KEY: z.string().min(1),
    AZURE_SPEECH_REGION: z.string().min(1),
    AZURE_SPEECH_ENDPOINT: z.string().url(),

    // --- THÔNG TIN OPENAI (WHISPER + GPT-4) ---
    OPENAI_API_KEY: z.string().min(1),

    // --- THÔNG TIN AMAZON S3 (LƯU TRỮ AUDIO) ---
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_S3_BUCKET_NAME: z.string().min(1),
    AWS_S3_REGION: z.string().min(1),

    // --- THÔNG TIN MOMO PAYMENT ---
    MOMO_ACCESS_KEY: z.string().min(1),
    MOMO_SECRET_KEY: z.string().min(1),

    // --- URLs ---
    FRONTEND_URL: z.string().url(),
    BACKEND_URL: z.string().url(),

    // --- THÔNG TIN SPEEDSMS ---
    SPEEDSMS_ACCESS_TOKEN: z.string().min(1),
    SPEEDSMS_APP_ID: z.string().min(1),

    //--- THÔNG TIN FIREBASE ---        
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_PRIVATE_KEY: z.string().min(1),
    FIREBASE_CLIENT_EMAIL: z.string().min(1),
    FIREBASE_API_KEY: z.string().min(1),

    // --- reCAPTCHA secret for server-side verification ---
    RECAPTCHA_SECRET_KEY: z.string().min(1),
    RECAPTCHA_SITE_KEY: z.string().min(1),
    RECAPTCHA_API_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse({
    PORT: process.env.PORT,
    ORIGIN: process.env.ORIGIN,
    NODE_ENV: process.env.NODE_ENV,

    DB_NAME: process.env.DB_NAME,
    DB_URI: process.env.DB_URI,

    AT_SECRET: process.env.AT_SECRET,
    AT_EXPIRES_IN: process.env.AT_EXPIRES_IN,
    RT_SECRET: process.env.RT_SECRET,
    RT_EXPIRES_IN: process.env.RT_EXPIRES_IN,

    INFOBIP_API_KEY: process.env.INFOBIP_API_KEY,
    INFOBIP_BASE_URL: process.env.INFOBIP_BASE_URL,
    INFOBIP_APP_ID: process.env.INFOBIP_APP_ID,
    INFOBIP_MSG_ID: process.env.INFOBIP_MSG_ID,

    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    GOOGLE_CLOUD_CREDENTIALS_JSON: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON,

    AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
    AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION,
    AZURE_SPEECH_ENDPOINT: process.env.AZURE_SPEECH_ENDPOINT,

    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    AWS_S3_REGION: process.env.AWS_S3_REGION,

    MOMO_ACCESS_KEY: process.env.MOMO_ACCESS_KEY,
    MOMO_SECRET_KEY: process.env.MOMO_SECRET_KEY,

    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,

    SPEEDSMS_ACCESS_TOKEN: process.env.ACCESS_TOKEN_SPEEDSMS,
    SPEEDSMS_APP_ID: process.env.SPEEDSMS_APP_ID,

    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,

    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
    RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
    RECAPTCHA_API_KEY: process.env.RECAPTCHA_API_KEY,
});

if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.format());
    process.exit(1);
}

export const ENV = parsed.data;

