import { injectable } from "tsyringe";
import mongoose from "mongoose";
import VocabularySetModel from "../models/vocabulary.model";
import { CreateSetReqDto, AddFlashCardsReqDto } from "../dtos/request/vocabulary.request.dto";
import AppError from "../utils/AppError";
import { getGeminiContentBatch } from "./gemini.service";
import { getAzureTTS } from "./azure.service";
import pLimit from "p-limit";
const CONCURRENT_GEMINI_LIMIT = 4; // Giảm từ 5 xuống 4 để tránh overload
const geminiLimit = pLimit(CONCURRENT_GEMINI_LIMIT);
@injectable()
class VocabularyService {
    getVocabularySets = async (part_of_speech: string, page: number, limit: number) => {
        const query: any = {};
        if (part_of_speech) {
            query.part_of_speech = part_of_speech;
        }

        const sets = await VocabularySetModel.find(query)
            .select("_id part_of_speech day_number title description is_free cards")
            .sort({ day_number: 1 })
            .lean();

        return sets.map(set => ({
            _id: set._id.toString(),
            part_of_speech: set.part_of_speech,
            day_number: set.day_number,
            title: set.title,
            description: set.description,
            total_cards: set.cards.length,
            is_free: set.is_free,
            is_locked: false  // Admin thấy tất cả
        }));
    };

    // Admin: Lấy chi tiết 1 set (full access)
    getVocabularySetById = async (setId: string) => {
        const set = await VocabularySetModel.findById(setId).lean();
        if (!set) {
            throw AppError.notFoundError("Bộ từ vựng không tồn tại");
        }

        return {
            _id: set._id.toString(),
            part_of_speech: set.part_of_speech,
            day_number: set.day_number,
            title: set.title,
            description: set.description,
            is_free: set.is_free,
            is_locked: false,
            cards: set.cards.map((card: any) => ({
                _id: card._id.toString(),
                term: card.term,
                mainMeaning: card.mainMeaning,
                example: card.example,
                ipa: card.ipa,
                collocations: card.collocations || [],
                audioUS_url: card.audioUS_url,
                audioUK_url: card.audioUK_url
            }))
        };
    };

    /**
     * Tạo mới 1 bộ flashcard
     */
    createVocabularySet = async (setInfo: CreateSetReqDto) => {
        // Kiem tra trung lap
        const existingSet = await VocabularySetModel.findOne({
            part_of_speech: setInfo.part_of_speech,
            day_number: setInfo.day_number
        });

        if (existingSet) {
            throw AppError.conflictError("Bộ từ vựng với từ loại và ngày này đã tồn tại");
        }

        const set = await VocabularySetModel.create({
            ...setInfo,
            cards: []
        });

        return {
            ...set.toObject(),
            _id: set._id.toString()
        };
    };


    /**
     * Thêm 1 hoặc nhiều flashcard vào bộ
     */
    addFlashCards = async (setId: string, dto: AddFlashCardsReqDto) => {
        // 1️ Kiểm tra trùng trong payload
        const lowerTerms = dto.cards.map(c => c.term.trim().toLowerCase());
        const duplicates = lowerTerms.filter((t, i) => lowerTerms.indexOf(t) !== i);
        if (duplicates.length > 0) {
            const uniqueDup = [...new Set(duplicates)];
            throw AppError.conflictError(
                `Payload có các từ trùng: ${uniqueDup.join(", ")}`
            );
        }

        // 2 Lấy bộ hiện có
        const existing = await VocabularySetModel.findById(setId)
            .select("cards.term")
            .lean();
        if (!existing) throw AppError.notFoundError("Bộ flashcard không tồn tại");

        const existingTerms = new Set(existing.cards.map(c => c.term.trim().toLowerCase()));

        // 3️ Xử lý các từ mới
        const newTerms = dto.cards.filter(c => {
            const term = c.term.trim();
            return term && !existingTerms.has(term.toLowerCase());
        });

        if (newTerms.length === 0)
            throw AppError.conflictError("Không có từ mới để thêm.");

        // 4️ Gọi Gemini BATCH cho TẤT CẢ từ cùng lúc
        try {
            // Bước 1: Gọi Gemini batch
            const geminiResults = await getGeminiContentBatch(
                newTerms.map(card => ({
                    term: card.term.trim(),
                    mainMeaning: (card.main_meaning || "").trim(),
                }))
            );

            console.log(`✅ Gemini batch completed for ${geminiResults.length} terms`);

            // Bước 2: Gọi TTS
            const newDocs = await Promise.all(
                geminiResults.map(async ({ term, data: llmData }) => {
                    const mainMeaning = newTerms.find(c => c.term.trim() === term)?.main_meaning || "";

                    const [audioUS_url, audioUK_url] = await Promise.all([
                        getAzureTTS(term, "en-US"),
                        getAzureTTS(term, "en-GB"),
                    ]);

                    existingTerms.add(term.toLowerCase());

                    return {
                        _id: new mongoose.Types.ObjectId(),
                        term,
                        mainMeaning,
                        ipa: llmData.ipa,
                        collocations: llmData.collocations,
                        example: llmData.examples[0],
                        audioUS_url,
                        audioUK_url,
                    };
                })
            );

            console.log("✅ TTS completed, uploading to DB...");

            // 5️ Push vào DB
            const updated = await VocabularySetModel.findByIdAndUpdate(
                setId,
                { $push: { cards: { $each: newDocs } } },
                { new: true }
            ).lean();

            if (!updated)
                throw AppError.internalServerError("Thêm flashcard thất bại.");

            return {
                set_id: updated._id.toString(),
                addedCount: newDocs.length,
                newCards: newDocs.map(c => ({
                    _id: c._id.toString(),
                    term: c.term,
                    mainMeaning: c.mainMeaning,
                    ipa: c.ipa,
                    collocations: c.collocations,
                    examples: [c.example], // Chuyển thành array
                })),
                totalCards: updated.cards.length,
            };
        } catch (error) {
            console.error(" Error in addFlashCards:", error);
            throw error;
        }
    };

    /**
     * Xóa 1 hoặc nhiều flashcard trong bộ
     */
    deleteFlashCards = async (setId: string, cardIds: string[]) => {
        const set = await VocabularySetModel.findById(setId);
        if (!set) {
            throw AppError.notFoundError("Bộ từ vựng không tồn tại");
        }

        // ✅ Sử dụng $pull để xóa trong MongoDB thay vì filter
        await VocabularySetModel.findByIdAndUpdate(
            setId,
            { $pull: { cards: { _id: { $in: cardIds } } } }
        );

        // Lấy lại set sau khi xóa
        const updatedSet = await VocabularySetModel.findById(setId).lean();
        if (!updatedSet) {
            throw AppError.notFoundError("Bộ từ vựng không tồn tại");
        }

        return {
            ...updatedSet,
            _id: updatedSet._id.toString(),
            cards: updatedSet.cards.map((card: any) => ({
                ...card,
                _id: card._id.toString(),
                collocations: (card.collocations || []).map((col: any) => ({
                    phrase: col.phrase,
                    meaning: col.meaning
                }))
            }))
        };
    };

    /**
     * Xóa 1 hoặc nhiều bộ flashcard
     */
    deleteVocabularySets = async (setIds: string[]) => {
        const result = await VocabularySetModel.deleteMany({
            _id: { $in: setIds }
        });

        return {
            deletedCount: result.deletedCount,
            message: `Đã xóa ${result.deletedCount} bộ từ vựng`
        };
    };
}

export default VocabularyService;
