import { injectable } from "tsyringe";
import VocabularySetModel from "../models/vocabulary.model";
import EnrollmentModel from "../models/enrollment.model";
import AppError from "../utils/AppError";

@injectable()
class StudentVocabularyService {
    // Lay danh sach sets trong 1 course (khong co cards)
    getVocabularySetsByCourse = async (studentId: string, courseId: string) => {
        // Kiem tra student da enroll course chua
        // const enrollments = await EnrollmentModel.find({ student: studentId })
        //     .populate("roadmap")
        //     .lean();

        // const enrolledCourseIds = new Set<string>();
        // enrollments.forEach((enrollment: any) => {
        //     if (enrollment.roadmap?.courses) {
        //         enrollment.roadmap.courses.forEach((cId: any) => {
        //             enrolledCourseIds.add(cId.toString());
        //         });
        //     }
        // });

        // if (!enrolledCourseIds.has(courseId)) {
        //     throw AppError.forbiddenError("Bạn chưa đăng ký khóa học này");
        // }

        // Lay danh sach sets (khong populate cards)
        const sets = await VocabularySetModel.find({ course_id: courseId })
            .select("_id part_of_speech day_number title description cards")
            .lean();

        return sets.map(set => ({
            _id: set._id.toString(),
            part_of_speech: set.part_of_speech,
            day_number: set.day_number,
            title: set.title,
            description: set.description,
            total_cards: set.cards.length
        }));
    };

    // Lay chi tiet 1 set (co day du cards)
    getVocabularySetById = async (studentId: string, setId: string) => {
        const set = await VocabularySetModel.findById(setId).lean();
        if (!set) {
            throw AppError.notFoundError("Bộ từ vựng không tồn tại");
        }

        // // Kiem tra student da enroll course chua
        // const enrollments = await EnrollmentModel.find({ student: studentId })
        //     .populate("roadmap")
        //     .lean();

        // const enrolledCourseIds = new Set<string>();
        // enrollments.forEach((enrollment: any) => {
        //     if (enrollment.roadmap?.courses) {
        //         enrollment.roadmap.courses.forEach((courseId: any) => {
        //             enrolledCourseIds.add(courseId.toString());
        //         });
        //     }
        // });

        // if (!enrolledCourseIds.has(set.course_id.toString())) {
        //     throw AppError.forbiddenError("Bạn chưa đăng ký khóa học này");
        // }

        // Tra ve day du thong tin
        return {
            _id: set._id.toString(),
            course_id: set.course_id.toString(),
            part_of_speech: set.part_of_speech,
            day_number: set.day_number,
            title: set.title,
            description: set.description,
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
