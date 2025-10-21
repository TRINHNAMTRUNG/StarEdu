// src/services/azureService.ts
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import AppError from "../utils/AppError";
import { ENV } from "../config/environment";
import { uploadToS3 } from "../config/s3";

const {
    AZURE_SPEECH_KEY,
    AZURE_SPEECH_REGION,
    AZURE_SPEECH_ENDPOINT,
    AWS_S3_BUCKET_NAME,
    AWS_S3_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
} = ENV;


// -------------------- TOKEN CACHE --------------------
let cachedToken: string | null = null;
let tokenExpireAt = 0;

/**
 * Lấy access token từ Azure Speech (có cache 9 phút)
 */
async function getAzureAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && now < tokenExpireAt) {
        return cachedToken!;
    }

    try {
        const res = await axios.post(
            `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
            null,
            {
                headers: { "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY },
            }
        );

        cachedToken = res.data as string;
        tokenExpireAt = now + 9 * 60 * 1000;
        console.log("🔑 Fetched new Azure Speech token");
        return cachedToken;
    } catch (error) {
        console.error("Failed to get Azure access token:", error);
        throw AppError.internalServerError("Không thể lấy access token từ Azure Speech.");
    }
}

/**
 * Sinh file âm thanh TTS từ Azure Speech và upload lên AWS S3
 * @param word - Từ cần phát âm
 * @param voiceCode - Mã giọng nói ("en-GB" | "en-US")
 * @returns URL file mp3 trên S3
 */
export async function getAzureTTS(word: string, voiceCode: "en-GB" | "en-US"): Promise<string> {
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION || !AWS_S3_BUCKET_NAME || !AWS_S3_REGION) {
        throw AppError.internalServerError("Thiếu cấu hình cho Azure Speech hoặc AWS S3.");
    }

    try {
        // 1️ Lấy token hợp lệ
        const token = await getAzureAccessToken();

        // 2️ Cấu hình giọng nói & endpoint
        const voice = voiceCode === "en-GB" ? "en-GB-LibbyNeural" : "en-US-JennyNeural";
        const ttsUrl = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

        // 3️ Tạo SSML nội dung đọc
        const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voiceCode}">
        <voice name="${voice}">${word}</voice>
      </speak>`.trim();

        // 4️ Gọi API TTS của Azure
        const ttsResponse = await axios.post(ttsUrl, ssml, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
            },
            responseType: "arraybuffer",
        });

        const audioBuffer = Buffer.from(ttsResponse.data);

        // Tạo key với cấu trúc: audios/vocabulary/{word}_{voiceCode}_{uuid}.mp3
        const blobName = `audios/vocabulary/${word}_${voiceCode}_${uuidv4()}.mp3`;

        // Upload lên S3 sử dụng config chung
        const s3Url = await uploadToS3(blobName, audioBuffer, "audio/mp3");

        console.log(`TTS created and uploaded: ${s3Url}`);

        return s3Url;
    } catch (error: any) {
        console.error(`Azure TTS Error for "${word}":`, error?.response?.data || error);
        throw AppError.internalServerError(`Không thể tạo hoặc tải lên âm thanh cho "${word}".`);
    }
}
