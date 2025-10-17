
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

    // --- THÔNG TIN AZURE SPEECH (TTS) ---
    AZURE_SPEECH_KEY: z.string().min(1),
    AZURE_SPEECH_REGION: z.string().min(1),
    AZURE_SPEECH_ENDPOINT: z.string().url(),

    // --- THÔNG TIN AMAZON S3 (LƯU TRỮ AUDIO) ---
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_S3_BUCKET_NAME: z.string().min(1),
    AWS_S3_REGION: z.string().min(1)
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

    BUCKET_NAME: process.env.BUCKET_NAME,
    BUCKET_REGION: process.env.BUCKET_REGION,
    ACCESS_KEY_IAM: process.env.ACCESS_KEY_IAM,
    SECRET_ACCESS_KEY_IAM: process.env.SECRET_ACCESS_KEY_IAM,

    INFOBIP_API_KEY: process.env.INFOBIP_API_KEY,
    INFOBIP_BASE_URL: process.env.INFOBIP_BASE_URL,
    INFOBIP_APP_ID: process.env.INFOBIP_APP_ID,
    INFOBIP_MSG_ID: process.env.INFOBIP_MSG_ID,

    GEMINI_API_KEY: process.env.GEMINI_API_KEY,

    AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
    AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION,
    AZURE_SPEECH_ENDPOINT: process.env.AZURE_SPEECH_ENDPOINT,

    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    AWS_S3_REGION: process.env.AWS_S3_REGION,

    // TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    // TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    // TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    // TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID
});

if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.format());
    process.exit(1);
}

export const ENV = parsed.data;

