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

    /**
     * evaluateToeicSpeech(): Đánh giá phát âm TOEIC bằng OpenAI Whisper + GPT-4
     * Bước 1: Whisper API chuyển audio thành text
     * Bước 2: GPT-4 đánh giá pronunciation, grammar, vocabulary
     */
    public async evaluateToeicSpeech(audioBuffer: Buffer, filename: string, topic?: string): Promise<{
        transcribedText: string;
        evaluation: string;
    }> {
        const { OPENAI_API_KEY } = ENV;
        if (!OPENAI_API_KEY) {
            throw AppError.internalServerError("Thiếu OPENAI_API_KEY trong cấu hình.");
        }

        const axios = require('axios');
        const FormData = require('form-data');

        try {
            // Bước 1: Whisper API - Speech to Text
            console.log("📝 Gọi Whisper API để chuyển đổi giọng nói...");

            const whisperFormData = new FormData();
            whisperFormData.append('file', audioBuffer, {
                filename: filename || 'audio.webm',
                contentType: 'audio/webm'
            });
            whisperFormData.append('model', 'whisper-1');
            whisperFormData.append('language', 'en');

            const whisperResponse = await axios.post(
                'https://api.openai.com/v1/audio/transcriptions',
                whisperFormData,
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        ...whisperFormData.getHeaders()
                    },
                    timeout: 30000
                }
            );

            const transcribedText = whisperResponse.data.text;

            if (!transcribedText) {
                throw AppError.badRequestError("Không thể chuyển đổi audio thành text");
            }

            console.log("✅ Whisper transcription:", transcribedText);

            // Bước 2: GPT-4 API - Đánh giá chi tiết
            console.log("🤖 Gọi GPT-4 để đánh giá...");

            const gptResponse = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Bạn là giám khảo TOEIC Speaking chính thức của ETS. Hãy đánh giá nghiêm túc và chi tiết như một kỳ thi thực tế.

Tiêu chí chấm điểm TOEIC Speaking Part 6 (0-200):
- 180-200: Xuất sắc - Trả lời rõ ràng, từ vựng phong phú, ngữ pháp chính xác, phát âm chuẩn, độ dài phù hợp
- 140-175: Tốt - Ý tưởng rõ ràng, có vài lỗi nhỏ không ảnh hưởng hiểu nghĩa, độ dài hợp lý
- 100-135: Trung bình - Truyền đạt được ý nhưng nhiều lỗi ngữ pháp/từ vựng, độ dài có thể chưa phù hợp
- 60-95: Yếu - Khó hiểu, nhiều lỗi nghiêm trọng, quá ngắn hoặc quá dài
- 0-55: Rất yếu - Không trả lời được hoặc sai chủ đề hoàn toàn

YÊU CẦU VỀ ĐỘ DÀI (QUAN TRỌNG):
- Độ dài chuẩn: 80-120 từ (tương đương 45-60 giây nói)
- 60-79 từ: Trừ 10-20 điểm (quá ngắn, thiếu chi tiết)
- 40-59 từ: Trừ 30-40 điểm (rất ngắn, thiếu nội dung nghiêm trọng)
- Dưới 40 từ: Trừ 50+ điểm (không đủ nội dung để đánh giá)
- 121-150 từ: Trừ 5-10 điểm (hơi dài, có thể lạc đề)
- Trên 150 từ: Trừ 15-25 điểm (quá dài, lạc đề, không súc tích)

Trả về JSON với các trường (BẮT BUỘC trả lời bằng TIẾNG VIỆT):
{
  "transcribedText": "văn bản ghi âm được (giữ nguyên tiếng Anh)",
  "wordCount": [số từ đếm được],
  "lengthComment": "Nhận xét về độ dài: [X] từ - [Đánh giá: Quá ngắn/Hợp lý/Quá dài] - Ảnh hưởng: [Trừ X điểm / Không ảnh hưởng]",
  "topicRelevance": "Đánh giá chi tiết: Có trả lời đúng chủ đề không? Có đi sâu vào vấn đề? Có đưa ra lý do và ví dụ cụ thể?",
  "errors": [
    "Lỗi 1: Mô tả lỗi + Giải thích tại sao sai + Cách sửa đúng",
    "Lỗi 2: ..."
  ],
  "betterExpressions": [
    "Thay vì '[câu sai]' → Nên dùng '[câu đúng]' vì [lý do]",
    "..."
  ],
  "pronunciation": "Nhận xét chi tiết về phát âm, ngữ điệu, độ trôi chảy dựa trên văn bản. Chỉ ra từ nào có thể phát âm sai.",
  "score": 0-200,
  "scoreReason": "Giải thích CHI TIẾT lý do cho điểm số: Điểm mạnh gì? Điểm yếu gì? Ảnh hưởng của độ dài? So với tiêu chuẩn ETS thì ở mức nào?",
  "improvements": [
    "Góp ý cụ thể 1: Hướng dẫn chi tiết cách cải thiện (bao gồm cả độ dài nếu cần)",
    "Góp ý cụ thể 2: ..."
  ]
}

Hãy chấm điểm KHẮT KHE như giám khảo thật. Không khoan nhượng với lỗi ngữ pháp, từ vựng, cấu trúc câu VÀ ĐỘ DÀI.`
                        },
                        {
                            role: 'user',
                            content: topic
                                ? `Topic: "${topic}"\n\nTranscribed text: "${transcribedText}"\n\nEvaluate this response.`
                                : `Transcribed text: "${transcribedText}"\n\nEvaluate this response.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const evaluation = gptResponse.data.choices[0].message.content;

            console.log("✅ GPT-4 evaluation complete");

            return {
                transcribedText,
                evaluation
            };

        } catch (error: any) {
            console.error("❌ Error in evaluateToeicSpeech:", error.response?.data || error.message);

            if (error.response?.data?.error) {
                throw AppError.internalServerError(
                    `OpenAI API Error: ${error.response.data.error.message || 'Unknown error'}`
                );
            }

            throw AppError.internalServerError(
                `Lỗi khi đánh giá phát âm TOEIC: ${error.message}`
            );
        }
    }

    /**
     * evaluateWriting(): Đánh giá TOEIC Writing bằng GPT-4o-mini
     * Đánh giá bài luận Opinion Essay với các tiêu chí TOEIC Writing
     */
    public async evaluateWriting(text: string, topic?: string): Promise<{
        evaluation: string;
    }> {
        const { OPENAI_API_KEY } = ENV;
        if (!OPENAI_API_KEY) {
            throw AppError.internalServerError("Thiếu OPENAI_API_KEY trong cấu hình.");
        }

        const axios = require('axios');

        try {
            console.log("🤖 Gọi GPT-4 để đánh giá Writing...");

            // Đếm số từ
            const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

            const gptResponse = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Bạn là giám khảo TOEIC Writing chính thức của ETS. Đánh giá bài luận Opinion Essay.

Tiêu chí chấm điểm TOEIC Writing (0-200):
- 180-200: Xuất sắc - Lập luận mạch lạc, từ vựng phong phú, ngữ pháp chính xác, độ dài hợp lý
- 140-175: Tốt - Ý tưởng rõ ràng, vài lỗi nhỏ, cấu trúc tốt
- 100-135: Trung bình - Ý chính được truyền đạt nhưng nhiều lỗi ngữ pháp/từ vựng
- 60-95: Yếu - Thiếu tổ chức, nhiều lỗi nghiêm trọng
- 0-55: Rất yếu - Không đủ nội dung hoặc sai chủ đề

YÊU CẦU ĐỘ DÀI:
- Chuẩn: 100-200 từ
- Dưới 80 từ: Trừ 20-40 điểm
- 80-99 từ: Trừ 10-15 điểm
- Trên 250 từ: Trừ 5-10 điểm (có thể lạc đề)

Trả về JSON (BẮT BUỘC tiếng Việt):
{
  "wordCount": [số từ],
  "lengthComment": "Nhận xét về độ dài và ảnh hưởng",
  "score": 0-200,
  "scoreReason": "Giải thích chi tiết điểm số",
  "taskResponse": "Đánh giá về cách trả lời yêu cầu đề bài",
  "coherence": "Đánh giá về tính mạch lạc và cấu trúc",
  "vocabularyGrammar": "Đánh giá từ vựng và ngữ pháp",
  "errors": ["Lỗi 1: Mô tả + Cách sửa", "Lỗi 2: ..."],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "improvements": ["Góp ý 1", "Góp ý 2"]
}

Chấm điểm KHẮT KHE như giám khảo thật.`
                        },
                        {
                            role: 'user',
                            content: topic
                                ? `Chủ đề: "${topic}"

Bài viết của học viên:
"${text}"

Hãy đánh giá chi tiết bài viết này.`
                                : `Bài viết của học viên:
"${text}"

Hãy đánh giá chi tiết bài viết này.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const evaluation = gptResponse.data.choices[0].message.content;

            console.log("✅ GPT-4 Writing evaluation complete");

            return {
                evaluation
            };

        } catch (error: any) {
            console.error("❌ Error in evaluateWriting:", error.response?.data || error.message);

            if (error.response?.data?.error) {
                throw AppError.internalServerError(
                    `OpenAI API Error: ${error.response.data.error.message || 'Unknown error'}`
                );
            }

            throw AppError.internalServerError(
                `Lỗi khi đánh giá Writing: ${error.message}`
            );
        }
    }
}

export default AzurePronunciationService;