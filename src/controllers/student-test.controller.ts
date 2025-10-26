import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import TestService from "../services/test.service";
import TestAttemptService from "../services/testAttempt.service";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class StudentTestController {
    constructor(
        private testService: TestService,
        private testAttemptService: TestAttemptService
    ) {}

    /**
     * GET /api/student/tests - Lấy danh sách đề thi
     */
    getAllTests = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 10, year, source } = req.query;
            const result = await this.testService.getAllTests(
                Number(page),
                Number(limit),
                { year: year ? Number(year) : undefined, source }
            );
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/student/tests/:id - Lấy chi tiết đề thi
     */
    getTestById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const result = await this.testService.getTestById(id);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/student/tests/:id/questions - Lấy đề thi kèm câu hỏi để làm bài
     */
    getTestWithQuestions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { part } = req.query;
            const result = await this.testService.getTestWithQuestions(
                id,
                part ? Number(part) : undefined
            );
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/student/tests/:id/answers - Lấy đề thi kèm đáp án (sau khi làm xong)
     */
    getTestWithAnswers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const result = await this.testService.getTestWithAnswers(id);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/student/tests/start - Bắt đầu làm bài thi
     */
    startTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { test_id } = req.body;
            const result = await this.testAttemptService.startTest(userId, test_id);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/student/tests/submit-answer - Lưu câu trả lời
     */
    submitAnswer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { attempt_id, question_id, selected_answer, time_spent } = req.body;
            const result = await this.testAttemptService.submitAnswer(
                attempt_id,
                question_id,
                selected_answer,
                time_spent
            );
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/student/tests/current-part - Cập nhật part đang làm
     */
    updateCurrentPart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { attempt_id, part_number } = req.body;
            const result = await this.testAttemptService.updateCurrentPart(attempt_id, part_number);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/student/tests/complete - Hoàn thành bài thi
     */
    completeTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { attempt_id, time_used } = req.body;
            const result = await this.testAttemptService.completeTest(attempt_id, time_used);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/student/tests/attempts/:id - Lấy kết quả chi tiết 1 lượt thi
     */
    getAttemptResult = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const result = await this.testAttemptService.getAttemptResult(id, userId);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/student/tests/attempts - Lấy lịch sử làm bài
     */
    getUserAttempts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { page = 1, limit = 10 } = req.query;
            const result = await this.testAttemptService.getUserAttempts(
                userId,
                Number(page),
                Number(limit)
            );
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/student/tests/abandon - Hủy bỏ bài thi
     */
    abandonTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { attempt_id } = req.body;
            const result = await this.testAttemptService.abandonTest(attempt_id);
            res.json(ResponseFormat.successResponse(result));
        } catch (error) {
            next(error);
        }
    };
}

export default StudentTestController;
