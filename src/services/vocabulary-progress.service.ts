import { injectable } from "tsyringe";
import VocabularyProgressModel from "../models/vocabulary-progress.model";
import VocabularySetModel from "../models/vocabulary.model";
import AppError from "../utils/AppError";

@injectable()
class VocabularyProgressService {
    /**
     * Đánh dấu một từ đã học
     */
    async markWordLearned(userId: string, setId: string, wordId: string, recorded: boolean = false) {
        // Kiểm tra set tồn tại và lấy số từ
        const vocabularySet = await VocabularySetModel.findById(setId);
        if (!vocabularySet) {
            throw AppError.notFoundError("Vocabulary set không tồn tại");
        }

        const totalWords = vocabularySet.cards.length;
        if (totalWords === 0) {
            throw AppError.badRequestError("Set không có từ nào");
        }

        // Tìm hoặc tạo progress record
        let progress = await VocabularyProgressModel.findOne({
            user_id: userId,
            set_id: setId
        });

        if (!progress) {
            progress = await VocabularyProgressModel.create({
                user_id: userId,
                set_id: setId,
                learned_words: [],
                completion_percentage: 0,
                is_completed: false,
                last_practiced: new Date()
            });
        }

        // Kiểm tra từ đã được học chưa
        const existingWordIndex = progress.learned_words.findIndex(
            (w: any) => w.word_id.toString() === wordId
        );

        if (existingWordIndex >= 0) {
            // Cập nhật trạng thái recorded
            progress.learned_words[existingWordIndex].recorded = recorded;
        } else {
            // Thêm từ mới vào danh sách đã học
            (progress.learned_words as any).push({
                word_id: wordId as any,
                learned_at: new Date(),
                recorded: recorded
            });
        }

        // Tính % hoàn thành
        const learnedCount = progress.learned_words.length;
        const completionPercentage = Math.round((learnedCount / totalWords) * 100);
        progress.completion_percentage = completionPercentage;

        // Đánh dấu hoàn thành nếu >= 70%
        progress.is_completed = completionPercentage >= 70;
        progress.last_practiced = new Date();

        await progress.save();

        return {
            _id: progress._id.toString(),
            user_id: progress.user_id.toString(),
            set_id: progress.set_id.toString(),
            learned_words: progress.learned_words.map((w: any) => ({
                word_id: w.word_id.toString(),
                learned_at: w.learned_at,
                recorded: w.recorded
            })),
            completion_percentage: progress.completion_percentage,
            is_completed: progress.is_completed,
            last_practiced: progress.last_practiced,
            total_words: totalWords,
            learned_count: learnedCount
        };
    }

    /**
     * Lấy tiến độ học của một set
     */
    async getProgress(userId: string, setId: string) {
        const vocabularySet = await VocabularySetModel.findById(setId);
        if (!vocabularySet) {
            throw AppError.notFoundError("Vocabulary set không tồn tại");
        }

        const progress = await VocabularyProgressModel.findOne({
            user_id: userId,
            set_id: setId
        });

        const totalWords = vocabularySet.cards.length;

        if (!progress) {
            return {
                set_id: setId,
                learned_words: [],
                completion_percentage: 0,
                is_completed: false,
                total_words: totalWords,
                learned_count: 0
            };
        }

        return {
            _id: progress._id.toString(),
            user_id: progress.user_id.toString(),
            set_id: progress.set_id.toString(),
            learned_words: progress.learned_words.map((w: any) => ({
                word_id: w.word_id.toString(),
                learned_at: w.learned_at,
                recorded: w.recorded
            })),
            completion_percentage: progress.completion_percentage,
            is_completed: progress.is_completed,
            last_practiced: progress.last_practiced,
            total_words: totalWords,
            learned_count: progress.learned_words.length
        };
    }

    /**
     * Lấy tất cả tiến độ của user
     */
    async getAllProgress(userId: string) {
        const progressList = await VocabularyProgressModel.find({ user_id: userId })
            .sort({ last_practiced: -1 });

        const result = await Promise.all(
            progressList.map(async (progress) => {
                const vocabularySet = await VocabularySetModel.findById(progress.set_id);
                const totalWords = vocabularySet?.cards.length || 0;

                return {
                    _id: progress._id.toString(),
                    set_id: progress.set_id.toString(),
                    set_name: vocabularySet?.title || '',
                    completion_percentage: progress.completion_percentage,
                    is_completed: progress.is_completed,
                    last_practiced: progress.last_practiced,
                    total_words: totalWords,
                    learned_count: progress.learned_words.length
                };
            })
        );

        return result;
    }
}

export default VocabularyProgressService;
