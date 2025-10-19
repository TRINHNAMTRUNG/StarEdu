import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";
import { Buffer } from "buffer"; // Cần import Buffer trong môi trường Node.js/TS
import AppError from "../utils/AppError";
import { ENV } from "../config/environment";

const { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } = ENV;

// =======================================================
// 1. Hàm tiện ích: Chuyển Buffer WAV sang Stream cho SDK
// =======================================================

/**
 * Chuyển đổi Buffer Audio thô thành PullAudioInputStreamCallback cho Speech SDK.
 * SDK sẽ đọc Buffer này theo từng khối (chunk).
 * @param audioBuffer - Buffer chứa dữ liệu audio (dạng WAV/PCM).
 * @returns AudioConfig đã được cấu hình từ luồng đầu vào.
 */
function bufferToAudioConfig(audioBuffer: Buffer): speechsdk.AudioConfig {
    let position = 0;

    const pullStreamCallback: speechsdk.PullAudioInputStreamCallback = {
        read: (bufferSdk: ArrayBuffer): number => {
            const bufferSdkView = new Uint8Array(bufferSdk);
            const bytesRemaining = audioBuffer.length - position;
            const bytesToRead = Math.min(bufferSdk.byteLength, bytesRemaining);

            // Sao chép dữ liệu từ Buffer Node.js vào ArrayBuffer của SDK
            if (bytesToRead > 0) {
                for (let i = 0; i < bytesToRead; i++) {
                    bufferSdkView[i] = audioBuffer[position + i];
                }
                position += bytesToRead;
                return bytesToRead;
            }
            return 0;
        },
        close: (): void => {
            // Cleanup logic
        }
    };

    // Cấu hình định dạng Audio đầu vào (WAV/PCM 16kHz, 16bit, mono)
    const audioFormat = speechsdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);

    // Tạo PullStream
    const pullStream = speechsdk.AudioInputStream.createPullStream(pullStreamCallback, audioFormat);

    // Tạo AudioConfig từ PullStream
    return speechsdk.AudioConfig.fromStreamInput(pullStream);
}


// =======================================================
// 2. Hàm Chính: Chấm điểm Phát âm
// =======================================================

/**
 * Thực hiện Đánh giá Phát âm bằng Azure Speech SDK.
 * @param audioBuffer - Buffer Audio (WAV) nhận từ Frontend.
 * @param referenceText - Văn bản mẫu mà người dùng cần đọc.
 * @returns Promise<any> chứa kết quả JSON chấm điểm chi tiết.
 */
export async function assessPronunciation(
    audioBuffer: Buffer,
    referenceText: string,
): Promise<any> {
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
        throw AppError.internalServerError("Thiếu cấu hình Azure Speech (Key/Region).");
    }

    // 3. Cấu hình Speech Service (SDK tự quản lý token)
    const speechConfig = speechsdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION
    );
    speechConfig.speechRecognitionLanguage = "en-US";

    // Khởi tạo AudioConfig từ Buffer Audio
    const audioConfig = bufferToAudioConfig(audioBuffer);

    // 4. Cấu hình Pronunciation Assessment
    const pronunciationConfig = new speechsdk.PronunciationAssessmentConfig(
        referenceText,
        speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
        speechsdk.PronunciationAssessmentGranularity.Phoneme,
        true // Enable miscue
    );
    // Tùy chọn: Đặt độ chi tiết phoneme để có kết quả chính xác hơn
    // pronunciationConfig.phonemeAlphabet = "IPA"; 
    // pronunciationConfig.nbestPhonemeCount = 3; 

    // 5. Tạo Recognizer và áp dụng cấu hình
    const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationConfig.applyTo(recognizer);

    // 6. Chạy nhận dạng và đợi kết quả (sử dụng Promise để quản lý bất đồng bộ)
    return new Promise<any>((resolve, reject) => {
        // Đặt timeout nếu cần (ví dụ: 30 giây)
        const timeout = setTimeout(() => {
            recognizer.close();
            reject(AppError.internalServerError("Dịch vụ Azure không phản hồi trong thời gian quy định."));
        }, 30000);

        // Sự kiện khi nhận dạng thành công hoặc không khớp
        recognizer.recognized = (_s: any, e: speechsdk.SpeechRecognitionEventArgs): void => {
            clearTimeout(timeout);
            recognizer.close();

            if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
                const assessmentJson = e.result.properties.getProperty(
                    speechsdk.PropertyId.SpeechServiceResponse_JsonResult
                );
                resolve(JSON.parse(assessmentJson || "{}"));
            } else if (e.result.reason === speechsdk.ResultReason.NoMatch) {
                reject(AppError.badRequestError("Không nhận dạng được giọng nói hoặc chất lượng âm thanh quá kém."));
            } else {
                reject(AppError.internalServerError("Lỗi không xác định trong quá trình nhận dạng."));
            }
        };

        // Sự kiện khi bị hủy (lỗi kết nối, lỗi server,...)
        recognizer.canceled = (_s: any, e: speechsdk.SpeechRecognitionCanceledEventArgs): void => {
            clearTimeout(timeout);
            recognizer.close();
            const cancellation = speechsdk.CancellationDetails.fromResult((e as any).result);
            reject(AppError.internalServerError(`Yêu cầu bị hủy: ${cancellation.errorDetails}`));
        };

        // Bắt đầu nhận dạng từ luồng/stream đã tạo
        recognizer.recognizeOnceAsync(
            (): void => { },
            (error: string): void => {
                clearTimeout(timeout);
                recognizer.close();
                reject(AppError.internalServerError(`Lỗi khi gọi Azure SDK: ${error}`));
            }
        );
    });
}