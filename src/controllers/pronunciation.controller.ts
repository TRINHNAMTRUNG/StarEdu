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
}

export default PronunciationController;
