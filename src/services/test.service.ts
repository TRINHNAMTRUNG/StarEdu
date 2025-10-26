import { injectable } from "tsyringe";
import { TestModel } from "../models/test.model";
import { QuestionModel } from "../models/question.model";
import AppError from "../utils/AppError";
import mongoose from "mongoose";

@injectable()
class TestService {
    /**
     * Lấy danh sách tất cả đề thi (đã xuất bản)
     */
    getAllTests = async (page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {};

        // Chỉ lọc published nếu có filter
        if (filters?.is_published !== undefined) {
            query.is_published = filters.is_published;
        }

        if (filters?.year) {
            query.year = filters.year;
        }
        if (filters?.source) {
            query.source = filters.source;
        }

        const [total, tests] = await Promise.all([
            TestModel.countDocuments(query),
            TestModel.find(query)
                .select("title year source time_limit passing_score created_by is_published createdAt")
                .sort({ year: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return {
            total,
            page,
            limit,
            data: tests.map(test => ({
                ...test,
                _id: test._id.toString(),
                created_by: test.created_by.toString()
            }))
        };
    };

    /**
     * Lấy thông tin chi tiết đề thi (không bao gồm câu hỏi)
     */
    getTestById = async (testId: string) => {
        const test = await TestModel.findById(testId).lean();
        if (!test) {
            throw AppError.notFoundError("Đề thi không tồn tại");
        }

        return {
            ...test,
            _id: test._id.toString(),
            created_by: test.created_by.toString()
        };
    };

    /**
     * Lấy đề thi kèm tất cả câu hỏi (để làm bài)
     */
    getTestWithQuestions = async (testId: string, partNumber?: number) => {
        const test = await TestModel.findById(testId).lean();
        if (!test) {
            throw AppError.notFoundError("Đề thi không tồn tại");
        }

        if (!test.is_published) {
            throw AppError.forbiddenError("Đề thi chưa được xuất bản");
        }

        // Nếu chỉ lấy 1 part cụ thể
        if (partNumber) {
            const part = test.parts.find(p => p.partNumber === partNumber);
            if (!part) {
                throw AppError.notFoundError(`Part ${partNumber} không tồn tại trong đề thi này`);
            }

            const questions = await QuestionModel.find({
                _id: { $in: part.questionIds }
            })
                .populate({
                    path: 'subQuestions',
                    select: '-answer -explanation'
                })
                .select("-answer -explanation") // Không trả answer và explanation khi làm bài
                .lean();

            return {
                test: {
                    _id: test._id.toString(),
                    title: test.title,
                    year: test.year,
                    source: test.source,
                    audioUrl: test.audioUrl,
                    time_limit: test.time_limit
                },
                part: {
                    partNumber: part.partNumber,
                    totalQuestions: part.questionIds.length
                },
                questions: this.formatQuestions(questions)
            };
        }

        // Lấy full test với tất cả parts
        let allQuestionIds: any[] = [];
        test.parts.forEach(p => {
            p.questionIds.forEach(id => allQuestionIds.push(id));
        });
        
        const questions = await QuestionModel.find({
            _id: { $in: allQuestionIds }
        })
            .populate({
                path: 'subQuestions',
                select: '-answer -explanation'
            })
            .select("-answer -explanation")
            .lean();

        const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

        const partsWithQuestions = test.parts.map(part => ({
            partNumber: part.partNumber,
            totalQuestions: part.questionIds.length,
            questions: part.questionIds
                .map(id => questionMap.get(id.toString()))
                .filter(Boolean)
                .map(q => this.formatSingleQuestion(q))
        }));

        return {
            test: {
                _id: test._id.toString(),
                title: test.title,
                year: test.year,
                source: test.source,
                audioUrl: test.audioUrl,
                time_limit: test.time_limit,
                passing_score: test.passing_score
            },
            parts: partsWithQuestions,
            totalQuestions: allQuestionIds.length
        };
    };

    /**
     * Lấy đề thi kèm đáp án (để xem giải thích sau khi làm xong)
     */
    getTestWithAnswers = async (testId: string) => {
        const test = await TestModel.findById(testId).lean();
        if (!test) {
            throw AppError.notFoundError("Đề thi không tồn tại");
        }

        let allQuestionIds: any[] = [];
        test.parts.forEach(p => {
            p.questionIds.forEach(id => allQuestionIds.push(id));
        });

        const questions = await QuestionModel.find({
            _id: { $in: allQuestionIds }
        })
            .populate({
                path: 'subQuestions'
            })
            .lean();

        const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

        const partsWithAnswers = test.parts.map(part => ({
            partNumber: part.partNumber,
            questions: part.questionIds
                .map(id => questionMap.get(id.toString()))
                .filter(Boolean)
                .map(q => this.formatQuestionWithAnswer(q))
        }));

        return {
            test: {
                _id: test._id.toString(),
                title: test.title,
                year: test.year,
                source: test.source
            },
            parts: partsWithAnswers
        };
    };

    /**
     * Tạo đề thi mới (Admin/Teacher)
     */
    createTest = async (data: any, createdBy: string) => {
        const test = await TestModel.create({
            ...data,
            created_by: createdBy
        });

        return {
            ...test.toObject(),
            _id: test._id.toString(),
            created_by: test.created_by.toString()
        };
    };

    /**
     * Cập nhật đề thi
     */
    updateTest = async (testId: string, data: any) => {
        const test = await TestModel.findByIdAndUpdate(
            testId,
            { $set: data },
            { new: true }
        );

        if (!test) {
            throw AppError.notFoundError("Đề thi không tồn tại");
        }

        return {
            ...test.toObject(),
            _id: test._id.toString(),
            created_by: test.created_by.toString()
        };
    };

    /**
     * Xuất bản/Ẩn đề thi
     */
    publishTest = async (testId: string, isPublished: boolean) => {
        const test = await TestModel.findByIdAndUpdate(
            testId,
            { is_published: isPublished },
            { new: true }
        );

        if (!test) {
            throw AppError.notFoundError("Đề thi không tồn tại");
        }

        return {
            message: isPublished ? "Đề thi đã được xuất bản" : "Đề thi đã được ẩn",
            test: {
                _id: test._id.toString(),
                title: test.title,
                is_published: test.is_published
            }
        };
    };

    /**
     * Xóa đề thi
     */
    deleteTest = async (testId: string) => {
        const test = await TestModel.findByIdAndDelete(testId);
        if (!test) {
            throw AppError.notFoundError("Đề thi không tồn tại");
        }

        return { message: "Xóa đề thi thành công" };
    };

    // ============ HELPER METHODS ============

    private formatQuestions(questions: any[]) {
        return questions.map(q => this.formatSingleQuestion(q));
    }

    private formatSingleQuestion(q: any) {
        const formatted: any = {
            _id: q._id.toString(),
            part: q.part,
            type: q.type,
            questionNumber: q.questionNumber,
        };

        if (q.questionText) formatted.questionText = q.questionText;
        if (q.audio) formatted.audio = q.audio;
        if (q.image) formatted.image = q.image;
        if (q.contextHtml) formatted.contextHtml = q.contextHtml;
        if (q.options) formatted.options = q.options;
        if (q.transcript) formatted.transcript = q.transcript;
        if (q.groupNumber) formatted.groupNumber = q.groupNumber;
        
        // Format subQuestions nếu có
        if (q.subQuestions && q.subQuestions.length > 0) {
            formatted.subQuestions = q.subQuestions.map((sq: any) => {
                // Nếu subQuestion đã được populate (là object)
                if (typeof sq === 'object' && sq._id) {
                    return this.formatSingleQuestion(sq);
                }
                // Nếu chỉ là ID
                return sq.toString();
            });
        }

        return formatted;
    }

    private formatQuestionWithAnswer(q: any) {
        const formatted: any = {
            _id: q._id.toString(),
            part: q.part,
            type: q.type,
            questionNumber: q.questionNumber,
        };

        if (q.questionText) formatted.questionText = q.questionText;
        if (q.audio) formatted.audio = q.audio;
        if (q.image) formatted.image = q.image;
        if (q.contextHtml) formatted.contextHtml = q.contextHtml;
        if (q.options) formatted.options = q.options;
        if (q.transcript) formatted.transcript = q.transcript;
        if (q.groupNumber) formatted.groupNumber = q.groupNumber;
        if (q.answer) formatted.answer = q.answer;
        if (q.explanation) formatted.explanation = q.explanation;
        
        // Format subQuestions with answers
        if (q.subQuestions && q.subQuestions.length > 0) {
            formatted.subQuestions = q.subQuestions.map((sq: any) => {
                if (typeof sq === 'object' && sq._id) {
                    return this.formatQuestionWithAnswer(sq);
                }
                return sq.toString();
            });
        }

        return formatted;
    }
}

export default TestService;
