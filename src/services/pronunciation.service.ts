// ======================================
// File: src/services/azurePronunciation.service.ts
// ======================================

import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";
import { Buffer } from "buffer";
import AppError from "../utils/AppError";
import { ENV } from "../config/environment";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { tmpdir } from "os";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import path from "path";

// Cấu hình đường dẫn ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/* ===================== */
/* Interfaces dữ liệu trả về từ Azure */
/* ===================== */

interface RawNBestPhoneme {
    Phoneme: string;
    Score: number;
}

interface RawPhoneme {
    Phoneme: string;
    PronunciationAssessment?: {
        AccuracyScore?: number;
        NBestPhonemes?: RawNBestPhoneme[];
    };
    Offset?: number;
    Duration?: number;
}

interface RawSyllable {
    Syllable: string;
    Grapheme?: string;
    PronunciationAssessment?: { AccuracyScore?: number };
    Offset?: number;
    Duration?: number;
}

interface RawWord {
    Word: string;
    Offset?: number;
    Duration?: number;
    PronunciationAssessment?: { AccuracyScore?: number };
    Syllables?: RawSyllable[];
    Phonemes?: RawPhoneme[];
}

interface RawNBest {
    PronunciationAssessment?: {
        AccuracyScore?: number;
        FluencyScore?: number;
        CompletenessScore?: number;
        PronScore?: number;
    };
    Words?: RawWord[];
}

interface RawAzureResponse {
    NBest?: RawNBest[];
}

/* ===================== */
/* Output chuẩn hóa trả về cho FE/DB */
/* ===================== */

interface OutputPhoneme {
    target: string; // âm chuẩn IPA
    accuracy: number; // điểm chính xác 0-100
    result: "perfect" | "near_correct" | "medium" | "wrong"; // phân loại
    altPh?: string; // âm người dùng nói khác target
    diff?: number; // độ khác biệt giữa target và alt
    feedback: string; // lời khuyên
    NBestPhonemes?: RawNBestPhoneme[]; // giữ nguyên mảng gốc để debug
}

interface OutputSyllable {
    ipa: string; // âm IPA của âm tiết
    grapheme?: string; // chữ viết
    accuracy: number; // điểm trung bình của âm tiết
    phonemes: OutputPhoneme[];
}

interface NormalizedResult {
    word: string; // từ
    scores: {
        accuracy: number | null;
        fluency: number | null;
        completeness: number | null;
        overall: number | null;
    };
    syllables: OutputSyllable[];
}

/* ===================== */
/* Rule Map IPA → cách phát âm */
/* ===================== */

// Chỉ giữ hướng dẫn phát âm, không so sánh với âm khác
const IPA_RULE_MAP: Record<string, string> = {
    p: "Bật hơi mạnh hơn, không rung cổ họng.",
    b: "Thêm rung nhẹ ở cổ họng.",
    t: "Không rung cổ họng, bật hơi mạnh hơn.",
    d: "Thêm rung cổ họng để khác /t/.",
    k: "Không rung cổ họng, bật hơi mạnh hơn.",
    g: "Thêm rung cổ họng khi phát âm.",
    f: "Cắn nhẹ môi dưới vào răng trên khi phát âm.",
    v: "Thêm rung cổ họng khi phát âm.",
    θ: "Đưa lưỡi ra giữa hai hàm răng, thổi nhẹ.",
    ð: "Giữ lưỡi giữa hai răng và rung cổ họng.",
    s: "Giữ luồng hơi hẹp, rõ nét.",
    "ʃ": "Tròn môi nhẹ, đẩy hơi dài.",
    z: "Thêm rung cổ họng khi phát âm.",
    "ʒ": "Thêm rung cổ họng, giữ lưỡi đúng vị trí.",
    h: "Phát hơi nhẹ từ họng, không rung cổ họng.",
    m: "Ngậm miệng, rung mũi khi phát âm.",
    n: "Lưỡi chạm chân răng trên, hơi thoát qua mũi.",
    "ŋ": "Nâng phần sau lưỡi lên.",
    l: "Đặt đầu lưỡi chạm nhẹ nướu.",
    r: "Cuộn đầu lưỡi nhẹ vào trong.",
    w: "Làm tròn môi, không cắn môi.",
    j: "Đặt đầu lưỡi gần vòm họng, phát âm nhẹ nhàng.",
    "ʧ": "Thêm bật hơi nhẹ trước /ʃ/.",
    "ʤ": "Thêm rung cổ họng.",
    i: "Căng môi hơn, kéo dài âm.",
    ɪ: "Thả lỏng môi, âm ngắn.",
    e: "Hạ hàm ít hơn, tạo âm giữa /æ/ và /ɪ/.",
    æ: "Hạ hàm nhiều hơn, mở miệng rộng.",
    ʌ: "Giữ miệng mở, phát âm mạnh hơn.",
    ə: "Giảm lực, nhẹ giọng hơn.",
    ɑ: "Mở rộng miệng, hạ hàm sâu.",
    ɔ: "Tròn môi hơn.",
    ɒ: "Không tròn môi, mở rộng miệng.",
    ʊ: "Rút lưỡi về sau.",
    u: "Kéo dài âm, tròn môi hơn.",
    ɜ: "Giữ lưỡi giữa, phát âm dài hơn.",
    eɪ: "Kéo dài âm, kết thúc bằng âm /ɪ/ nhẹ.",
    aɪ: "Kéo âm lên cao thành /ɪ/ ở cuối.",
    ɔɪ: "Kết thúc bằng âm /ɪ/ ngắn, tròn môi nhẹ.",
    aʊ: "Kéo về phía sau và tròn môi để tạo /ʊ/ ở cuối.",
    oʊ: "Bắt đầu tròn môi nhẹ và kết thúc bằng /ʊ/.",
    eə: "Kéo dài âm và thêm nhẹ /ə/ ở cuối.",
    ɪə: "Kéo dài âm và thêm /ə/ nhẹ ở cuối.",
    ʊə: "Giữ âm dài, mở nhẹ miệng về /ə/."
};

/* ===================== */
/* Phân loại kết quả âm theo điểm */
/* ===================== */
const PERFECT = 95;
const LIGHT = 5;
const MEDIUM = 10;

const classifyDiff = (diff: number) =>
    diff < LIGHT ? "near_correct" : diff < MEDIUM ? "medium" : "wrong";

/* ===================== */
/* Tạo feedback cho 1 phoneme */
/* ===================== */
function makeFeedback(target: string, alt: string | undefined, diff: number | undefined, result: string): string {
    const rule = IPA_RULE_MAP[target];
    if (result === "perfect") return `Phát âm /${target}/ rất tốt. ${rule ?? ""}`;
    if (result === "near_correct") return `Âm /${target}/ hơi đúng. ${rule ?? ""}`;
    if (result === "medium") return `Âm /${target}/ cần luyện thêm. ${rule ?? ""}`;
    // Nếu phát âm sai hoàn toàn
    return `Bạn đang nói /${alt ?? "?"}/ thay vì /${target}/. ${rule ?? ""}`;
}

/* ===================== */
/* Phân tích 1 phoneme → feedback, giữ NBestPhonemes để debug */
/* ===================== */
function analyzePhoneme(p: RawPhoneme): OutputPhoneme {
    const target = p.Phoneme;
    const accuracy = p.PronunciationAssessment?.AccuracyScore ?? 0;
    const nbest = p.PronunciationAssessment?.NBestPhonemes ?? [];

    if (accuracy >= PERFECT) {
        return {
            target,
            accuracy,
            result: "perfect",
            feedback: `Phát âm /${target}/ rất tốt.`,
            NBestPhonemes: nbest
        };
    }

    if (!nbest.length) {
        return {
            target,
            accuracy,
            result: "wrong",
            feedback: "Cần cải thiện phát âm.",
            NBestPhonemes: []
        };
    }

    const sorted = [...nbest].sort((a, b) => b.Score - a.Score);
    const best = sorted[0];
    const second = sorted[1];

    let alt = best.Phoneme;
    let diff = 0;

    if (best.Phoneme === target) {
        // nếu phoneme đúng, diff so với phoneme cao thứ 2
        diff = second ? best.Score - second.Score : 0;
        alt = second ? second.Phoneme : "";
    } else {
        // nếu phoneme sai, diff so với phoneme target trong NBest
        const targetItem = sorted.find((s) => s.Phoneme === target);
        diff = best.Score - (targetItem?.Score ?? 0);
    }

    const result = classifyDiff(Math.abs(diff));

    // chỉ show rule khi alt khác target
    const feedback =
        alt && alt !== target
            ? makeFeedback(target, alt, Math.round(diff), result)
            : makeFeedback(target, "", undefined, result);

    return {
        target,
        accuracy,
        result,
        altPh: alt !== target ? alt : undefined,
        diff: alt !== target ? Math.round(diff) : undefined,
        feedback,
        NBestPhonemes: nbest
    };
}


/* ===================== */
/* Service chính AzurePronunciationService */
/* ===================== */
class AzurePronunciationService {
    private readonly speechConfig: speechsdk.SpeechConfig;
    private readonly TIMEOUT = 30_000; // 30 giây timeout

    constructor() {
        const { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } = ENV;
        if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION)
            throw AppError.internalServerError("Thiếu cấu hình Azure Speech.");
        this.speechConfig = speechsdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        this.speechConfig.speechRecognitionLanguage = "en-US";
    }

    /* assess(): gọi Azure, chấm điểm và trả JSON chuẩn hóa */
    public async assess(audio: Buffer, text: string): Promise<NormalizedResult> {
        if (!audio?.length) throw AppError.badRequestError("AudioBuffer thiếu.");
        if (!text?.trim()) throw AppError.badRequestError("ReferenceText thiếu.");

        const fixed = await this.ensurePCM16Mono16k(audio);
        const audioConfig = this.createAudioConfigFromBuffer(fixed);

        const recognizer = new speechsdk.SpeechRecognizer(this.speechConfig, audioConfig);
        const config = new speechsdk.PronunciationAssessmentConfig(
            text,
            speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
            speechsdk.PronunciationAssessmentGranularity.Phoneme,
            true
        );
        config.phonemeAlphabet = "IPA";
        config.nbestPhonemeCount = 3;
        config.applyTo(recognizer);

        return new Promise<NormalizedResult>((resolve, reject) => {
            const timer = setTimeout(() => {
                try { recognizer.close(); } catch { }
                reject(AppError.internalServerError("Azure timeout."));
            }, this.TIMEOUT);

            recognizer.recognized = (_s, e) => {
                clearTimeout(timer);
                try { recognizer.close(); } catch { }
                if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
                    try {
                        const parsed: RawAzureResponse = JSON.parse(
                            e.result.properties.getProperty(speechsdk.PropertyId.SpeechServiceResponse_JsonResult) ?? "{}"
                        );
                        resolve(this.normalize(parsed));
                    } catch {
                        reject(AppError.internalServerError("Parse Azure JSON lỗi."));
                    }
                } else reject(AppError.badRequestError("Không nhận diện được giọng nói."));
            };

            recognizer.canceled = () => reject(AppError.internalServerError("Azure request bị hủy."));
            recognizer.recognizeOnceAsync();
        });
    }

    /* Chuẩn hóa dữ liệu Azure → JSON dễ hiểu */
    private normalize(raw: RawAzureResponse): NormalizedResult {
        const best = raw.NBest?.[0];
        const w = best?.Words?.[0];
        const syllables = w?.Syllables ?? [];
        const phonemes = w?.Phonemes ?? [];

        const resultSyllables: OutputSyllable[] = syllables.map((syl) => {
            const phs = phonemes.filter(
                (p) => (p.Offset ?? 0) >= (syl.Offset ?? 0) &&
                    (p.Offset ?? 0) < (syl.Offset ?? 0) + (syl.Duration ?? 0)
            );
            const analyzed = phs.map(analyzePhoneme);
            return {
                ipa: syl.Syllable,
                grapheme: syl.Grapheme,
                accuracy: syl.PronunciationAssessment?.AccuracyScore ?? 0,
                phonemes: analyzed
            };
        });

        return {
            word: w?.Word ?? "",
            scores: {
                accuracy: best?.PronunciationAssessment?.AccuracyScore ?? null,
                fluency: best?.PronunciationAssessment?.FluencyScore ?? null,
                completeness: best?.PronunciationAssessment?.CompletenessScore ?? null,
                overall: best?.PronunciationAssessment?.PronScore ?? null
            },
            syllables: resultSyllables
        };
    }

    /* Convert audio → PCM 16kHz mono */
    private async ensurePCM16Mono16k(buffer: Buffer): Promise<Buffer> {
        const input = path.join(tmpdir(), `input_${Date.now()}.wav`);
        const output = path.join(tmpdir(), `output_${Date.now()}.wav`);
        writeFileSync(input, buffer);
        return new Promise((resolve, reject) => {
            ffmpeg(input)
                .audioCodec("pcm_s16le")
                .audioFrequency(16000)
                .audioChannels(1)
                .format("wav")
                .save(output)
                .on("end", () => {
                    const converted = readFileSync(output);
                    unlinkSync(input); unlinkSync(output);
                    resolve(converted);
                })
                .on("error", (err) => reject(AppError.internalServerError(`Audio convert lỗi: ${err}`)));
        });
    }

    /* Biến Buffer → AudioConfig cho SDK */
    private createAudioConfigFromBuffer(buffer: Buffer): speechsdk.AudioConfig {
        let pos = 0;
        const callback: speechsdk.PullAudioInputStreamCallback = {
            read: (arr: ArrayBuffer): number => {
                const view = new Uint8Array(arr);
                const remain = buffer.length - pos;
                const bytes = Math.min(view.byteLength, remain);
                if (bytes > 0) { view.set(buffer.subarray(pos, pos + bytes)); pos += bytes; return bytes; }
                return 0;
            },
            close: () => { }
        };
        const format = speechsdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
        const stream = speechsdk.AudioInputStream.createPullStream(callback, format);
        return speechsdk.AudioConfig.fromStreamInput(stream);
    }
}

export default AzurePronunciationService;
