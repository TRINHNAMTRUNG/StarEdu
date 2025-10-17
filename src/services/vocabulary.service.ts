import { injectable } from "tsyringe";
import mongoose from "mongoose";
import VocabularySetModel from "../models/vocabulary.model";
import { CreateSetReqDto, AddFlashCardsReqDto } from "../dtos/request/vocabulary.request.dto";
import AppError from "../utils/AppError";
import { getGeminiContent } from "./gemini.service";
import { getAzureTTS } from "./azure.service";

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
            set_id: set._id,
            title: set.title,
            part_of_speech: set.part_of_speech,
            day_number: set.day_number,
            cards: set.cards
        };
    };


    /**
     * Tạo mới 1 bộ flashcard
     */
    createVocabularySet = async (dto: CreateSetReqDto) => {
        // Kiểm tra xem bộ ngày đó của loại từ đó đã tồn tại chưa
        const exists = await VocabularySetModel.exists({
            course_id: dto.course_id, // <--- THÊM ĐIỀU KIỆN NÀY
            part_of_speech: dto.part_of_speech,
            day_number: dto.day_number
        });
        if (exists) {
            throw AppError.conflictError("Bộ flashcard cho ngày này đã tồn tại");
        }

        const created = await VocabularySetModel.create(dto);
        return created.toObject();
    };


    /**
     * Thêm 1 hoặc nhiều flashcard vào bộ
     */
    addFlashCards = async (setId: string, dto: AddFlashCardsReqDto) => {

        // 1️⃣ Kiểm tra trùng trong payload
        const lowerTerms = dto.cards.map(c => c.term.trim().toLowerCase());
        const duplicates = lowerTerms.filter((t, i) => lowerTerms.indexOf(t) !== i);
        if (duplicates.length > 0) {
            const uniqueDup = [...new Set(duplicates)];
            throw AppError.conflictError(
                `Payload có các từ trùng: ${uniqueDup.join(", ")}`
            );
        }

        // 2️⃣ Lấy bộ hiện có
        const existing = await VocabularySetModel.findById(setId).select("cards.term").lean();
        if (!existing) throw AppError.notFoundError("Bộ flashcard không tồn tại");

        const existingTerms = new Set(existing.cards.map(c => c.term.trim().toLowerCase()));

        // 3️⃣ Sinh nội dung Gemini cho từng từ mới
        const newDocs = [];
        for (const card of dto.cards) {
            const term = card.term.trim();
            if (!term || existingTerms.has(term.toLowerCase())) continue;

            const mainMeaning = (card.mainMeaning || "").trim();
            const llmData = await getGeminiContent(term, mainMeaning);

            // (tuỳ chọn) gọi Azure để tạo file audio
            const audioUS_url = await getAzureTTS(term, "en-US");
            const audioUK_url = await getAzureTTS(term, "en-GB");

            newDocs.push({
                _id: new mongoose.Types.ObjectId(),
                term,
                mainMeaning,
                ipa: llmData.ipa,
                collocations: llmData.collocations,
                example: llmData.examples[0],
                audioUS_url,
                audioUK_url,
            });

            existingTerms.add(term.toLowerCase());
        }

        if (!newDocs.length)
            throw AppError.conflictError("Không có từ mới để thêm.");

        // 4️⃣ Push vào DB
        const updated = await VocabularySetModel.findByIdAndUpdate(
            setId,
            { $push: { cards: { $each: newDocs } } },
            { new: true }
        ).lean();

        if (!updated)
            throw AppError.internalServerError("Thêm flashcard thất bại.");

        return {
            set_id: updated._id,
            addedCount: newDocs.length,
            newCards: newDocs.map(c => ({ _id: c._id, term: c.term, mainMeaning: c.mainMeaning })),
            totalCards: updated.cards.length,
        };
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
