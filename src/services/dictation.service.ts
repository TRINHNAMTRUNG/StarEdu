import DictationModel, { IDictation, IWord, IDictationBreak } from '../models/dictation.model';
import { IRawBreak } from './youtube.service';
import AppError from '../utils/AppError';
import { injectable } from 'tsyringe';
import YouTubeService from './youtube.service';

@injectable()
class DictationService {
    constructor(private youtubeService: YouTubeService) { }

    /**
     * CREATE AND SAVE DICTATION LESSON
     */
    async createAndSaveLesson(youtubeVideoId: string, title: string): Promise<IDictation> {
        try {
            // Check video YouTube này đã tồn tại chưa
            const existingLesson = await DictationModel.findOne({ youtubeVideoId }).lean();
            if (existingLesson) {
                throw AppError.conflictError(
                    `Video YouTube này đã được sử dụng cho bài học: "${existingLesson.title}"`
                );
            }

            // ✅ Nếu chưa có → Fetch transcript (tốn 1 request)
            const rawBreaks: IRawBreak[] = await this.youtubeService.fetchAndParseCaptions(youtubeVideoId);

            // STEP 2: Thu thập texts cần dịch
            const allTextsToTranslate = new Set<string>();
            allTextsToTranslate.add(title);

            rawBreaks.forEach(item => {
                const originalText = item.text.trim();
                allTextsToTranslate.add(originalText);
            });

            const textsToTranslateArray = Array.from(allTextsToTranslate);
            const sentences = textsToTranslateArray.filter(t => t !== title);

            // STEP 3: Xử lý song song với error handling
            let translationMap: Map<string, string>;
            let vocabularyMap: Map<string, IWord[]>;

            try {
                [translationMap, vocabularyMap] = await Promise.all([
                    this.youtubeService.translateBatch(textsToTranslateArray),
                    this.youtubeService.analyzeWithGeminiBatch(sentences)
                ]);
            } catch (error) {
                console.error("Error in parallel API calls:", error);
                throw AppError.internalServerError(
                    "Không thể xử lý dữ liệu từ YouTube hoặc dịch thuật. Vui lòng thử lại.",
                    error instanceof Error ? error.stack : undefined
                );
            }

            // STEP 4: Xử lý Breaks
            const processedBreaks: IDictationBreak[] = rawBreaks.map((item: IRawBreak, index: number) => {
                const originalText = item.text.trim();
                const words: IWord[] = vocabularyMap.get(originalText) || [];

                return {
                    breakNumber: index + 1,
                    startTime: item.start / 1000,
                    endTime: item.end / 1000,
                    originalText,
                    textTranslation: translationMap.get(originalText) || 'N/A',
                    words,
                };
            });

            // STEP 5: Lưu vào DB
            const lessonTranslation = translationMap.get(title) || await this.youtubeService.simpleTranslate(title);

            const newLesson = new DictationModel({
                title,
                youtubeVideoId,
                lessonTranslation,
                breaks: processedBreaks,
            });

            await newLesson.save();

            const savedLesson = newLesson.toObject();
            return {
                ...savedLesson,
                _id: savedLesson._id.toString()
            } as IDictation;

        } catch (error) {
            console.error("Error in createAndSaveLesson:", error);

            if (error instanceof AppError) {
                throw error;
            }

            throw AppError.internalServerError(
                "Không thể tạo bài học dictation",
                error instanceof Error ? error.stack : undefined
            );
        }
    }

    /**
     * FIND LESSON BY ID (ADMIN - No limit)
     */
    async findLessonById(lessonId: string): Promise<IDictation | null> {
        const lesson = await DictationModel.findById(lessonId)
            .select('-__v')
            .lean();

        if (!lesson) {
            return null;
        }

        return {
            ...lesson,
            _id: lesson._id.toString()
        } as IDictation;
    }

    /**
     * GET ALL DICTATION LESSONS (ADMIN - No limit)
     */
    async getAllDictations(): Promise<Array<{ _id: string; title: string; lessonTranslation: string; youtubeVideoId: string }>> {
        const lessons = await DictationModel.find()
            .select('_id title lessonTranslation youtubeVideoId')
            .lean();

        return lessons.map(lesson => ({
            _id: lesson._id.toString(),
            title: lesson.title,
            lessonTranslation: lesson.lessonTranslation,
            youtubeVideoId: lesson.youtubeVideoId
        }));
    }

    /**
     * GET DICTATION LESSONS FOR STUDENT (Limited to 10 free lessons)
     */
    async getDictationsForStudent(studentId?: string): Promise<Array<{ _id: string; title: string; lessonTranslation: string; youtubeVideoId: string; is_locked: boolean }>> {
        const FREE_LESSON_LIMIT = 10;

        // Check if student has purchased any course
        const hasPurchased = studentId ? await this.hasPurchasedAnyCourse(studentId) : false;

        const allLessons = await DictationModel.find()
            .select('_id title lessonTranslation youtubeVideoId')
            .sort({ createdAt: 1 })
            .lean();

        return allLessons.map((lesson, index) => ({
            _id: lesson._id.toString(),
            title: lesson.title,
            lessonTranslation: lesson.lessonTranslation,
            youtubeVideoId: lesson.youtubeVideoId,
            is_locked: !hasPurchased && index >= FREE_LESSON_LIMIT
        }));
    }

    /**
     * GET DICTATION LESSON BY ID (STUDENT - Check access)
     */
    async getDictationByIdForStudent(lessonId: string, studentId?: string): Promise<IDictation> {
        const lesson = await DictationModel.findById(lessonId).lean();
        if (!lesson) {
            throw AppError.notFoundError("Bài học dictation không tồn tại");
        }

        // Check if student has purchased any course
        const hasPurchased = studentId ? await this.hasPurchasedAnyCourse(studentId) : false;

        if (!hasPurchased) {
            // Get list of free lessons (first 10)
            const freeLessons = await DictationModel.find()
                .sort({ createdAt: 1 })
                .limit(10)
                .select('_id')
                .lean();

            const freeLessonIds = freeLessons.map(l => l._id.toString());

            // Check if current lesson is in free list
            if (!freeLessonIds.includes(lesson._id.toString())) {
                throw AppError.forbiddenError("Bạn cần mua khóa học để mở khóa bài học này");
            }
        }
        return {
            ...lesson,
            _id: lesson._id.toString()
        } as IDictation;
    }

    /**
     * DELETE MULTIPLE DICTATION LESSONS
     */
    async deleteDictations(lessonIds: string[]): Promise<{ deletedCount: number; deletedIds: string[]; message: string }> {
        const result = await DictationModel.deleteMany({
            _id: { $in: lessonIds }
        });

        return {
            deletedCount: result.deletedCount || 0,
            deletedIds: lessonIds,
            message: `Đã xóa ${result.deletedCount} bài học dictation`
        };
    }

    private async hasPurchasedAnyCourse(studentId: string): Promise<boolean> {
        const EnrollmentModel = (await import('../models/enrollment.model')).default;
        const enrollment = await EnrollmentModel.findOne({ student: studentId }).lean();
        return !!enrollment;
    }
}

export default DictationService;
