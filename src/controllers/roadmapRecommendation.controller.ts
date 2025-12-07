import { Request, Response } from "express";
import roadmapRecommendationService from "../services/roadmapRecommendation.service";

export class RoadmapRecommendationController {
  /**
   * POST /api/roadmaps/recommend
   * Gợi ý lộ trình học dựa trên thông tin người dùng
   */
  async recommendRoadmaps(req: Request, res: Response) {
    try {
      const {
        currentScore,
        targetScore,
        daysPerWeek,
        minHoursPerDay,
        maxHoursPerDay,
        focusSkills
      } = req.body;

      console.log('📥 Received recommendation request:', {
        currentScore,
        targetScore,
        daysPerWeek,
        minHoursPerDay,
        maxHoursPerDay,
        focusSkills
      });

      // Validation
      if (!currentScore || !targetScore || !daysPerWeek || !minHoursPerDay || !maxHoursPerDay) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp đầy đủ thông tin: currentScore, targetScore, daysPerWeek, minHoursPerDay, maxHoursPerDay"
        });
      }

      const result = await roadmapRecommendationService.recommendRoadmaps({
        currentScore: Number(currentScore),
        targetScore: Number(targetScore),
        daysPerWeek: Number(daysPerWeek),
        minHoursPerDay: Number(minHoursPerDay),
        maxHoursPerDay: Number(maxHoursPerDay),
        focusSkills: focusSkills || undefined
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("Error in recommendRoadmaps:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Có lỗi xảy ra khi gợi ý lộ trình"
      });
    }
  }

  /**
   * GET /api/roadmaps/:roadmapId/schedule
   * Lấy lịch học chi tiết cho 1 roadmap
   */
  async getDetailedSchedule(req: Request, res: Response) {
    try {
      const { roadmapId } = req.params;
      const { daysPerWeek, minHoursPerDay, maxHoursPerDay } = req.query;

      if (!daysPerWeek || !minHoursPerDay || !maxHoursPerDay) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp: daysPerWeek, minHoursPerDay, maxHoursPerDay"
        });
      }

      const result = await roadmapRecommendationService.getDetailedSchedule(
        roadmapId,
        Number(daysPerWeek),
        Number(minHoursPerDay),
        Number(maxHoursPerDay)
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("Error in getDetailedSchedule:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Có lỗi xảy ra khi lấy lịch học"
      });
    }
  }

  /**
   * POST /api/roadmaps/quick-estimate
   * Ước tính nhanh thời gian cần thiết
   */
  async quickEstimate(req: Request, res: Response) {
    try {
      const { currentScore, targetScore, availableHoursPerWeek } = req.body;

      if (!currentScore || !targetScore || !availableHoursPerWeek) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp: currentScore, targetScore, availableHoursPerWeek"
        });
      }

      // Ước tính đơn giản: mỗi 100 điểm cần ~50 giờ học
      const scoreDiff = targetScore - currentScore;
      const estimatedHours = (scoreDiff / 100) * 50;
      const estimatedWeeks = Math.ceil(estimatedHours / availableHoursPerWeek);

      // Gợi ý lịch học
      let suggestedSchedule: any;
      if (availableHoursPerWeek >= 20) {
        suggestedSchedule = { daysPerWeek: 5, hoursPerDay: 4 };
      } else if (availableHoursPerWeek >= 14) {
        suggestedSchedule = { daysPerWeek: 7, hoursPerDay: 2 };
      } else if (availableHoursPerWeek >= 10) {
        suggestedSchedule = { daysPerWeek: 5, hoursPerDay: 2 };
      } else {
        suggestedSchedule = { daysPerWeek: 7, hoursPerDay: Math.ceil(availableHoursPerWeek / 7) };
      }

      return res.status(200).json({
        success: true,
        data: {
          scoreDifference: scoreDiff,
          estimatedHours,
          estimatedWeeks,
          suggestedSchedule,
          message: `Để tăng ${scoreDiff} điểm, bạn cần học khoảng ${estimatedHours} giờ (${estimatedWeeks} tuần với ${availableHoursPerWeek}h/tuần)`
        }
      });
    } catch (error: any) {
      console.error("Error in quickEstimate:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Có lỗi xảy ra"
      });
    }
  }
}

export default new RoadmapRecommendationController();
