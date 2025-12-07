import RoadmapModel from "../models/roadmap.model";
import CourseModel, { SkillGroup } from "../models/course.model";
import LessonModel from "../models/lesson.model";
import SectionModel from "../models/section.model";

interface RecommendationInput {
  currentScore: number;        // Điểm hiện tại (L&R + S&W nếu có)
  targetScore: number;          // Điểm mục tiêu
  daysPerWeek: number;          // Số ngày học/tuần (1-7)
  minHoursPerDay: number;       // Thời gian học tối thiểu/ngày (giờ)
  maxHoursPerDay: number;       // Thời gian học tối đa/ngày (giờ)
  focusSkills?: string[];       // Kỹ năng muốn tập trung: ["listening", "reading", "speaking", "writing"]
}

interface RecommendedRoadmap {
  roadmap: any;
  courses: any[];
  totalDuration: number;        // Tổng thời gian (phút)
  estimatedWeeks: number;       // Ước tính số tuần
  estimatedCompletionDate: Date;
  studySchedule: {
    hoursPerDay: number;
    daysPerWeek: number;
    totalDays: number;
  };
  dailyPlan: {
    day: number;
    date: Date;
    sessions: {
      courseTitle: string;
      lessonTitle: string;
      sectionTitle: string;
      duration: number;
      type: string;
    }[];
    totalMinutes: number;
  }[];
}

interface RecommendationResult {
  recommendedRoadmaps: RecommendedRoadmap[];
  totalEstimatedWeeks: number;
  totalCost: number;
  totalCostAfterDiscount: number;
  message: string;
  tips: string[];
}

export class RoadmapRecommendationService {
  /**
   * Xác định roadmap phù hợp dựa trên điểm hiện tại và mục tiêu
   */
  private async findSuitableRoadmaps(
    currentScore: number,
    targetScore: number,
    focusSkills?: string[]
  ): Promise<any[]> {
    const roadmaps = await RoadmapModel.find({ is_published: true }).sort({ target_score: 1 });

    console.log('🔍 DEBUG - Total roadmaps found:', roadmaps.length);
    console.log('🔍 DEBUG - Focus skills:', focusSkills);
    console.log('🔍 DEBUG - Score range:', currentScore, '-', targetScore);

    const suitable: any[] = [];

    // Xác định kỹ năng cần học - sửa để so sánh với "L&R" và "S&W"
    const needsLR = !focusSkills || focusSkills.includes("L&R");
    const needsSW = !focusSkills || focusSkills.includes("S&W");

    console.log('🔍 DEBUG - Needs L&R:', needsLR, '| Needs S&W:', needsSW);

    for (const roadmap of roadmaps) {
      const skillGroups = roadmap.skill_groups || [];
      const hasLR = skillGroups.includes(SkillGroup.LISTENING) || skillGroups.includes(SkillGroup.READING);
      const hasSW = skillGroups.includes(SkillGroup.SPEAKING) || skillGroups.includes(SkillGroup.WRITING);

      console.log(`🔍 Roadmap: ${roadmap.title}`);
      console.log(`   - Target score: ${roadmap.target_score}`);
      console.log(`   - Skill groups:`, skillGroups);
      console.log(`   - Has L&R: ${hasLR} | Has S&W: ${hasSW}`);

      // Kiểm tra điểm số phù hợp
      const scoreMatches = roadmap.target_score >= currentScore && roadmap.target_score <= targetScore;
      
      console.log(`   - Score matches: ${scoreMatches} (${roadmap.target_score} >= ${currentScore} && ${roadmap.target_score} <= ${targetScore})`);

      if (!scoreMatches) {
        console.log(`   ❌ Skipped: score not in range`);
        continue;
      }

      // Kiểm tra kỹ năng phù hợp
      if (hasLR && hasSW && needsLR && needsSW) {
        // Roadmap 4 kỹ năng
        console.log(`   ✅ Added: 4-skills roadmap`);
        suitable.push(roadmap);
      } else if (hasLR && !hasSW && needsLR && !needsSW) {
        // Roadmap chỉ L&R
        console.log(`   ✅ Added: L&R only roadmap`);
        suitable.push(roadmap);
      } else if (!hasLR && hasSW && !needsLR && needsSW) {
        // Roadmap chỉ S&W
        console.log(`   ✅ Added: S&W only roadmap`);
        suitable.push(roadmap);
      } else {
        console.log(`   ❌ Skipped: skill mismatch`);
      }
    }

    console.log('🔍 DEBUG - Total suitable roadmaps:', suitable.length);

    return suitable;
  }

  /**
   * Lấy chi tiết các courses, lessons, sections của roadmap
   */
  private async getRoadmapDetails(roadmapId: string) {
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) return null;

    const courses = await CourseModel.find({ _id: { $in: roadmap.courses } }).sort({ order: 1 });
    
    const coursesWithDetails = [];
    for (const course of courses) {
      const lessons = await LessonModel.find({ course_id: course._id }).sort({ order: 1 });
      
      const lessonsWithSections = [];
      for (const lesson of lessons) {
        const sections = await SectionModel.find({ lesson_id: lesson._id }).sort({ order: 1 });
        lessonsWithSections.push({
          ...lesson.toObject(),
          sections: sections.map(s => s.toObject())
        });
      }

      coursesWithDetails.push({
        ...course.toObject(),
        lessons: lessonsWithSections
      });
    }

    return {
      roadmap: roadmap.toObject(),
      courses: coursesWithDetails
    };
  }

  /**
   * Tính toán lịch học chi tiết theo ngày
   */
  private calculateDailyPlan(
    courses: any[],
    daysPerWeek: number,
    minHoursPerDay: number,
    maxHoursPerDay: number
  ) {
    const minMinutesPerDay = minHoursPerDay * 60;
    const maxMinutesPerDay = maxHoursPerDay * 60;
    const dailyPlan: any[] = [];

    let currentDay = 1;
    let currentDate = new Date();
    let dayOfWeek = 0; // 0-6 (chủ nhật - thứ 7)

    // Lấy tất cả sections từ tất cả courses
    const allSections: any[] = [];
    for (const course of courses) {
      for (const lesson of course.lessons) {
        for (const section of lesson.sections) {
          allSections.push({
            courseTitle: course.title,
            lessonTitle: lesson.title,
            sectionTitle: section.title,
            duration: section.duration_minutes || 0,
            type: section.type
          });
        }
      }
    }

    let sectionIndex = 0;
    while (sectionIndex < allSections.length) {
      // Kiểm tra nếu là ngày học trong tuần
      if (dayOfWeek < daysPerWeek) {
        const sessions: any[] = [];
        let totalMinutes = 0;

        // Thêm sections vào ngày này cho đến khi đạt minMinutesPerDay hoặc hết sections
        while (sectionIndex < allSections.length && totalMinutes < maxMinutesPerDay) {
          const section = allSections[sectionIndex];
          
          // Nếu thêm section này vượt quá maxMinutesPerDay, kiểm tra có đạt minMinutes chưa
          if (totalMinutes + section.duration > maxMinutesPerDay && totalMinutes >= minMinutesPerDay) {
            break;
          }

          sessions.push(section);
          totalMinutes += section.duration;
          sectionIndex++;

          // Nếu đã đạt minMinutesPerDay, có thể dừng hoặc tiếp tục tùy logic
          if (totalMinutes >= minMinutesPerDay && totalMinutes + (allSections[sectionIndex]?.duration || 0) > maxMinutesPerDay) {
            break;
          }
        }

        if (sessions.length > 0) {
          dailyPlan.push({
            day: currentDay,
            date: new Date(currentDate),
            sessions,
            totalMinutes
          });
          currentDay++;
        }
      }

      // Chuyển sang ngày tiếp theo
      dayOfWeek++;
      if (dayOfWeek >= 7) {
        dayOfWeek = 0;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyPlan;
  }

  /**
   * API chính: Gợi ý lộ trình học
   */
  async recommendRoadmaps(input: RecommendationInput): Promise<RecommendationResult> {
    const { currentScore, targetScore, daysPerWeek, minHoursPerDay, maxHoursPerDay, focusSkills } = input;

    // Validation
    if (currentScore >= targetScore) {
      throw new Error("Điểm mục tiêu phải cao hơn điểm hiện tại");
    }
    if (daysPerWeek < 1 || daysPerWeek > 7) {
      throw new Error("Số ngày học/tuần phải từ 1-7");
    }
    if (minHoursPerDay <= 0 || maxHoursPerDay <= 0 || minHoursPerDay > maxHoursPerDay) {
      throw new Error("Thời gian học không hợp lệ");
    }

    // Tìm roadmaps phù hợp
    const suitableRoadmaps = await this.findSuitableRoadmaps(currentScore, targetScore, focusSkills);

    if (suitableRoadmaps.length === 0) {
      throw new Error("Không tìm thấy lộ trình phù hợp với yêu cầu của bạn");
    }

    // Lấy chi tiết và tính toán cho từng roadmap
    const recommendedRoadmaps: RecommendedRoadmap[] = [];
    let totalCost = 0;
    let totalCostAfterDiscount = 0;

    for (const roadmap of suitableRoadmaps) {
      const details = await this.getRoadmapDetails(roadmap._id.toString());
      if (!details) continue;

      const { roadmap: roadmapData, courses } = details;

      // Tính tổng thời gian
      const totalDuration = courses.reduce((sum, course) => sum + (course.total_duration_minutes || 0), 0);

      // Tính lịch học chi tiết
      const dailyPlan = this.calculateDailyPlan(courses, daysPerWeek, minHoursPerDay, maxHoursPerDay);

      // Tính số tuần ước tính
      const totalDays = dailyPlan.length;
      const estimatedWeeks = Math.ceil(totalDays / daysPerWeek);

      // Tính ngày hoàn thành dự kiến
      const estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + totalDays);

      // Tính thời gian học trung bình mỗi ngày
      const totalMinutesInPlan = dailyPlan.reduce((sum, day) => sum + day.totalMinutes, 0);
      const avgHoursPerDay = totalMinutesInPlan / totalDays / 60;

      recommendedRoadmaps.push({
        roadmap: roadmapData,
        courses,
        totalDuration,
        estimatedWeeks,
        estimatedCompletionDate,
        studySchedule: {
          hoursPerDay: Number(avgHoursPerDay.toFixed(1)),
          daysPerWeek,
          totalDays
        },
        dailyPlan
      });

      // Tính chi phí
      totalCost += roadmapData.price;
      const discountedPrice = roadmapData.price * (1 - roadmapData.discount_percentage / 100);
      totalCostAfterDiscount += discountedPrice;
    }

    // Tính tổng số tuần
    const totalEstimatedWeeks = recommendedRoadmaps.reduce((sum, r) => sum + r.estimatedWeeks, 0);

    // Tạo message và tips
    const message = this.generateRecommendationMessage(currentScore, targetScore, recommendedRoadmaps);
    const tips = this.generateStudyTips(daysPerWeek, minHoursPerDay, maxHoursPerDay, totalEstimatedWeeks);

    return {
      recommendedRoadmaps,
      totalEstimatedWeeks,
      totalCost,
      totalCostAfterDiscount,
      message,
      tips
    };
  }

  /**
   * Tạo message gợi ý
   */
  private generateRecommendationMessage(currentScore: number, targetScore: number, roadmaps: RecommendedRoadmap[]): string {
    const scoreDiff = targetScore - currentScore;
    let message = `Để đạt từ ${currentScore} lên ${targetScore} điểm (tăng ${scoreDiff} điểm), `;
    
    if (roadmaps.length === 1) {
      message += `chúng tôi gợi ý bạn học lộ trình "${roadmaps[0].roadmap.title}".`;
    } else {
      message += `chúng tôi gợi ý bạn học ${roadmaps.length} lộ trình theo trình tự từ cơ bản đến nâng cao.`;
    }

    return message;
  }

  /**
   * Tạo tips học tập
   */
  private generateStudyTips(daysPerWeek: number, minHours: number, maxHours: number, totalWeeks: number): string[] {
    const tips: string[] = [];

    // Tips về thời gian
    if (daysPerWeek >= 5) {
      tips.push("🎯 Bạn có lịch học khá dày đặc. Hãy đảm bảo nghỉ ngơi đầy đủ để não bộ tiếp thu kiến thức tốt hơn.");
    } else if (daysPerWeek <= 3) {
      tips.push("📅 Lịch học của bạn khá thoải mái. Hãy đảm bảo ôn tập lại kiến thức đã học để không quên.");
    }

    // Tips về cường độ
    if (maxHours >= 3) {
      tips.push("⚡ Với thời gian học mỗi ngày khá dài, hãy chia nhỏ thành nhiều phiên học (mỗi phiên 45-60 phút) để duy trì sự tập trung.");
    }

    // Tips về thời gian hoàn thành
    if (totalWeeks <= 4) {
      tips.push("🚀 Lộ trình của bạn khá cấp tốc. Hãy tập trung cao độ và hoàn thành đầy đủ các bài tập.");
    } else if (totalWeeks >= 12) {
      tips.push("🎓 Lộ trình của bạn khá dài hạn. Hãy kiên trì và đặt các mục tiêu ngắn hạn để duy trì động lực.");
    }

    // Tips chung
    tips.push("💡 Hãy hoàn thành tất cả bài tập và quiz để đảm bảo đạt điểm tối thiểu 70-80% mới chuyển sang bài tiếp theo.");
    tips.push("📝 Ghi chú lại những điểm khó và ôn tập thường xuyên để ghi nhớ lâu hơn.");
    tips.push("🎧 Luyện nghe mỗi ngày ít nhất 30 phút để cải thiện kỹ năng Listening.");

    return tips;
  }

  /**
   * Lấy lịch học chi tiết cho 1 roadmap cụ thể
   */
  async getDetailedSchedule(roadmapId: string, daysPerWeek: number, minHoursPerDay: number, maxHoursPerDay: number) {
    const details = await this.getRoadmapDetails(roadmapId);
    if (!details) {
      throw new Error("Không tìm thấy roadmap");
    }

    const { roadmap, courses } = details;
    const dailyPlan = this.calculateDailyPlan(courses, daysPerWeek, minHoursPerDay, maxHoursPerDay);

    return {
      roadmap,
      courses,
      dailyPlan,
      totalDays: dailyPlan.length,
      estimatedWeeks: Math.ceil(dailyPlan.length / daysPerWeek)
    };
  }
}

export default new RoadmapRecommendationService();
