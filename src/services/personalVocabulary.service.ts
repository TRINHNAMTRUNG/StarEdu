import { injectable } from "tsyringe";
import PersonalVocabularyModel from "../models/personalVocabulary.model";
import AppError from "../utils/AppError";
import GeminiService from "./gemini.service";
import { getAzureTTS } from "./azure.service";

interface AddWordDTO {
    word: string;
    definition: string;
    example?: string;
    translation?: string;
    phonetic?: string;
    audioUrl?: string;
    part_of_speech?: string;
    source?: string;
    source_id?: string;
    source_type?: string;
    notes?: string;
    tags?: string[];
}

interface UpdateWordDTO {
    definition?: string;
    example?: string;
    translation?: string;
    phonetic?: string;
    audioUrl?: string;
    part_of_speech?: string;
    notes?: string;
    tags?: string[];
    mastery_level?: number;
    is_favorite?: boolean;
}

@injectable()
class PersonalVocabularyService {
    constructor(
        private geminiService: GeminiService
    ) {}

    /**
     * Tự động generate thông tin từ vựng từ Gemini AI
     */
    autoGenerateWord = async (userId: string, word: string) => {
        try {
            // Gọi Gemini để lấy thông tin đầy đủ
            const geminiResults = await this.geminiService.getGeminiContentBatch([{
                term: word.trim(),
                mainMeaning: ""
            }]);

            if (!geminiResults || geminiResults.length === 0) {
                throw AppError.badRequestError("Không thể tạo thông tin từ vựng");
            }

            const llmData = geminiResults[0].data;

            // Generate audio UK và US
            const [audioUS_url, audioUK_url] = await Promise.all([
                getAzureTTS(word.trim(), "en-US"),
                getAzureTTS(word.trim(), "en-GB")
            ]);

            // Kiểm tra từ đã tồn tại chưa
            const existingWord = await PersonalVocabularyModel.findOne({
                user_id: userId,
                word: word.toLowerCase().trim()
            });

            if (existingWord) {
                throw AppError.badRequestError("Từ này đã có trong bộ từ của bạn");
            }

            // Lấy nghĩa tiếng Việt từ collocation đầu tiên (nếu có)
            const mainMeaning = llmData.collocations && llmData.collocations.length > 0 
                ? llmData.collocations[0].meaning 
                : "";

            // Tạo từ mới với thông tin từ Gemini
            const newWord = await PersonalVocabularyModel.create({
                user_id: userId,
                word: word.toLowerCase().trim(),
                definition: mainMeaning, // Nghĩa tiếng Việt
                example: llmData.examples && llmData.examples.length > 0 ? llmData.examples[0] : "",
                phonetic: llmData.ipa || "",
                audioUrl: audioUS_url, // Default US
                part_of_speech: 'other', // Có thể enhance sau
                notes: llmData.collocations && llmData.collocations.length > 0
                    ? llmData.collocations.map(c => `${c.phrase} — ${c.meaning}`).join('\n')
                    : "",
                source: 'manual',
                tags: ['auto-generated']
            });

            return {
                message: "Đã tạo từ vựng tự động",
                word: newWord,
                audioUK: audioUK_url,
                audioUS: audioUS_url,
                collocations: llmData.collocations || []
            };
        } catch (error: any) {
            if (error.code === 11000) {
                throw AppError.badRequestError("Từ này đã có trong bộ từ của bạn");
            }
            throw error;
        }
    };

    /**
     * Thêm từ mới vào bộ từ cá nhân
     */
    addWord = async (userId: string, wordData: AddWordDTO) => {
        try {
            // Kiểm tra từ đã tồn tại chưa
            const existingWord = await PersonalVocabularyModel.findOne({
                user_id: userId,
                word: wordData.word.toLowerCase().trim()
            });

            if (existingWord) {
                throw AppError.badRequestError("Từ này đã có trong bộ từ của bạn");
            }

            const newWord = await PersonalVocabularyModel.create({
                user_id: userId,
                ...wordData,
                word: wordData.word.toLowerCase().trim()
            });

            return {
                message: "Đã thêm từ vào bộ từ cá nhân",
                word: newWord
            };
        } catch (error: any) {
            if (error.code === 11000) {
                throw AppError.badRequestError("Từ này đã có trong bộ từ của bạn");
            }
            throw error;
        }
    };

    /**
     * Lấy tất cả từ để luyện tập (format như VocabularySet)
     */
    getAsVocabularySet = async (userId: string) => {
        const words = await PersonalVocabularyModel.find({ user_id: userId })
            .sort({ createdAt: -1 });

        // Convert sang format FlashCard (match với vocabularyApi.ts interface)
        const cards = words.map(word => {
            // Parse collocations từ notes
            const collocations: Array<{ phrase: string; meaning: string }> = [];
            if (word.notes) {
                const lines = word.notes.split('\n');
                for (const line of lines) {
                    if (line.includes('—')) {
                        const [phrase, meaning] = line.split('—').map(s => s.trim());
                        if (phrase && meaning) {
                            collocations.push({ phrase, meaning });
                        }
                    }
                }
            }

            return {
                _id: word._id.toString(),
                term: word.word,
                mainMeaning: word.definition,
                ipa: word.phonetic || "",
                audioUS_url: word.audioUrl || "", // Default dùng audioUrl cho cả US/UK
                audioUK_url: word.audioUrl || "",
                example: word.example || "",
                translation: word.translation || "",
                collocations: collocations.length > 0 ? collocations : undefined
            };
        });

        return {
            _id: "personal",
            name: "Bộ Từ Cá Nhân",
            description: "Tất cả từ vựng bạn đã lưu",
            cards,
            total_words: cards.length,
            created_by: userId,
            is_public: false
        };
    };

    /**
     * Lấy tất cả từ trong bộ từ cá nhân
     */
    getMyVocabulary = async (
        userId: string, 
        page: number = 1, 
        limit: number = 20,
        filters?: {
            tags?: string;
            mastery_level?: number;
            is_favorite?: boolean;
            search?: string;
        }
    ) => {
        const query: any = { user_id: userId };

        // Apply filters
        if (filters?.tags) {
            query.tags = filters.tags;
        }
        if (filters?.mastery_level !== undefined) {
            query.mastery_level = filters.mastery_level;
        }
        if (filters?.is_favorite !== undefined) {
            query.is_favorite = filters.is_favorite;
        }
        if (filters?.search) {
            query.$or = [
                { word: { $regex: filters.search, $options: 'i' } },
                { definition: { $regex: filters.search, $options: 'i' } },
                { translation: { $regex: filters.search, $options: 'i' } }
            ];
        }

        const [words, total] = await Promise.all([
            PersonalVocabularyModel.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            PersonalVocabularyModel.countDocuments(query)
        ]);

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            words
        };
    };

    /**
     * Lấy thống kê bộ từ
     */
    getStatistics = async (userId: string) => {
        const [
            total,
            byMastery,
            favorites,
            reviewedToday
        ] = await Promise.all([
            PersonalVocabularyModel.countDocuments({ user_id: userId }),
            PersonalVocabularyModel.aggregate([
                { $match: { user_id: userId } },
                { $group: { _id: "$mastery_level", count: { $sum: 1 } } }
            ]),
            PersonalVocabularyModel.countDocuments({ user_id: userId, is_favorite: true }),
            PersonalVocabularyModel.countDocuments({
                user_id: userId,
                last_reviewed: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            })
        ]);

        return {
            total,
            favorites,
            reviewedToday,
            byMastery: byMastery.reduce((acc: any, item: any) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        };
    };

    /**
     * Cập nhật từ
     */
    updateWord = async (userId: string, wordId: string, updates: UpdateWordDTO) => {
        const word = await PersonalVocabularyModel.findOneAndUpdate(
            { _id: wordId, user_id: userId },
            { $set: updates },
            { new: true }
        );

        if (!word) {
            throw AppError.notFoundError("Không tìm thấy từ này trong bộ từ của bạn");
        }

        return {
            message: "Đã cập nhật từ",
            word
        };
    };

    /**
     * Xóa từ
     */
    deleteWord = async (userId: string, wordId: string) => {
        const word = await PersonalVocabularyModel.findOneAndDelete({
            _id: wordId,
            user_id: userId
        });

        if (!word) {
            throw AppError.notFoundError("Không tìm thấy từ này trong bộ từ của bạn");
        }

        return {
            message: "Đã xóa từ khỏi bộ từ cá nhân"
        };
    };

    /**
     * Đánh dấu từ là yêu thích
     */
    toggleFavorite = async (userId: string, wordId: string) => {
        const word = await PersonalVocabularyModel.findOne({
            _id: wordId,
            user_id: userId
        });

        if (!word) {
            throw AppError.notFoundError("Không tìm thấy từ này");
        }

        word.is_favorite = !word.is_favorite;
        await word.save();

        return {
            message: word.is_favorite ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích",
            word
        };
    };

    /**
     * Cập nhật trạng thái ôn tập
     */
    markAsReviewed = async (userId: string, wordId: string, masteryLevel?: number) => {
        const updates: any = {
            $inc: { times_reviewed: 1 },
            $set: { last_reviewed: new Date() }
        };

        if (masteryLevel !== undefined) {
            updates.$set.mastery_level = Math.min(5, Math.max(0, masteryLevel));
        }

        const word = await PersonalVocabularyModel.findOneAndUpdate(
            { _id: wordId, user_id: userId },
            updates,
            { new: true }
        );

        if (!word) {
            throw AppError.notFoundError("Không tìm thấy từ này");
        }

        return {
            message: "Đã cập nhật trạng thái ôn tập",
            word
        };
    };

    /**
     * Lấy danh sách từ cần ôn (chưa thành thạo)
     */
    getWordsToReview = async (userId: string, limit: number = 20) => {
        const words = await PersonalVocabularyModel.find({
            user_id: userId,
            mastery_level: { $lt: 5 }
        })
            .sort({ last_reviewed: 1, mastery_level: 1 }) // Ưu tiên từ lâu không ôn và mastery thấp
            .limit(limit)
            .lean();

        return words;
    };

    /**
     * Lấy tất cả tags
     */
    getAllTags = async (userId: string) => {
        const result = await PersonalVocabularyModel.aggregate([
            { $match: { user_id: userId } },
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        return result.map(item => ({
            tag: item._id,
            count: item.count
        }));
    };
}

export default PersonalVocabularyService;
