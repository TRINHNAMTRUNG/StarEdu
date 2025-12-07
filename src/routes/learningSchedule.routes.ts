import express from 'express';
import learningScheduleController from '../controllers/learningSchedule.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(authenticateToken);

// POST /api/schedules - Tạo schedule mới (sau khi payment thành công)
router.post('/', learningScheduleController.createSchedule);

// GET /api/schedules/my-schedule - Lấy schedule của user hiện tại
router.get('/my-schedule', learningScheduleController.getMySchedule);

// PATCH /api/schedules/complete-lesson - Đánh dấu lesson hoàn thành
router.patch('/complete-lesson', learningScheduleController.completeLesson);

// PUT /api/schedules/config - Update schedule config (days, hours)
router.put('/config', learningScheduleController.updateConfig);

// POST /api/schedules/reschedule - Trigger manual reschedule
router.post('/reschedule', learningScheduleController.manualReschedule);

// DELETE /api/schedules - Xóa schedule
router.delete('/', learningScheduleController.deleteSchedule);

export default router;
