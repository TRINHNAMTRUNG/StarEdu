import { Router } from "express";
import roadmapRecommendationController from "../controllers/roadmapRecommendation.controller";

const router = Router();

/**
 * @route POST /api/roadmaps/recommend
 * @desc Gợi ý lộ trình học phù hợp
 * @body {
 *   currentScore: number,
 *   targetScore: number,
 *   daysPerWeek: number (1-7),
 *   minHoursPerDay: number,
 *   maxHoursPerDay: number,
 *   focusSkills?: string[] (["listening", "reading", "speaking", "writing"])
 * }
 */
router.post("/recommend", (req, res) => roadmapRecommendationController.recommendRoadmaps(req, res));

/**
 * @route GET /api/roadmaps/:roadmapId/schedule
 * @desc Lấy lịch học chi tiết cho 1 roadmap
 * @query daysPerWeek, minHoursPerDay, maxHoursPerDay
 */
router.get("/:roadmapId/schedule", (req, res) => roadmapRecommendationController.getDetailedSchedule(req, res));

/**
 * @route POST /api/roadmaps/quick-estimate
 * @desc Ước tính nhanh thời gian học
 * @body {
 *   currentScore: number,
 *   targetScore: number,
 *   availableHoursPerWeek: number
 * }
 */
router.post("/quick-estimate", (req, res) => roadmapRecommendationController.quickEstimate(req, res));

export default router;
