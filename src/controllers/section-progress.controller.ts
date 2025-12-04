import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import SectionProgressService from "../services/section-progress.service";

@injectable()
class SectionProgressController {
    constructor(private sectionProgressService: SectionProgressService) {}

    /**
     * POST /student/sections/:sectionId/submit
     * Submit kết quả làm bài tập
     */
    submitExercise = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { sectionId } = req.params;
            const { answers } = req.body;

            const result = await this.sectionProgressService.submitExercise(
                userId,
                sectionId,
                answers
            );

            res.status(200).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /student/sections/:sectionId/view
     * Đánh dấu đã xem video/mindmap
     */
    markAsViewed = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { sectionId } = req.params;

            const result = await this.sectionProgressService.markAsViewed(userId, sectionId);

            res.status(200).json({
                success: true,
                message: "Đã đánh dấu xem thành công",
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /student/courses/:courseId/progress
     * Lấy tiến độ học của course
     */
    getCourseProgress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { courseId } = req.params;

            const result = await this.sectionProgressService.getCourseProgress(userId, courseId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /student/sections/:sectionId/progress
     * Lấy tiến độ của một section
     */
    getSectionProgress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const { sectionId } = req.params;

            const result = await this.sectionProgressService.getSectionProgress(userId, sectionId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };
}

export default SectionProgressController;
