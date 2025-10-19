import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";
import { Buffer } from "buffer";
import AppError from "../utils/AppError";
import { ENV } from "../config/environment";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { tmpdir } from "os";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import path from "path";
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
/**
 * AzurePronunciationService
 * - Azure Speech SDK tự quản lý token khi dùng SpeechConfig.fromSubscription(key, region).
 * - Audio ideal: WAV/PCM 16kHz, 16-bit, mono. Nếu FE gửi khác (44.1kHz...), cần convert trước.
 */
class AzurePronunciationService {
    private speechConfig: speechsdk.SpeechConfig;
    // Mặc định timeout cho 1 request tới Azure (ms). Có thể expose thành param nếu cần.
    private readonly REQUEST_TIMEOUT_MS = 30_000;

    constructor() {
        const { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } = ENV;
        if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
            // Nếu thiếu config, throw ngay để dev biết cấu hình chưa setup
            throw AppError.internalServerError("Missing Azure Speech configuration (key/region).");
        }

        // Tạo chung SpeechConfig dùng cho mọi request của instance này.
        // SDK sẽ tự request token/refresh token nội bộ.
        this.speechConfig = speechsdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);

        // Ngôn ngữ nhận dạng, đổi nếu muốn (ví dụ: "en-GB" hoặc "vi-VN")
        this.speechConfig.speechRecognitionLanguage = "en-US";

        // (Tùy chọn) có thể set thêm timeout silence, logs, v.v.:
        // this.speechConfig.enableAudioLogging(); // bật nếu muốn Azure lưu audio logs (debug)
    }

    /**
     * assess
     *
     * - Input:
     *    audioBuffer: Buffer chứa file WAV/PCM upload từ FE.
     *    referenceText: string - câu / đoạn cần so sánh (người dùng phải đọc).
     * - Output: Promise<any> - JSON trả về của Azure Pronunciation Assessment (parsed).
     *
     * Hành vi:
     * - Chuẩn bị audio stream từ buffer, tạo recognizer, apply pronunciation config,
     *   gọi Azure (recognizeOnceAsync), xử lý events, timeout, cleanup recognizer.
     */
    public async assess(audioBuffer: Buffer, referenceText: string): Promise<any> {
        // Validate input sớm
        if (!audioBuffer || !Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
            throw AppError.badRequestError("AudioBuffer thiếu hoặc không hợp lệ.");
        }
        if (!referenceText || typeof referenceText !== "string" || !referenceText.trim()) {
            throw AppError.badRequestError("ReferenceText thiếu hoặc không hợp lệ.");
        }

        // 1) Tạo AudioConfig từ Buffer (Pull stream) - Azure SDK sẽ "kéo" dữ liệu
        const fixedAudio = await this.ensurePCM16Mono16k(audioBuffer);
        const audioConfig = this.createAudioConfigFromBuffer(fixedAudio);

        // 2) Tạo SpeechRecognizer cho request hiện tại
        const recognizer = new speechsdk.SpeechRecognizer(this.speechConfig, audioConfig);

        // 3) Cấu hình PronunciationAssessment
        //    - referenceText: đoạn tham chiếu
        //    - gradingSystem: HundredMark => điểm 0-100
        //    - granularity: Phoneme => chi tiết từng âm vị
        //    - enableMiscue: true => phát hiện đọc thiếu / chèn
        const pronunciationConfig = new speechsdk.PronunciationAssessmentConfig(
            referenceText,
            speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
            speechsdk.PronunciationAssessmentGranularity.Phoneme,
            true
        );

        // (Optional) nếu muốn cấu hình thêm, ví dụ set IPA:
        pronunciationConfig.phonemeAlphabet = "IPA";
        pronunciationConfig.nbestPhonemeCount = 3;

        // 4) Áp dụng cấu hình cho recognizer (bắt buộc để nhận assessment)
        pronunciationConfig.applyTo(recognizer);

        // 5) Chạy recognition theo pattern event-based + Promise
        //    - Chúng ta dùng both events và recognizeOnceAsync vì SDK trả kết quả qua event
        //    - Sử dụng timeout để tránh treo (defensive programming)
        return new Promise<any>((resolve, reject) => {
            // a) Timeout bảo vệ tổng request
            const timeout = setTimeout(() => {
                // Đóng recognizer, trả lỗi timeout
                try { recognizer.close(); } catch (_) { /* ignore */ }
                reject(AppError.internalServerError("Azure service timeout."));
            }, this.REQUEST_TIMEOUT_MS);

            // b) Handler khi có kết quả được recognized
            recognizer.recognized = (_sender, ev: speechsdk.SpeechRecognitionEventArgs) => {
                clearTimeout(timeout);
                try { recognizer.close(); } catch (_) { /* ignore */ }

                // ev.result.reason xem Azure trả gì
                if (ev.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
                    // Kết quả assessment nằm trong property SpeechServiceResponse_JsonResult
                    const jsonStr = ev.result.properties.getProperty(speechsdk.PropertyId.SpeechServiceResponse_JsonResult) ?? "{}";
                    try {
                        const parsed = JSON.parse(jsonStr);
                        resolve(parsed); // Trả kết quả parsed cho caller
                    } catch (err) {
                        // Nếu JSON không parse được => lỗi xử lý response
                        reject(AppError.internalServerError("Failed to parse Azure response JSON."));
                    }
                } else if (ev.result.reason === speechsdk.ResultReason.NoMatch) {
                    // Không nhận dạng được giọng nói (âm thanh quá kém)
                    reject(AppError.badRequestError("No speech recognized or audio quality too low."));
                } else {
                    // Trạng thái khác (bảo đảm bắt hết)
                    reject(AppError.internalServerError("Unrecognized speech result state."));
                }
            };

            // c) Handler cancel (lỗi service, authentication, network, etc.)
            recognizer.canceled = (_sender, ev: speechsdk.SpeechRecognitionCanceledEventArgs) => {
                clearTimeout(timeout);
                try { recognizer.close(); } catch (_) { /* ignore */ }

                // Lấy thông tin chi tiết hủy (nếu có)
                const cancellation = speechsdk.CancellationDetails.fromResult((ev as any).result);
                const detail = cancellation?.errorDetails ?? "Unknown cancellation reason";
                // Map chi tiết thành AppError để controller xử lý thống nhất
                reject(AppError.internalServerError(`Azure canceled: ${detail}`));
            };

            // d) Bắt đầu 1-shot recognition
            //    - Result sẽ kích hoạt recognized/canceled events
            recognizer.recognizeOnceAsync(
                () => {
                    // success callback body left empty because we use event handlers above
                },
                (err) => {
                    clearTimeout(timeout);
                    try { recognizer.close(); } catch (_) { /* ignore */ }
                    reject(AppError.internalServerError(`Azure SDK error: ${String(err)}`));
                }
            );
        });
    }

    /** Convert audio về định dạng chuẩn Azure yêu cầu: PCM 16kHz, 16bit, mono */
    private async ensurePCM16Mono16k(audioBuffer: Buffer): Promise<Buffer> {
        const input = path.join(tmpdir(), `input_${Date.now()}.wav`);
        const output = path.join(tmpdir(), `output_${Date.now()}.wav`);
        writeFileSync(input, audioBuffer);

        return new Promise((resolve, reject) => {
            ffmpeg(input)
                .audioCodec("pcm_s16le")
                .audioFrequency(16000)
                .audioChannels(1)
                .format("wav")
                .save(output)
                .on("end", () => {
                    const converted = readFileSync(output);
                    unlinkSync(input);
                    unlinkSync(output);
                    resolve(converted);
                })
                .on("error", (err) => {
                    reject(AppError.internalServerError(`Audio conversion failed: ${err}`));
                });
        });
    }

    /**
     * createAudioConfigFromBuffer
     *
     * - Chuyển Node Buffer thành PullAudioInputStream mà Speech SDK hiểu.
     * - SDK sẽ gọi callback.read nhiều lần để "kéo" dữ liệu.
     *
     * Tham số:
     * - audioBuffer: Buffer (WAV/PCM). Nếu sample rate khác 16k, kết quả có thể không tốt.
     *
     * Trả về: speechsdk.AudioConfig
     */
    private createAudioConfigFromBuffer(audioBuffer: Buffer): speechsdk.AudioConfig {
        let position = 0;

        const callback: speechsdk.PullAudioInputStreamCallback = {
            read: (arrayBuffer: ArrayBuffer): number => {
                const view = new Uint8Array(arrayBuffer);
                const remaining = audioBuffer.length - position;
                const toCopy = Math.min(view.byteLength, remaining);

                if (toCopy > 0) {
                    view.set(audioBuffer.subarray(position, position + toCopy));
                    position += toCopy;
                    return toCopy;
                }

                // 0: end-of-stream
                return 0;
            },
            close: (): void => {
                // Nếu cần cleanup resources native thì làm ở đây (hiếm cần)
            }
        };

        // Định dạng audio input cho SDK: PCM Wave 16kHz, 16bit, mono.
        // Nếu audioBuffer không phải WAV/PCM, bạn cần convert trước.
        const format = speechsdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
        const pullStream = speechsdk.AudioInputStream.createPullStream(callback, format);

        return speechsdk.AudioConfig.fromStreamInput(pullStream);
    }
}
export default AzurePronunciationService;