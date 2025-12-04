import { injectable } from "tsyringe";
import VocabularySetModel from "../models/vocabulary.model";
import StudentVocabularySetModel from "../models/student-vocabulary.model";
import EnrollmentModel from "../models/enrollment.model";
import AppError from "../utils/AppError";
import GeminiService from "./gemini.service";
import { getAzureTTS } from "./azure.service";

@injectable()
class StudentVocabularyService {
    private readonly FREE_SET_LIMIT = 2;

    constructor(private geminiService: GeminiService) {}

    // Helper method to check if student has purchased any course
    private hasPurchasedAnyCourse = async (studentId: string): Promise<boolean> => {
        const enrollment = await EnrollmentModel.findOne({
            student: studentId,
            status: "active"
        }).lean();
        return !!enrollment;
    };

    // Lấy tất cả bộ từ vựng (có thể lọc theo part_of_speech)
    getAllVocabularySets = async (studentId: string, partOfSpeech?: string) => {
        // Check if student has purchased any course
        const hasPurchased = await this.hasPurchasedAnyCourse(studentId);

        // Tạo filter query
        const filter: any = {};
        if (partOfSpeech) {
            filter.part_of_speech = partOfSpeech;
        }

        // Lấy danh sách sets với filter
        let sets = await VocabularySetModel.find(filter)
            .select("_id part_of_speech day_number title description cards")
            .sort({ day_number: 1 }) // Sắp xếp theo ngày
            .lean();

        // Neu chua mua -> Chi lay 2 sets dau tien (free) THEO TỪNG part_of_speech
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

    /**
     * Tạo set từ vựng mới bằng AI theo chủ đề (cho student)
     */
    generateVocabularySetByTopic = async (userId: string, topic: string, count: number = 15) => {
        const trimmedTopic = topic.trim();

        if (!trimmedTopic) {
            throw AppError.badRequestError("Chủ đề không được để trống");
        }

        if (count < 5 || count > 30) {
            throw AppError.badRequestError("Số lượng từ phải từ 5 đến 30");
        }

        // Bước 1: Gọi AI để tạo danh sách từ vựng theo chủ đề
        const prompt = `
Bạn là một chuyên gia tiếng Anh. Hãy tạo một danh sách ${count} từ vựng tiếng Anh liên quan đến chủ đề: "${trimmedTopic}".

Yêu cầu:
1. Các từ phải phổ biến, thực tế và hữu ích
2. Mỗi từ kèm nghĩa tiếng Việt chính xác
3. Đa dạng loại từ (danh từ, động từ, tính từ...)
4. Phù hợp với trình độ B1-B2

Trả về JSON với format:
{
  "title": "Từ vựng về [chủ đề]",
  "description": "Mô tả ngắn gọn về bộ từ vựng này",
  "words": [
    {
      "term": "từ tiếng Anh",
      "mainMeaning": "nghĩa tiếng Việt"
    }
  ]
}
        `.trim();

        try {
            const response = await this.geminiService["ai"].models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                },
            });

            const jsonString = response.text?.trim();
            if (!jsonString) {
                throw AppError.internalServerError("AI không trả về dữ liệu");
            }

            const aiData = JSON.parse(jsonString) as {
                title: string;
                description: string;
                words: Array<{ term: string; mainMeaning: string }>;
            };

            if (!aiData.words || aiData.words.length === 0) {
                throw AppError.internalServerError("AI không tạo được từ vựng");
            }

            // Bước 2: Lấy chi tiết cho từng từ (IPA, collocations, examples)
            console.log(`Generating details for ${aiData.words.length} words...`);
            const detailsResults = await this.geminiService.getGeminiContentBatch(aiData.words);

            // Bước 3: Tạo audio cho từng từ
            console.log("Generating audio files...");
            const cardsWithAudio = await Promise.all(
                detailsResults.map(async (result) => {
                    const word = aiData.words.find((w) => w.term === result.term);
                    if (!word) return null;

                    // Tạo audio US và UK
                    const [audioUS, audioUK] = await Promise.all([
                        getAzureTTS(result.term, "en-US"),
                        getAzureTTS(result.term, "en-GB"),
                    ]);

                    return {
                        term: result.term,
                        mainMeaning: word.mainMeaning,
                        ipa: result.data.ipa,
                        collocations: result.data.collocations,
                        example: result.data.examples[0] || "",
                        audioUS_url: audioUS || "",
                        audioUK_url: audioUK || "",
                    };
                })
            );

            const validCards = cardsWithAudio.filter((card) => card !== null);

            if (validCards.length === 0) {
                throw AppError.internalServerError("Không thể tạo flashcard");
            }

            // Bước 4: Lưu vào database
            const newSet = await StudentVocabularySetModel.create({
                user_id: userId,
                title: aiData.title || `Từ vựng về ${trimmedTopic}`,
                description: aiData.description || `Bộ từ vựng được tạo tự động về chủ đề: ${trimmedTopic}`,
                topic: trimmedTopic,
                cards: validCards,
                is_ai_generated: true,
            });

            return {
                _id: newSet._id.toString(),
                title: newSet.title,
                description: newSet.description,
                topic: newSet.topic,
                total_cards: newSet.cards.length,
                cards: newSet.cards.map((card: any) => ({
                    _id: card._id.toString(),
                    term: card.term,
                    mainMeaning: card.mainMeaning,
                    ipa: card.ipa,
                    collocations: card.collocations || [],
                    example: card.example,
                    audioUS_url: card.audioUS_url,
                    audioUK_url: card.audioUK_url,
                })),
                createdAt: newSet.createdAt,
            };
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            console.error("Generate vocabulary set error:", error);
            throw AppError.internalServerError("Lỗi khi tạo set từ vựng", error?.message);
        }
    };

    /**
     * Lấy tất cả set từ vựng cá nhân của student
     */
    getMyCustomVocabularySets = async (userId: string) => {
        const sets = await StudentVocabularySetModel.find({ user_id: userId })
            .select("_id title description topic cards createdAt")
            .sort({ createdAt: -1 })
            .lean();

        return sets.map((set) => ({
            _id: set._id.toString(),
            title: set.title,
            description: set.description,
            topic: set.topic,
            total_cards: set.cards.length,
            createdAt: set.createdAt,
        }));
    };

    /**
     * Lấy chi tiết 1 set từ vựng cá nhân
     */
    getMyCustomVocabularySetById = async (userId: string, setId: string) => {
        const set = await StudentVocabularySetModel.findOne({
            _id: setId,
            user_id: userId,
        }).lean();

        if (!set) {
            throw AppError.notFoundError("Không tìm thấy set từ vựng");
        }

        return {
            _id: set._id.toString(),
            title: set.title,
            description: set.description,
            topic: set.topic,
            cards: set.cards.map((card: any) => ({
                _id: card._id.toString(),
                term: card.term,
                mainMeaning: card.mainMeaning,
                example: card.example,
                ipa: card.ipa,
                collocations: card.collocations || [],
                audioUS_url: card.audioUS_url,
                audioUK_url: card.audioUK_url,
            })),
            createdAt: set.createdAt,
        };
    };

    /**
     * Xóa set từ vựng cá nhân
     */
    deleteMyCustomVocabularySet = async (userId: string, setId: string) => {
        const set = await StudentVocabularySetModel.findOneAndDelete({
            _id: setId,
            user_id: userId,
        });

        if (!set) {
            throw AppError.notFoundError("Không tìm thấy set từ vựng");
        }

        return { message: "Đã xóa set từ vựng thành công" };
    };
}

export default StudentVocabularyService;
