import { IWord } from '../models/dictation.model';
import { Translate } from '@google-cloud/translate/build/src/v2';
import { ENV } from '../config/environment';
import { injectable } from 'tsyringe';
import GeminiService from './gemini.service';
import AppError from '../utils/AppError';
import { fetchTranscript } from 'youtube-transcript-plus';

export interface IRawBreak {
    start: number;
    end: number;
    text: string;
}

@injectable()
class YouTubeService {
    private translateClient: Translate;

    constructor(private geminiService: GeminiService) {
        const credentials = JSON.parse(ENV.GOOGLE_CLOUD_CREDENTIALS_JSON);
        this.translateClient = new Translate({ credentials });
    }

    async fetchAndParseCaptions(youtubeVideoId: string): Promise<IRawBreak[]> {
        try {
            const youtubeIdRegex = /^[a-zA-Z0-9_-]{11}$/;
            if (!youtubeIdRegex.test(youtubeVideoId)) {
                throw AppError.badRequestError(
                    `YouTube Video ID không hợp lệ: "${youtubeVideoId}"`
                );
            }

            // ✅ Dùng youtube-transcript-plus với custom user agent
            const transcript = await fetchTranscript(youtubeVideoId, {
                lang: 'en',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            });

            if (!transcript || transcript.length === 0) {
                throw AppError.badRequestError(
                    `Video "${youtubeVideoId}" không có phụ đề tiếng Anh`
                );
            }

            const parsedData: IRawBreak[] = transcript.map((item: any) => ({
                start: parseFloat(item.offset) * 1000 || 0,  // Convert to ms
                end: (parseFloat(item.offset) + parseFloat(item.duration)) * 1000 || 0,
                text: item.text.replace(/\s+/g, ' ').trim()
            }));

            console.log(`✅ Parsed ${parsedData.length} caption segments`);
            return parsedData;

        } catch (error: any) {
            console.error("❌ Error fetching captions:", error);

            if (error instanceof AppError) {
                throw error;
            }

            // Parse specific errors
            if (error.message?.includes('Transcript is disabled')) {
                throw AppError.badRequestError(
                    `Video "${youtubeVideoId}" đã tắt phụ đề`
                );
            }
            if (error.message?.includes('No transcripts found')) {
                throw AppError.badRequestError(
                    `Video "${youtubeVideoId}" không có phụ đề`
                );
            }

            throw AppError.internalServerError(
                `Lỗi khi lấy phụ đề: ${error.message}`,
                error.stack
            );
        }
    }

    async translateBatch(texts: string[]): Promise<Map<string, string>> {
        if (texts.length === 0) {
            return new Map<string, string>();
        }

        const [translations] = await this.translateClient.translate(texts, 'vi');

        const translationMap = new Map<string, string>();
        texts.forEach((originalText, index) => {
            const translation = Array.isArray(translations) ? translations[index] : translations;
            translationMap.set(originalText, translation);
        });

        console.log(`✅ Translated ${texts.length} texts to Vietnamese`);
        return translationMap;
    }

    async analyzeWithGeminiBatch(texts: string[]): Promise<Map<string, IWord[]>> {
        if (texts.length === 0) {
            return new Map<string, IWord[]>();
        }

        const resultMap = await this.geminiService.analyzeSentencesBatch(texts);

        console.log(`✅ Analyzed vocabulary for ${resultMap.size} sentences using Gemini`);
        return resultMap;
    }

    async simpleTranslate(text: string): Promise<string> {
        const [translation] = await this.translateClient.translate(text, 'vi');
        return Array.isArray(translation) ? translation[0] : translation;
    }
}

export default YouTubeService;