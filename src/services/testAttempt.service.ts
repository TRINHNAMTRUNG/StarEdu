import { injectable } from "tsyringe";
import TestAttemptModel from "../models/testAttempt.model";
import { TestModel } from "../models/test.model";
import { QuestionModel } from "../models/question.model";
import AppError from "../utils/AppError";

@injectable()
class TestAttemptService {
    /**
     * Bắt đầu làm bài thi mới
     */
    startTest = async (userId: string, testId: string) => {
        // Kiểm tra đề thi có tồn tại không
        const test = await TestModel.findById(testId);
        if (!test) {
            throw AppError.notFoundError("Đề thi không tồn tại");
        }

        if (!test.is_published) {
            throw AppError.forbiddenError("Đề thi chưa được xuất bản");
        }

        // Kiểm tra xem user có bài thi đang làm dở không
        const existingAttempt = await TestAttemptModel.findOne({
            user_id: userId,
            test_id: testId,
            status: "in_progress"
        });

        if (existingAttempt) {
            return {
                message: "Tiếp tục bài thi đang làm dở",
                attempt: {
                    _id: existingAttempt._id.toString(),
                    test_id: existingAttempt.test_id.toString(),
                    started_at: existingAttempt.started_at,
                    time_limit: existingAttempt.time_limit || test.time_limit || 120, // Include time_limit
                    total_questions: existingAttempt.total_questions,
                    current_part: existingAttempt.current_part,
                    answers: existingAttempt.answers
                }
            };
        }

        // Tạo attempt mới
        const attempt = await TestAttemptModel.create({
            user_id: userId,
            test_id: testId,
            time_limit: test.time_limit,
            total_questions: test.parts.reduce((sum, part) => sum + part.questionIds.length, 0)
        });

        return {
            message: "Bắt đầu làm bài thi",
            attempt: {
                _id: attempt._id.toString(),
                test_id: attempt.test_id.toString(),
                started_at: attempt.started_at,
                time_limit: attempt.time_limit,
                total_questions: attempt.total_questions
            }
        };
    };

    /**
     * Lưu câu trả lời (realtime, mỗi khi user chọn đáp án)
     */
    submitAnswer = async (
        attemptId: string,
        questionId: string,
        selectedAnswer: string,
        timeSpent?: number
    ) => {
        const attempt = await TestAttemptModel.findById(attemptId);
        if (!attempt) {
            throw AppError.notFoundError("Lượt thi không tồn tại");
        }

        if (attempt.status !== "in_progress") {
            throw AppError.badRequestError("Bài thi đã kết thúc, không thể thay đổi câu trả lời");
        }

        // Lấy đáp án đúng từ database
        const question = await QuestionModel.findById(questionId).select("answer");
        if (!question) {
            throw AppError.notFoundError("Câu hỏi không tồn tại");
        }

        const isCorrect = question.answer === selectedAnswer;

        // Kiểm tra xem câu hỏi đã được trả lời chưa
        const existingAnswerIndex = attempt.answers.findIndex(
            a => a.question_id?.toString() === questionId
        );

        if (existingAnswerIndex >= 0) {
            // Cập nhật câu trả lời cũ
            attempt.answers[existingAnswerIndex].question_id = questionId as any;
            attempt.answers[existingAnswerIndex].selected_answer = selectedAnswer;
            attempt.answers[existingAnswerIndex].is_correct = isCorrect;
            attempt.answers[existingAnswerIndex].time_spent = timeSpent || 0;
        } else {
            // Thêm câu trả lời mới
            attempt.answers.push({
                question_id: questionId as any,
                selected_answer: selectedAnswer,
                is_correct: isCorrect,
                time_spent: timeSpent || 0
            });
        }

        await attempt.save();

        return {
            message: "Lưu câu trả lời thành công",
            is_correct: isCorrect
        };
    };

    /**
     * Cập nhật part đang làm
     */
    updateCurrentPart = async (attemptId: string, partNumber: number) => {
        const attempt = await TestAttemptModel.findByIdAndUpdate(
            attemptId,
            { current_part: partNumber },
            { new: true }
        );

        if (!attempt) {
            throw AppError.notFoundError("Lượt thi không tồn tại");
        }

        return { message: "Cập nhật part thành công", current_part: partNumber };
    };

    /**
     * Hoàn thành bài thi và tính điểm
     */
    completeTest = async (attemptId: string, timeUsed?: number) => {
        const attempt = await TestAttemptModel.findById(attemptId);
        if (!attempt) {
            throw AppError.notFoundError("Lượt thi không tồn tại");
        }

        if (attempt.status === "completed") {
            throw AppError.badRequestError("Bài thi đã được hoàn thành trước đó");
        }

        // Tính số câu đúng
        const correctAnswers = attempt.answers.filter(a => a.is_correct).length;

        // Lấy test để biết cấu trúc parts
        const test = await TestModel.findById(attempt.test_id);
        if (!test) {
            throw AppError.notFoundError("Đề thi không tồn tại");
        }

        // Tính điểm listening (Part 1-4) và reading (Part 5-7)
        const listeningQuestions = await this.getQuestionIdsByParts(test, [1, 2, 3, 4]);
        const readingQuestions = await this.getQuestionIdsByParts(test, [5, 6, 7]);

        const listeningCorrect = attempt.answers.filter(
            a => a.is_correct && a.question_id && listeningQuestions.includes(a.question_id.toString())
        ).length;

        const readingCorrect = attempt.answers.filter(
            a => a.is_correct && a.question_id && readingQuestions.includes(a.question_id.toString())
        ).length;

        // Quy đổi điểm TOEIC (simplified - cần bảng quy đổi chính xác)
        // Handle case when test has no questions (avoid division by zero)
        const listeningScore = listeningQuestions.length > 0 
            ? this.convertToTOEICScore(listeningCorrect, listeningQuestions.length) 
            : 0;
        const readingScore = readingQuestions.length > 0 
            ? this.convertToTOEICScore(readingCorrect, readingQuestions.length) 
            : 0;
        const totalScore = listeningScore + readingScore;

        // Cập nhật attempt
        attempt.status = "completed";
        attempt.completed_at = new Date();
        attempt.correct_answers = correctAnswers;
        attempt.listening_score = listeningScore;
        attempt.reading_score = readingScore;
        attempt.total_score = totalScore;
        attempt.time_used = timeUsed;

        console.log('📊 Attempting to save with scores:', {
            correctAnswers,
            listeningScore,
            readingScore,
            totalScore,
            timeUsed,
            listeningQuestionsCount: listeningQuestions.length,
            readingQuestionsCount: readingQuestions.length
        });

        try {
            await attempt.save();
        } catch (saveError: any) {
            console.error('❌ Database save error:', saveError);
            console.error('❌ Validation errors:', saveError.errors);
            throw AppError.internalServerError(`Lỗi lưu kết quả: ${saveError.message}`);
        }

        return {
            message: "Hoàn thành bài thi",
            result: {
                attempt_id: attempt._id.toString(),
                correct_answers: correctAnswers,
                total_questions: attempt.total_questions,
                listening_score: listeningScore,
                reading_score: readingScore,
                total_score: totalScore,
                time_used: timeUsed,
                completed_at: attempt.completed_at
            }
        };
    };

    /**
     * Lấy kết quả chi tiết của 1 lượt thi
     */
    getAttemptResult = async (attemptId: string, userId: string) => {
        const attempt = await TestAttemptModel.findOne({
            _id: attemptId,
            user_id: userId
        })
            .populate("test_id", "title year source")
            .lean();

        if (!attempt) {
            throw AppError.notFoundError("Lượt thi không tồn tại");
        }

        return {
            _id: attempt._id.toString(),
            test: attempt.test_id,
            started_at: attempt.started_at,
            completed_at: attempt.completed_at,
            status: attempt.status,
            current_part: attempt.current_part,
            answers: attempt.answers.map(a => ({
                question_id: a.question_id?.toString() || "",
                selected_answer: a.selected_answer,
                is_correct: a.is_correct,
                time_spent: a.time_spent
            })),
            listening_score: attempt.listening_score,
            reading_score: attempt.reading_score,
            total_score: attempt.total_score,
            correct_answers: attempt.correct_answers,
            total_questions: attempt.total_questions,
            time_used: attempt.time_used
        };
    };

    /**
     * Lấy lịch sử các lượt thi của user
     */
    getUserAttempts = async (userId: string, page: number = 1, limit: number = 10) => {
        const [total, attempts] = await Promise.all([
            TestAttemptModel.countDocuments({ user_id: userId }),
            TestAttemptModel.find({ user_id: userId })
                .populate("test_id", "title year source")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return {
            total,
            page,
            limit,
            data: attempts.map(a => ({
                _id: a._id.toString(),
                test: a.test_id,
                started_at: a.started_at,
                completed_at: a.completed_at,
                status: a.status,
                total_score: a.total_score,
                listening_score: a.listening_score,
                reading_score: a.reading_score
            }))
        };
    };

    /**
     * Bỏ bài thi (abandon)
     */
    abandonTest = async (attemptId: string) => {
        const attempt = await TestAttemptModel.findByIdAndUpdate(
            attemptId,
            { status: "abandoned" },
            { new: true }
        );

        if (!attempt) {
            throw AppError.notFoundError("Lượt thi không tồn tại");
        }

        return { message: "Đã hủy bài thi" };
    };

    // ============ HELPER METHODS ============

    private async getQuestionIdsByParts(test: any, parts: number[]): Promise<string[]> {
        const questionIds: string[] = [];
        for (const part of test.parts) {
            if (parts.includes(part.partNumber)) {
                questionIds.push(...part.questionIds.map((id: any) => id.toString()));
            }
        }
        return questionIds;
    }

    /**
     * Quy đổi số câu đúng sang điểm TOEIC (simplified)
     * Thực tế cần bảng quy đổi chính xác từ ETS
     */
    private convertToTOEICScore(correctCount: number, totalQuestions: number): number {
        const percentage = correctCount / totalQuestions;
        return Math.round(percentage * 495); // Mỗi section max 495 điểm
    }
}

export default TestAttemptService;
