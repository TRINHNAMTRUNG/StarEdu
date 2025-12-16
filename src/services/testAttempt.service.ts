import { injectable } from "tsyringe";
import TestAttemptModel from "../models/testAttempt.model";
import { TestModel } from "../models/test.model";
import { QuestionModel } from "../models/question.model";
import AppError from "../utils/AppError";

/**
 * ========================================
 * BẢNG QUY ĐỔI ĐIỂM TOEIC CHUẨN ETS
 * ========================================
 * Dựa trên bảng chuyển đổi chính thức từ ETS
 * Nguồn: ETS TOEIC Official Score Conversion Table
 */

// Bảng điểm Reading (0-100 câu đúng)
const READING_SCORE_TABLE: Record<number, number> = {
    0: 5, 1: 5, 2: 5, 3: 10, 4: 15, 5: 20, 6: 25, 7: 30, 8: 35, 9: 40,
    10: 45, 11: 50, 12: 55, 13: 60, 14: 65, 15: 70, 16: 75, 17: 80, 18: 85, 19: 90,
    20: 95, 21: 100, 22: 105, 23: 110, 24: 115, 25: 120, 26: 125, 27: 130, 28: 135, 29: 140,
    30: 145, 31: 150, 32: 155, 33: 160, 34: 165, 35: 170, 36: 175, 37: 180, 38: 185, 39: 190,
    40: 195, 41: 200, 42: 205, 43: 210, 44: 215, 45: 220, 46: 225, 47: 230, 48: 235, 49: 240,
    50: 245, 51: 250, 52: 255, 53: 260, 54: 265, 55: 270, 56: 275, 57: 280, 58: 285, 59: 290,
    60: 295, 61: 300, 62: 305, 63: 310, 64: 315, 65: 320, 66: 325, 67: 330, 68: 335, 69: 340,
    70: 345, 71: 350, 72: 355, 73: 360, 74: 365, 75: 370, 76: 375, 77: 380, 78: 385, 79: 390,
    80: 395, 81: 400, 82: 405, 83: 410, 84: 415, 85: 420, 86: 425, 87: 430, 88: 435, 89: 440,
    90: 445, 91: 450, 92: 455, 93: 460, 94: 465, 95: 470, 96: 475, 97: 480, 98: 485, 99: 490,
    100: 495
};

// Bảng điểm Listening (0-100 câu đúng)
const LISTENING_SCORE_TABLE: Record<number, number> = {
    0: 5, 1: 15, 2: 20, 3: 25, 4: 30, 5: 35, 6: 40, 7: 45, 8: 50, 9: 55,
    10: 60, 11: 65, 12: 70, 13: 75, 14: 80, 15: 85, 16: 90, 17: 95, 18: 100, 19: 105,
    20: 110, 21: 115, 22: 120, 23: 125, 24: 130, 25: 135, 26: 140, 27: 145, 28: 150, 29: 155,
    30: 160, 31: 165, 32: 170, 33: 175, 34: 180, 35: 185, 36: 190, 37: 195, 38: 200, 39: 205,
    40: 210, 41: 215, 42: 220, 43: 225, 44: 230, 45: 235, 46: 240, 47: 245, 48: 250, 49: 255,
    50: 260, 51: 265, 52: 270, 53: 275, 54: 280, 55: 285, 56: 290, 57: 295, 58: 300, 59: 305,
    60: 310, 61: 315, 62: 320, 63: 325, 64: 330, 65: 335, 66: 340, 67: 345, 68: 350, 69: 355,
    70: 360, 71: 365, 72: 370, 73: 375, 74: 380, 75: 385, 76: 395, 77: 400, 78: 405, 79: 410,
    80: 415, 81: 420, 82: 425, 83: 430, 84: 435, 85: 440, 86: 445, 87: 450, 88: 455, 89: 460,
    90: 465, 91: 470, 92: 475, 93: 480, 94: 485, 95: 490, 96: 495, 97: 495, 98: 495, 99: 495,
    100: 495
};

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
        // Calculate total questions by counting subQuestions within groups
        const allQuestionIds = test.parts.flatMap(part => part.questionIds);
        const questions = await QuestionModel.find({ _id: { $in: allQuestionIds } });
        
        let totalQuestions = 0;
        for (const question of questions) {
            if (question.type === 'group') {
                totalQuestions += question.subQuestions?.length || 0;
            } else {
                totalQuestions += 1;
            }
        }
        
        const attempt = await TestAttemptModel.create({
            user_id: userId,
            test_id: testId,
            time_limit: test.time_limit,
            total_questions: totalQuestions
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

        /**
         * ========================================
         * QUY ĐỔI ĐIỂM TOEIC - PHÂN LOẠI TEST
         * ========================================
         * 
         * Hệ thống hỗ trợ 2 loại test với công thức tính điểm khác nhau:
         * 
         * 1️⃣ FULL TEST (200 câu: 100 L + 100 R):
         *    - Sử dụng LOOKUP TABLE chuẩn ETS
         *    - Tra cứu từ READING_SCORE_TABLE và LISTENING_SCORE_TABLE
         *    - Phản ánh đúng quy luật non-linear của ETS
         * 
         * 2️⃣ PLACEMENT TEST (40 câu: 23 L + 17 R):
         *    - Sử dụng SCALED LINEAR FORMULA
         *    - Quy đổi tỷ lệ: (correct/total) × 495
         *    - Đơn giản hóa cho bài test ngắn đánh giá đầu vào
         * 
         * PHÂN LOẠI: Dựa vào tổng số câu của test
         * - Full Test: total >= 150 câu
         * - Placement Test: total < 150 câu
         * 
         * CHI TIẾT: Xem hàm calculateTOEICScore() phía dưới
         */
        const totalQuestions = listeningQuestions.length + readingQuestions.length;
        const isFullTest = totalQuestions >= 150;
        
        const listeningScore = listeningQuestions.length > 0 
            ? this.calculateTOEICScore(listeningCorrect, listeningQuestions.length, 'listening', isFullTest) 
            : 0;
        const readingScore = readingQuestions.length > 0 
            ? this.calculateTOEICScore(readingCorrect, readingQuestions.length, 'reading', isFullTest) 
            : 0;
        const totalScore = listeningScore + readingScore;

        // Cập nhật attempt với kết quả chấm điểm
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
                test_id: a.test_id,
                started_at: a.started_at,
                completed_at: a.completed_at,
                status: a.status,
                total_score: a.total_score,
                listening_score: a.listening_score,
                reading_score: a.reading_score,
                correct_answers: a.correct_answers,
                total_questions: a.total_questions,
                time_used: a.time_used
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
                // Get all questions for this part
                const questions = await QuestionModel.find({ _id: { $in: part.questionIds } });
                
                // Expand group questions into their subQuestions
                for (const question of questions) {
                    if (question.type === 'group' && question.subQuestions) {
                        questionIds.push(...question.subQuestions.map((id: any) => id.toString()));
                    } else {
                        questionIds.push(question._id.toString());
                    }
                }
            }
        }
        return questionIds;
    }

    /**
     * ========================================
     * TÍNH ĐIỂM TOEIC - HỆ THỐNG ĐA DẠNG
     * ========================================
     * 
     * Hỗ trợ 2 phương pháp tính điểm cho 2 loại test khác nhau:
     * 
     * 🎯 FULL TEST (200 câu):
     * - Sử dụng lookup table ETS chuẩn
     * - Tra cứu từ READING_SCORE_TABLE hoặc LISTENING_SCORE_TABLE
     * - Các bảng chứa 101 entries (0-100 câu đúng)
     * - Non-linear progression (giống TOEIC thật)
     * - VD: Listening 85/100 đúng → 440 điểm (tra bảng)
     * 
     * 📝 PLACEMENT TEST (40 câu):
     * - Sử dụng scaled linear formula
     * - Scale số câu đúng về tỷ lệ 0-100: scaledCorrect = (correct / total) × 100
     * - Sau đó tra bảng với số câu đã scale
     * - VD: Listening 20/23 đúng → scale = 86.96 → tra bảng với 87 → 450 điểm
     * 
     * ĐIỂM KHÁC BIỆT:
     * - Full Test: Tra bảng trực tiếp (100 câu = 100 entries)
     * - Placement Test: Scale trước rồi mới tra bảng (40 câu → scale → tra bảng)
     * 
     * SO SÁNH:
     * Old (Pure Linear):  điểm = (correct / total) × 495
     * Full Test:          điểm = SCORE_TABLE[correct]
     * Placement Test:     điểm = SCORE_TABLE[round((correct/total) × 100)]
     * ETS Real:           IRT Model + Equating (phức tạp nhất)
     * 
     * CHI TIẾT: Xem file TOEIC_SCORING_SYSTEM.md
     * 
     * @param correctCount - Số câu trả lời đúng
     * @param totalQuestions - Tổng số câu trong section
     * @param section - Phần thi: 'listening' hoặc 'reading'
     * @param isFullTest - true: Full Test (200 câu), false: Placement Test (40 câu)
     * @returns Điểm TOEIC (0-495)
     */
    private calculateTOEICScore(
        correctCount: number, 
        totalQuestions: number, 
        section: 'listening' | 'reading',
        isFullTest: boolean
    ): number {
        // Xử lý trường hợp đặc biệt
        if (totalQuestions === 0) return 0;
        if (correctCount < 0) return 0;
        if (correctCount > totalQuestions) correctCount = totalQuestions;
        
        // Chọn bảng điểm tương ứng
        const scoreTable = section === 'listening' 
            ? LISTENING_SCORE_TABLE 
            : READING_SCORE_TABLE;
        
        if (isFullTest) {
            // FULL TEST: Tra bảng trực tiếp (giả định 100 câu/section)
            // Nếu không đúng 100 câu thì scale về 100
            const scaledCorrect = totalQuestions === 100 
                ? correctCount 
                : Math.round((correctCount / totalQuestions) * 100);
            
            // Đảm bảo trong range 0-100
            const lookupIndex = Math.min(100, Math.max(0, scaledCorrect));
            return scoreTable[lookupIndex] ?? 0;
            
        } else {
            // PLACEMENT TEST: Scale về tỷ lệ 0-100 rồi tra bảng
            // VD: 20/23 đúng → (20/23) × 100 = 86.96 → round = 87 → tra bảng[87]
            const percentage = (correctCount / totalQuestions) * 100;
            const scaledCorrect = Math.round(percentage);
            
            // Đảm bảo trong range 0-100
            const lookupIndex = Math.min(100, Math.max(0, scaledCorrect));
            return scoreTable[lookupIndex] ?? 0;
        }
    }
}

export default TestAttemptService;
