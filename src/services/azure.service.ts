// src/services/azureService.ts

import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import AppError from "../utils/AppError"; // Giả định AppError được định nghĩa
import { ENV } from '../config/environment';

// LẤY CÁC BIẾN MÔI TRƯỜNG
const AZURE_SPEECH_KEY = ENV.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = ENV.AZURE_SPEECH_REGION;
const AWS_S3_BUCKET_NAME = ENV.AWS_S3_BUCKET_NAME;
const AWS_S3_REGION = ENV.AWS_S3_REGION;
const AWS_ACCESS_KEY_ID = ENV.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = ENV.AWS_SECRET_ACCESS_KEY;

// Khởi tạo S3 Client
const s3Client = new S3Client({
    region: AWS_S3_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID || '',
        secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
    }
});

// Đổi tên hàm thành getAzureTTS như trong service bạn cung cấp
export async function getAzureTTS(word: string, voiceCode: 'en-GB' | 'en-US'): Promise<string> {

    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION || !AWS_S3_BUCKET_NAME || !AWS_S3_REGION) {
        throw AppError.internalServerError('Missing configuration for Azure Speech or AWS S3.');
    }

    try {
        // 1. Cấu hình TTS và Gọi Azure Speech
        const voice = voiceCode === 'en-GB' ? 'en-GB-LibbyNeural' : 'en-US-JennyNeural';
        const ttsUrl = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voiceCode}">
                        <voice name="${voice}">${word}</voice>
                      </speak>`;

        const ttsResponse = await axios.post(ttsUrl, ssml, {
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
            },
            responseType: 'arraybuffer',
        });

        const audioBuffer = Buffer.from(ttsResponse.data);

        // 2. Tải lên Amazon S3
        const blobName = `audios/${word}/${word}_${voiceCode}_${uuidv4()}.mp3`;

        const command = new PutObjectCommand({
            Bucket: AWS_S3_BUCKET_NAME,
            Key: blobName,
            Body: audioBuffer,
            ContentType: 'audio/mp3',
            ACL: 'public-read',
        });

        await s3Client.send(command);

        // 3. Trả về URL công khai của S3
        return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${blobName}`;
    } catch (error) {
        throw AppError.internalServerError(`Failed to generate or upload audio for ${word}.`);
    }
}