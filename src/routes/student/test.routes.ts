import { Router } from "express";
import { container } from "tsyringe";
import StudentTestController from "../../controllers/student-test.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { validationBody } from "../../middlewares/validationError.middleware";
import {
    StartTestReqDto,
    SubmitAnswerReqDto,
    UpdateCurrentPartReqDto,
    CompleteTestReqDto
} from "../../dtos/request/test.request.dto";

const router = Router();
const controller = container.resolve(StudentTestController);

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

/**
 * @route GET /api/student/tests
 * @desc Lấy danh sách đề thi đã publish
 */
router.get("/", controller.getAllTests);

/**
 * @route GET /api/student/tests/:id
 * @desc Lấy thông tin chi tiết đề thi
 */
router.get("/:id", controller.getTestById);

/**
 * @route GET /api/student/tests/:id/questions
 * @desc Lấy đề thi kèm câu hỏi (để làm bài)
 * @query part - Lấy theo part cụ thể (optional)
 */
router.get("/:id/questions", controller.getTestWithQuestions);

/**
 * @route GET /api/student/tests/:id/answers
 * @desc Lấy đề thi kèm đáp án và giải thích (sau khi làm xong)
 */
router.get("/:id/answers", controller.getTestWithAnswers);

/**
 * @route POST /api/student/tests/start
 * @desc Bắt đầu làm bài thi mới hoặc tiếp tục bài làm dở
 */
router.post("/start", validationBody(StartTestReqDto), controller.startTest);

/**
 * @route POST /api/student/tests/submit-answer
 * @desc Lưu câu trả lời (realtime)
 */
router.post("/submit-answer", validationBody(SubmitAnswerReqDto), controller.submitAnswer);

/**
 * @route PUT /api/student/tests/current-part
 * @desc Cập nhật part đang làm
 */
router.put("/current-part", validationBody(UpdateCurrentPartReqDto), controller.updateCurrentPart);

/**
 * @route POST /api/student/tests/complete
 * @desc Hoàn thành và nộp bài thi
 */
router.post("/complete", validationBody(CompleteTestReqDto), controller.completeTest);

/**
 * @route POST /api/student/tests/abandon
 * @desc Hủy bỏ bài thi
 */
router.post("/abandon", controller.abandonTest);

/**
 * @route GET /api/student/tests/attempts/:id
 * @desc Lấy kết quả chi tiết của 1 lượt thi
 */
router.get("/attempts/:id", controller.getAttemptResult);

/**
 * @route GET /api/student/tests/attempts
 * @desc Lấy lịch sử các lượt thi của user
 */
router.get("/attempts", controller.getUserAttempts);

export default router;
