import LearningSchedule, { ILearningSchedule, IScheduledLesson, IScheduleConfig } from '../models/learningSchedule.model';
import Roadmap from '../models/roadmap.model';
import Course from '../models/course.model';
import Lesson from '../models/lesson.model';
import Section from '../models/section.model';
import mongoose from 'mongoose';

interface CreateScheduleInput {
  user_id: string;
  roadmap_ids: string[];
  schedule_config: {
    days_per_week: number;
    min_hours_per_day: number;
    max_hours_per_day: number;
    start_date: Date;
    focus_skills: string[];
  };
}

interface UpdateConfigInput {
  days_per_week?: number;
  min_hours_per_day?: number;
  max_hours_per_day?: number;
}

class LearningScheduleService {
  /**
   * Tạo learning schedule mới từ roadmaps
   */
  async createSchedule(data: CreateScheduleInput): Promise<ILearningSchedule> {
    const { user_id, roadmap_ids, schedule_config } = data;

    // Kiểm tra xem user đã có schedule chưa
    const existingSchedule = await LearningSchedule.findOne({ 
      user_id: new mongoose.Types.ObjectId(user_id) 
    });

    if (existingSchedule) {
      console.log(`📋 User ${user_id} already has a schedule. Appending new roadmaps...`);
      return await this.appendRoadmapsToSchedule(existingSchedule, roadmap_ids, schedule_config);
    }

    console.log(`✨ Creating new schedule for user ${user_id}`);

    // Lấy tất cả roadmaps và courses
    const roadmaps = await Roadmap.find({ 
      _id: { $in: roadmap_ids.map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('courses');

    if (!roadmaps || roadmaps.length === 0) {
      throw new Error('Không tìm thấy roadmaps');
    }

    // Sắp xếp roadmaps theo target_score tăng dần (tuần tự)
    roadmaps.sort((a, b) => a.target_score - b.target_score);

    // Generate scheduled lessons
    const scheduledLessons = await this.generateScheduledLessons(
      roadmaps,
      schedule_config
    );

    // Tạo schedule
    const schedule = new LearningSchedule({
      user_id: new mongoose.Types.ObjectId(user_id),
      roadmap_ids: roadmap_ids.map(id => new mongoose.Types.ObjectId(id)),
      schedule_config,
      scheduled_lessons: scheduledLessons,
      auto_reschedule: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    await schedule.save();
    return schedule;
  }

  /**
   * Append roadmaps mới vào schedule hiện có
   */
  private async appendRoadmapsToSchedule(
    schedule: ILearningSchedule,
    newRoadmapIds: string[],
    scheduleConfig?: IScheduleConfig
  ): Promise<ILearningSchedule> {
    // Lọc ra các roadmap chưa có trong schedule
    const existingRoadmapIds = schedule.roadmap_ids.map(id => id.toString());
    const roadmapIdsToAdd = newRoadmapIds.filter(id => !existingRoadmapIds.includes(id));

    if (roadmapIdsToAdd.length === 0) {
      console.log('⚠️ All roadmaps already exist in schedule');
      return schedule;
    }

    console.log(`➕ Adding ${roadmapIdsToAdd.length} new roadmaps to existing schedule`);

    // Lấy roadmaps mới
    const newRoadmaps = await Roadmap.find({ 
      _id: { $in: roadmapIdsToAdd.map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('courses');

    if (!newRoadmaps || newRoadmaps.length === 0) {
      throw new Error('Không tìm thấy roadmaps mới');
    }

    // Sắp xếp theo target_score
    newRoadmaps.sort((a, b) => a.target_score - b.target_score);

    // Generate lessons cho roadmaps mới
    const config = scheduleConfig || schedule.schedule_config;
    const newLessons = await this.generateScheduledLessons(newRoadmaps, config);

    // Tìm ngày bắt đầu cho roadmaps mới (sau ngày cuối cùng đã schedule)
    const lastScheduledDate = schedule.scheduled_lessons.reduce((latest, lesson) => {
      const lessonDate = new Date(lesson.scheduled_date);
      return lessonDate > latest ? lessonDate : latest;
    }, new Date());

    // Adjust scheduled dates cho lessons mới
    const nextDay = new Date(lastScheduledDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);

    const dayOffset = Math.floor((nextDay.getTime() - new Date(config.start_date).getTime()) / (1000 * 60 * 60 * 24));

    newLessons.forEach(lesson => {
      const originalDate = new Date(lesson.scheduled_date);
      const adjustedDate = new Date(originalDate);
      adjustedDate.setDate(adjustedDate.getDate() + dayOffset);
      lesson.scheduled_date = adjustedDate;
    });

    // Thêm roadmaps và lessons mới vào schedule
    schedule.roadmap_ids.push(...roadmapIdsToAdd.map(id => new mongoose.Types.ObjectId(id)));
    schedule.scheduled_lessons.push(...newLessons);
    schedule.updated_at = new Date();

    await schedule.save();

    console.log(`✅ Successfully appended ${roadmapIdsToAdd.length} roadmaps and ${newLessons.length} lessons`);
    return schedule;
  }

  /**
   * Generate danh sách lessons được schedule theo ngày
   */
  private async generateScheduledLessons(
    roadmaps: any[],
    config: IScheduleConfig
  ): Promise<IScheduledLesson[]> {
    const scheduledLessons: IScheduledLesson[] = [];
    const currentDate = new Date(config.start_date);
    // Normalize to start of day to avoid time zone issues
    currentDate.setHours(0, 0, 0, 0);
    
    const minMinutes = config.min_hours_per_day * 60;
    const maxMinutes = config.max_hours_per_day * 60;

    // Collect all sections từ các roadmaps (tuần tự)
    const allSections: any[] = [];
    
    for (const roadmap of roadmaps) {
      const courses = await Course.find({ _id: { $in: roadmap.courses } });
      
      for (const course of courses) {
        const lessons = await Lesson.find({ course_id: course._id });
        
        for (const lesson of lessons) {
          // Query sections từ Section collection
          const sections = await Section.find({ lesson_id: lesson._id });
          
          for (const section of sections) {
            allSections.push({
              course_id: course._id,
              lesson_id: lesson._id,
              section_id: section._id,
              duration: section.duration_minutes || 30
            });
          }
        }
      }
    }

    // Schedule sections vào các ngày
    let sectionIndex = 0;
    let orderInDay = 1;
    let studyDaysThisWeek = 0;
    let currentWeekStart = new Date(currentDate);
    currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)

    while (sectionIndex < allSections.length) {
      // Reset counter khi sang tuần mới
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      if (weekStart.getTime() !== currentWeekStart.getTime()) {
        studyDaysThisWeek = 0;
        currentWeekStart = weekStart;
      }

      // Kiểm tra nếu còn ngày học trong tuần và không phải Chủ nhật
      const dayOfWeek = currentDate.getDay();
      const canStudyToday = dayOfWeek !== 0 && studyDaysThisWeek < config.days_per_week;

      if (canStudyToday) {
        let totalMinutes = 0;

        // Thêm sections vào ngày này
        while (sectionIndex < allSections.length && totalMinutes < maxMinutes) {
          const section = allSections[sectionIndex];
          
          if (totalMinutes + section.duration > maxMinutes && totalMinutes >= minMinutes) {
            break;
          }

          scheduledLessons.push({
            course_id: section.course_id,
            lesson_id: section.lesson_id,
            section_id: section.section_id,
            scheduled_date: new Date(currentDate),
            estimated_duration: section.duration,
            completed: false,
            order_in_day: orderInDay++
          });

          totalMinutes += section.duration;
          sectionIndex++;
        }

        studyDaysThisWeek++;
        orderInDay = 1; // Reset order cho ngày mới
      }

      // Chuyển sang ngày tiếp theo
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return scheduledLessons;
  }

  /**
   * Lấy schedule của user
   */
  async getMySchedule(user_id: string): Promise<ILearningSchedule | null> {
    const schedule = await LearningSchedule.findOne({ 
      user_id: new mongoose.Types.ObjectId(user_id) 
    })
    .populate('roadmap_ids')
    .populate('scheduled_lessons.course_id')
    .populate('scheduled_lessons.lesson_id');

    return schedule;
  }

  /**
   * Đánh dấu lesson hoàn thành
   */
  async completeLesson(
    user_id: string, 
    lesson_id: string, 
    section_id: string,
    actual_duration?: number
  ): Promise<ILearningSchedule | null> {
    const schedule = await LearningSchedule.findOne({ 
      user_id: new mongoose.Types.ObjectId(user_id) 
    });

    if (!schedule) {
      throw new Error('Không tìm thấy schedule');
    }

    // Tìm lesson trong schedule
    const lessonIndex = schedule.scheduled_lessons.findIndex(
      l => l.lesson_id.toString() === lesson_id && l.section_id.toString() === section_id
    );

    if (lessonIndex === -1) {
      throw new Error('Không tìm thấy lesson trong schedule');
    }

    // Đánh dấu completed
    schedule.scheduled_lessons[lessonIndex].completed = true;
    schedule.scheduled_lessons[lessonIndex].completed_at = new Date();
    if (actual_duration) {
      schedule.scheduled_lessons[lessonIndex].actual_duration = actual_duration;
    }

    await schedule.save();

    // Trigger auto reschedule nếu cần
    if (schedule.auto_reschedule) {
      await this.autoRescheduleIncomplete(schedule);
    }

    return schedule;
  }

  /**
   * Tự động reschedule các lessons chưa hoàn thành (chạy hàng ngày)
   */
  async autoRescheduleIncomplete(schedule: ILearningSchedule): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tìm các lessons quá hạn chưa complete
    const incompleteLessons = schedule.scheduled_lessons.filter(
      lesson => !lesson.completed && new Date(lesson.scheduled_date) < today
    );

    if (incompleteLessons.length === 0) {
      return;
    }

    console.log(`🔄 Rescheduling ${incompleteLessons.length} incomplete lessons for user ${schedule.user_id}`);

    // Tìm ngày học tiếp theo (bắt đầu từ hôm nay)
    const nextStudyDate = this.getNextStudyDate(
      today,
      schedule.schedule_config.days_per_week
    );

    // Reschedule các incomplete lessons
    const config = schedule.schedule_config;
    const minMinutes = config.min_hours_per_day * 60;
    const maxMinutes = config.max_hours_per_day * 60;
    let currentDate = new Date(nextStudyDate);
    let orderInDay = 1;

    for (const lesson of incompleteLessons) {
      // Tính tổng minutes đã schedule trong ngày currentDate (không bao gồm lesson đang xử lý)
      const lessonsOnDate = schedule.scheduled_lessons.filter(
        l => l.section_id.toString() !== lesson.section_id.toString() &&
             new Date(l.scheduled_date).toDateString() === currentDate.toDateString()
      );

      const totalMinutesOnDate = lessonsOnDate.reduce(
        (sum, l) => sum + l.estimated_duration, 
        0
      );

      // Nếu ngày hiện tại đã đầy hoặc thêm lesson này vượt max, chuyển sang ngày tiếp theo
      if (totalMinutesOnDate + lesson.estimated_duration > maxMinutes && 
          totalMinutesOnDate >= minMinutes) {
        currentDate = this.getNextStudyDate(currentDate, config.days_per_week);
        orderInDay = 1;
      }

      // Cập nhật scheduled_date và order
      lesson.scheduled_date = new Date(currentDate);
      lesson.order_in_day = orderInDay++;
    }

    schedule.last_rescheduled_at = new Date();
    await schedule.save();

    console.log(`✅ Rescheduled incomplete lessons to start from ${nextStudyDate.toDateString()}`);
  }

  /**
   * Reschedule tất cả schedules có auto_reschedule = true (chạy cron job hàng ngày)
   */
  async rescheduleAllPendingSchedules(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedules = await LearningSchedule.find({
      auto_reschedule: true,
      'scheduled_lessons': {
        $elemMatch: {
          completed: false,
          scheduled_date: { $lt: today }
        }
      }
    });

    console.log(`🔄 Found ${schedules.length} schedules with incomplete past lessons`);

    for (const schedule of schedules) {
      try {
        await this.autoRescheduleIncomplete(schedule);
      } catch (error) {
        console.error(`Error rescheduling schedule ${schedule._id}:`, error);
      }
    }
  }

  /**
   * Tính ngày học tiếp theo dựa trên days_per_week
   */
  private getNextStudyDate(fromDate: Date, daysPerWeek: number): Date {
    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Simple logic: skip Sunday if not enough days
    while (nextDate.getDay() === 0 || nextDate.getDay() > daysPerWeek) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  /**
   * Update schedule config và regenerate
   */
  async updateScheduleConfig(
    user_id: string,
    updates: UpdateConfigInput
  ): Promise<ILearningSchedule | null> {
    const schedule = await LearningSchedule.findOne({ 
      user_id: new mongoose.Types.ObjectId(user_id) 
    });

    if (!schedule) {
      throw new Error('Không tìm thấy schedule');
    }

    // Update config
    if (updates.days_per_week) {
      schedule.schedule_config.days_per_week = updates.days_per_week;
    }
    if (updates.min_hours_per_day) {
      schedule.schedule_config.min_hours_per_day = updates.min_hours_per_day;
    }
    if (updates.max_hours_per_day) {
      schedule.schedule_config.max_hours_per_day = updates.max_hours_per_day;
    }

    // Regenerate schedule cho các lessons chưa complete
    const incompleteLessons = schedule.scheduled_lessons.filter(l => !l.completed);
    
    // Tạo lại schedule từ ngày mai
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Remove các lessons tương lai chưa complete
    schedule.scheduled_lessons = schedule.scheduled_lessons.filter(
      l => l.completed || new Date(l.scheduled_date) < tomorrow
    );

    // Reschedule incomplete lessons với config mới
    await this.rescheduleWithNewConfig(schedule, incompleteLessons);

    return schedule;
  }

  private async rescheduleWithNewConfig(
    schedule: ILearningSchedule,
    lessons: IScheduledLesson[]
  ): Promise<void> {
    const config = schedule.schedule_config;
    const maxMinutes = config.max_hours_per_day * 60;
    const minMinutes = config.min_hours_per_day * 60;
    
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);

    let orderInDay = 1;
    let totalMinutesToday = 0;

    for (const lesson of lessons) {
      // Check if adding this lesson exceeds max
      if (totalMinutesToday + lesson.estimated_duration > maxMinutes && totalMinutesToday >= minMinutes) {
        // Move to next study day
        currentDate = this.getNextStudyDate(currentDate, config.days_per_week);
        totalMinutesToday = 0;
        orderInDay = 1;
      }

      // Schedule lesson
      lesson.scheduled_date = new Date(currentDate);
      lesson.order_in_day = orderInDay++;
      schedule.scheduled_lessons.push(lesson);
      
      totalMinutesToday += lesson.estimated_duration;
    }

    await schedule.save();
  }

  /**
   * Xóa schedule (khi user cancel hoặc refund)
   */
  async deleteSchedule(user_id: string): Promise<boolean> {
    const result = await LearningSchedule.deleteOne({ 
      user_id: new mongoose.Types.ObjectId(user_id) 
    });
    return result.deletedCount > 0;
  }
}

export default new LearningScheduleService();
