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
   * Generate danh sách lessons được schedule theo ngày
   */
  private async generateScheduledLessons(
    roadmaps: any[],
    config: IScheduleConfig
  ): Promise<IScheduledLesson[]> {
    const scheduledLessons: IScheduledLesson[] = [];
    const currentDate = new Date(config.start_date);
    const minMinutes = config.min_hours_per_day * 60;
    const maxMinutes = config.max_hours_per_day * 60;
    let dayOfWeek = currentDate.getDay();

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

    while (sectionIndex < allSections.length) {
      // Kiểm tra nếu là ngày học trong tuần
      const studyDaysCount = Math.floor(dayOfWeek / 7 * config.days_per_week);
      if (dayOfWeek > 0 && dayOfWeek <= config.days_per_week) {
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

        orderInDay = 1; // Reset order cho ngày mới
      }

      // Chuyển sang ngày tiếp theo
      currentDate.setDate(currentDate.getDate() + 1);
      dayOfWeek = currentDate.getDay();
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
   * Tự động reschedule các lessons chưa hoàn thành
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

    // Tìm ngày học tiếp theo
    const nextStudyDate = this.getNextStudyDate(
      new Date(),
      schedule.schedule_config.days_per_week
    );

    // Reschedule các incomplete lessons
    const config = schedule.schedule_config;
    const maxMinutes = config.max_hours_per_day * 60;
    let currentDate = new Date(nextStudyDate);

    for (const lesson of incompleteLessons) {
      // Tính tổng minutes đã schedule trong ngày currentDate
      const lessonsOnDate = schedule.scheduled_lessons.filter(
        l => new Date(l.scheduled_date).toDateString() === currentDate.toDateString()
      );
      const totalMinutes = lessonsOnDate.reduce((sum, l) => sum + l.estimated_duration, 0);

      // Nếu vượt max, chuyển sang ngày tiếp theo
      if (totalMinutes + lesson.estimated_duration > maxMinutes) {
        currentDate = this.getNextStudyDate(currentDate, config.days_per_week);
      }

      // Update scheduled_date
      const lessonIndex = schedule.scheduled_lessons.findIndex(
        l => l.lesson_id.toString() === lesson.lesson_id.toString() && 
             l.section_id.toString() === lesson.section_id.toString()
      );
      if (lessonIndex !== -1) {
        schedule.scheduled_lessons[lessonIndex].scheduled_date = new Date(currentDate);
      }
    }

    schedule.last_rescheduled_at = new Date();
    await schedule.save();
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
