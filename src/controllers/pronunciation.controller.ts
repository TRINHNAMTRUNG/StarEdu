import e, { Request, Response } from "express";
import AzurePronunciationService from "../services/pronunciation.service";
import { injectable } from "tsyringe";

/**
 * Controller: Đánh giá phát âm bằng Azure Speech SDK
 *
 * Input (multipart/form-data):
 * - "audio": file (WAV hoặc PCM)
 * - "referenceText": string (văn bản chuẩn để chấm phát âm)
 */
@injectable()
class PronunciationController {
    public async assessPronunciation(req: Request, res: Response) {
        try {
            const file = (req as any).file;
            const referenceText = req.body?.referenceText?.trim();

            if (!file || !file.buffer) {
                return res.status(400).json({ success: false, message: "Thiếu file audio" });
            }
            if (!referenceText) {
                return res.status(400).json({ success: false, message: "Thiếu referenceText" });
            }

            // Validate file size - Azure Speech limit: ~10MB
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_FILE_SIZE) {
                return res.status(400).json({
                    success: false,
                    message: "File audio không được vượt quá 10MB"
                });
            }

            const azureService = new AzurePronunciationService();
            const result = await azureService.assess(file.buffer, referenceText);

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            const status = err?.statusCode || 500;
            const message = err?.message || "Lỗi server khi đánh giá phát âm.";
            return res.status(status).json({ success: false, message });
        }
    }

    /**
     * POST /api/student/pronunciation/evaluate-toeic
     * Đánh giá phát âm TOEIC bằng OpenAI Whisper + GPT-4
     */
    public async evaluateToeicSpeech(req: Request, res: Response) {
        try {
            const file = (req as any).file;
            const topic = req.body?.topic?.trim(); // Nhận topic từ form data

            if (!file || !file.buffer) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Thiếu file audio" 
                });
            }

            // Validate file size - OpenAI Whisper limit: 25MB
            const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
            if (file.size > MAX_FILE_SIZE) {
                return res.status(400).json({
                    success: false,
                    message: "File audio không được vượt quá 25MB"
                });
            }

            console.log("Audio file details:", {
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                topic: topic || "No topic provided"
            });

            const azureService = new AzurePronunciationService();
            const result = await azureService.evaluateToeicSpeech(file.buffer, file.originalname, topic);

            return res.status(200).json({
                success: true,
                data: result,
                message: "Đánh giá phát âm TOEIC thành công"
            });
        } catch (err: any) {
            console.error("Error evaluating TOEIC speech:", err);
            const status = err?.statusCode || 500;
            const message = err?.message || "Lỗi server khi đánh giá phát âm.";
            return res.status(status).json({ success: false, message });
        }
    }

    /**
     * POST /api/student/vocabulary/evaluate-writing
     * Đánh giá TOEIC Writing bằng GPT-4o-mini
     */
    public async evaluateWriting(req: Request, res: Response) {
        try {
            const { text, topic } = req.body;

            if (!text || !text.trim()) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Thiếu nội dung văn bản" 
                });
            }

            console.log("Writing evaluation request:", {
                textLength: text.length,
                wordCount: text.trim().split(/\s+/).length,
                topic: topic || "No topic provided"
            });

            const azureService = new AzurePronunciationService();
            const result = await azureService.evaluateWriting(text, topic);

            return res.status(200).json({
                success: true,
                data: result,
                message: "Đánh giá Writing thành công"
            });
        } catch (err: any) {
            console.error("Error evaluating writing:", err);
            const status = err?.statusCode || 500;
            const message = err?.message || "Lỗi server khi đánh giá writing.";
            return res.status(status).json({ success: false, message });
        }
    }
}

export default PronunciationController;
