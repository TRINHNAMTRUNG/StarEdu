import { Router } from "express";
import { container } from "tsyringe";
import SectionProgressController from "../../controllers/section-progress.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const sectionProgressRoutes = Router();
const controller = container.resolve(SectionProgressController);

/**
 * @swagger
 * /student/sections/{sectionId}/submit:
 *   post:
 *     summary: Submit kết quả làm bài tập
 *     tags: [Student - Section Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_id:
 *                       type: string
 *                     selected_answer:
 *                       type: number
 *     responses:
 *       200:
 *         description: Kết quả làm bài
 */
sectionProgressRoutes.post(
    "/sections/:sectionId/submit",
    authenticateToken,
    controller.submitExercise
);

/**
 * @swagger
 * /student/sections/{sectionId}/view:
 *   post:
 *     summary: Đánh dấu đã xem video/mindmap
 *     tags: [Student - Section Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã đánh dấu xem thành công
 */
sectionProgressRoutes.post(
    "/sections/:sectionId/view",
    authenticateToken,
    controller.markAsViewed
);

/**
 * @swagger
 * /student/sections/{sectionId}/progress:
 *   get:
 *     summary: Lấy tiến độ của một section
 *     tags: [Student - Section Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tiến độ section
 */
sectionProgressRoutes.get(
    "/sections/:sectionId/progress",
    authenticateToken,
    controller.getSectionProgress
);

/**
 * @swagger
 * /student/courses/{courseId}/progress:
 *   get:
 *     summary: Lấy tiến độ học của course
 *     tags: [Student - Section Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tiến độ course
 */
sectionProgressRoutes.get(
    "/courses/:courseId/progress",
    authenticateToken,
    controller.getCourseProgress
);

export default sectionProgressRoutes;
