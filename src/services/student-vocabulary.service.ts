import { injectable } from "tsyringe";
import VocabularySetModel from "../models/vocabulary.model";
import EnrollmentModel from "../models/enrollment.model";
import AppError from "../utils/AppError";

@injectable()
class StudentVocabularyService {
    // So luong set toi da cho user chua mua
    private readonly FREE_SET_LIMIT = 2;

    // Kiem tra student da mua bat ky khoa hoc nao chua
    private async hasPurchasedAnyCourse(studentId?: string): Promise<boolean> {
        if (!studentId) return false;
        
        const enrollment = await EnrollmentModel.findOne({ student: studentId }).lean();
        return !!enrollment;
    }

    // Lay danh sach sets theo part_of_speech (khong co cards)
    getVocabularySets = async (partOfSpeech: string, studentId?: string) => {
        const hasPurchased = await this.hasPurchasedAnyCourse(studentId);

        // Lay tat ca sets cua part_of_speech
        let sets = await VocabularySetModel.find({ part_of_speech: partOfSpeech })
            .select("_id part_of_speech day_number title description is_free cards")
            .sort({ day_number: 1 })
            .lean();

        // Neu chua mua -> Chi lay 2 sets dau tien (free)
        if (!hasPurchased) {
            sets = sets.slice(0, this.FREE_SET_LIMIT);
        }

        return sets.map(set => ({
            _id: set._id.toString(),
            part_of_speech: set.part_of_speech,
            day_number: set.day_number,
            title: set.title,
            description: set.description,
            total_cards: set.cards.length,
            is_free: !hasPurchased, // Hien thi free badge neu chua mua
            is_locked: false // Tat ca sets trong list deu unlocked
        }));
    };

    // Lay chi tiet 1 set (co cards)
    getVocabularySetById = async (setId: string, studentId?: string) => {
        const set = await VocabularySetModel.findById(setId).lean();
        if (!set) {
            throw AppError.notFoundError("Bộ từ vựng không tồn tại");
        }

        // LOGIC MỚI: Ưu tiên check is_free TRƯỚC
        
        // 1. Nếu set là FREE -> Ai cũng xem được (không cần login)
        if (set.is_free) {
            return {
                _id: set._id.toString(),
                part_of_speech: set.part_of_speech,
                day_number: set.day_number,
                title: set.title,
                description: set.description,
                is_free: true,
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
        }

        // 2. Nếu set là PREMIUM -> Check đăng nhập
        if (!studentId) {
            throw AppError.unauthorizedError("Vui lòng đăng nhập để xem nội dung này");
        }

        const hasPurchased = await this.hasPurchasedAnyCourse(studentId);

        // Kiem tra xem set nay co trong danh sach FREE khong
        if (!hasPurchased) {
            const freeSets = await VocabularySetModel.find({ 
                part_of_speech: set.part_of_speech 
            })
                .sort({ day_number: 1 })
                .limit(this.FREE_SET_LIMIT)
                .select("_id")
                .lean();

            const freeSetIds = freeSets.map(s => s._id.toString());

            // Neu set khong nam trong 2 set free -> Khoa
            if (!freeSetIds.includes(set._id.toString())) {
                throw AppError.forbiddenError("Bạn cần mua khóa học để mở khóa bộ từ vựng này");
            }
        }

        // Tra ve full cards
        return {
            _id: set._id.toString(),
            part_of_speech: set.part_of_speech,
            day_number: set.day_number,
            title: set.title,
            description: set.description,
            is_free: false,
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
}

export default StudentVocabularyService;
