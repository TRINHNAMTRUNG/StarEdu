import { Request, Response } from 'express';
import learningScheduleService from '../services/learningSchedule.service';

class LearningScheduleController {
  /**
   * POST /api/schedules - Tạo schedule mới
   */
  async createSchedule(req: Request, res: Response) {
    try {
      console.log('📥 Create schedule request received');
      console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
      console.log('👤 User from token:', (req as any).user);
      
      const { roadmap_ids, schedule_config } = req.body;
      const user_id = (req as any).user?.id || (req as any).user?._id;

      console.log('🔍 Extracted user_id:', user_id);
      console.log('🔍 Roadmap IDs:', roadmap_ids);
      console.log('🔍 Schedule config:', schedule_config);

      if (!user_id) {
        console.error('❌ No user_id found in request');
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - User not found'
        });
      }

      if (!roadmap_ids || !Array.isArray(roadmap_ids) || roadmap_ids.length === 0) {
        console.error('❌ Invalid roadmap_ids:', roadmap_ids);
        return res.status(400).json({
          success: false,
          message: 'roadmap_ids is required and must be a non-empty array'
        });
      }

      console.log('✅ Creating schedule...');
      const schedule = await learningScheduleService.createSchedule({
        user_id,
        roadmap_ids,
        schedule_config: {
          ...schedule_config,
          start_date: new Date(schedule_config.start_date)
        }
      });

      console.log('✅ Schedule created successfully:', schedule._id);
      res.status(201).json({
        success: true,
        message: 'Tạo lịch học thành công',
        data: schedule
      });
    } catch (error: any) {
      console.error('❌ Create schedule error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi tạo lịch học'
      });
    }
  }

  /**
   * GET /api/schedules/my-schedule - Lấy schedule của user
   */
  async getMySchedule(req: Request, res: Response) {
    try {
      const user_id = (req as any).user?.id || (req as any).user?._id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const schedule = await learningScheduleService.getMySchedule(user_id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Chưa có lịch học'
        });
      }

      res.json({
        success: true,
        data: schedule
      });
    } catch (error: any) {
      console.error('Get schedule error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi lấy lịch học'
      });
    }
  }

  /**
   * PATCH /api/schedules/complete-lesson - Đánh dấu lesson hoàn thành
   */
  async completeLesson(req: Request, res: Response) {
    try {
      const { lesson_id, section_id, actual_duration } = req.body;
      const user_id = (req as any).user?.id || (req as any).user?._id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const schedule = await learningScheduleService.completeLesson(
        user_id,
        lesson_id,
        section_id,
        actual_duration
      );

      res.json({
        success: true,
        message: 'Đã đánh dấu hoàn thành',
        data: schedule
      });
    } catch (error: any) {
      console.error('Complete lesson error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi cập nhật tiến độ'
      });
    }
  }

  /**
   * PUT /api/schedules/config - Update schedule config
   */
  async updateConfig(req: Request, res: Response) {
    try {
      const { days_per_week, min_hours_per_day, max_hours_per_day } = req.body;
      const user_id = (req as any).user?.id || (req as any).user?._id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const schedule = await learningScheduleService.updateScheduleConfig(user_id, {
        days_per_week,
        min_hours_per_day,
        max_hours_per_day
      });

      res.json({
        success: true,
        message: 'Cập nhật cấu hình thành công',
        data: schedule
      });
    } catch (error: any) {
      console.error('Update config error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi cập nhật cấu hình'
      });
    }
  }

  /**
   * POST /api/schedules/reschedule - Trigger manual reschedule
   */
  async manualReschedule(req: Request, res: Response) {
    try {
      const user_id = (req as any).user?.id || (req as any).user?._id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const schedule = await learningScheduleService.getMySchedule(user_id);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch học'
        });
      }

      await learningScheduleService.autoRescheduleIncomplete(schedule);

      res.json({
        success: true,
        message: 'Đã sắp xếp lại lịch học',
        data: schedule
      });
    } catch (error: any) {
      console.error('Manual reschedule error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi sắp xếp lại lịch'
      });
    }
  }

  /**
   * DELETE /api/schedules - Xóa schedule
   */
  async deleteSchedule(req: Request, res: Response) {
    try {
      const user_id = (req as any).user?.id || (req as any).user?._id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const deleted = await learningScheduleService.deleteSchedule(user_id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch học để xóa'
        });
      }

      res.json({
        success: true,
        message: 'Đã xóa lịch học'
      });
    } catch (error: any) {
      console.error('Delete schedule error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi xóa lịch học'
      });
    }
  }
}

export default new LearningScheduleController();
