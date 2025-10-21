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

    /**
     * Lấy danh sách bộ flashcard theo loại từ (có phân trang)
     */
    getVocabularySets = async (
        part_of_speech: string,
        page: number,
        limit: number
    ): Promise<{ total: number; page: number; limit: number; data: any[] }> => {

        const filter: Record<string, any> = {};
        if (part_of_speech) filter.part_of_speech = part_of_speech;

        // Chạy countDocuments & find song song
        const [total, sets] = await Promise.all([
            VocabularySetModel.countDocuments(filter),
            VocabularySetModel.find(filter)
                .sort({ day_number: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return { total, page, limit, data: sets };
    };


    /**
     * Lấy toàn bộ flashcard của 1 bộ (không phân trang)
     */
    getFlashCardsBySet = async (setId: string) => {
        if (!mongoose.isValidObjectId(setId)) {
            throw AppError.badRequestError("ID bộ flashcard không hợp lệ");
        }

        const set = await VocabularySetModel.findById(setId).lean();
        if (!set) throw AppError.notFoundError("Bộ flashcard không tồn tại");

        return {
            set_id: set._id.toString(),
            title: set.title,
            part_of_speech: set.part_of_speech,
            day_number: set.day_number,
            cards: set.cards.map(card => ({
                ...card,
                _id: card._id.toString()
            }))
        };
    };


    /**
     * Tạo mới 1 bộ flashcard
     */
    createVocabularySet = async (dto: CreateSetReqDto) => {
        // Kiểm tra xem bộ ngày đó của loại từ đó đã tồn tại chưa
        const exists = await VocabularySetModel.exists({
            course_id: dto.course_id,
            part_of_speech: dto.part_of_speech,
            day_number: dto.day_number
        });
        if (exists) {
            throw AppError.conflictError("Bộ flashcard cho ngày này đã tồn tại");
        }

        const created = await VocabularySetModel.create(dto);
        const obj = created.toObject();

        return {
            ...obj,
            _id: obj._id.toString(),
            course_id: obj.course_id.toString(),
            cards: obj.cards.map(card => ({
                ...card,
                _id: card._id.toString()
            }))
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
                    mainMeaning: (card.mainMeaning || "").trim(),
                }))
            );

            console.log(`✅ Gemini batch completed for ${geminiResults.length} terms`);

            // Bước 2: Gọi TTS
            const newDocs = await Promise.all(
                geminiResults.map(async ({ term, data: llmData }) => {
                    const mainMeaning = newTerms.find(c => c.term.trim() === term)?.mainMeaning || "";

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
    async deleteFlashCards(setId: string, cardIds: string[]) {
        if (!mongoose.Types.ObjectId.isValid(setId)) {
            throw AppError.badRequestError("ID bộ flashcard không hợp lệ");
        }

        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            throw AppError.badRequestError("Danh sách cardIds không hợp lệ");
        }

        const setExists = await VocabularySetModel.exists({ _id: setId });
        if (!setExists) {
            throw AppError.notFoundError("Bộ flashcard không tồn tại");
        }

        // Dùng MongoDB operator để tối ưu
        await VocabularySetModel.updateOne(
            { _id: setId },
            { $pull: { cards: { _id: { $in: cardIds.map(id => new mongoose.Types.ObjectId(id)) } } } }
        );

        const updatedSet = await VocabularySetModel.findById(setId);
        return updatedSet;
    }


    /**
     * Xóa 1 hoặc nhiều bộ flashcard
     */
    deleteVocabularySets = async (setIds: string[]) => {
        if (!Array.isArray(setIds) || setIds.length === 0) {
            throw AppError.badRequestError("Danh sách setIds không hợp lệ");
        }

        const objectIds = setIds.map(id => new mongoose.Types.ObjectId(id));
        const result = await VocabularySetModel.deleteMany({ _id: { $in: objectIds } });

        return {
            deletedCount: result.deletedCount || 0
        };
    };
}

export default VocabularyService;
