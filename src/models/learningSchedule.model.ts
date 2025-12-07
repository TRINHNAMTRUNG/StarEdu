import mongoose, { Schema, Document } from 'mongoose';

export interface IScheduledLesson {
  course_id: mongoose.Types.ObjectId;
  lesson_id: mongoose.Types.ObjectId;
  section_id: mongoose.Types.ObjectId;
  scheduled_date: Date;
  estimated_duration: number; // minutes
  completed: boolean;
  completed_at?: Date;
  actual_duration?: number;
  order_in_day: number; // Thứ tự trong ngày
}

export interface IScheduleConfig {
  days_per_week: number;
  min_hours_per_day: number;
  max_hours_per_day: number;
  start_date: Date;
  focus_skills: string[];
}

export interface ILearningSchedule extends Document {
  user_id: mongoose.Types.ObjectId;
  roadmap_ids: mongoose.Types.ObjectId[];
  schedule_config: IScheduleConfig;
  scheduled_lessons: IScheduledLesson[];
  auto_reschedule: boolean;
  last_rescheduled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const ScheduledLessonSchema = new Schema<IScheduledLesson>({
  course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  lesson_id: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  section_id: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
  scheduled_date: { type: Date, required: true },
  estimated_duration: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  completed_at: { type: Date },
  actual_duration: { type: Number },
  order_in_day: { type: Number, required: true }
});

const ScheduleConfigSchema = new Schema<IScheduleConfig>({
  days_per_week: { type: Number, required: true, min: 1, max: 7 },
  min_hours_per_day: { type: Number, required: true, min: 0.5 },
  max_hours_per_day: { type: Number, required: true, min: 0.5 },
  start_date: { type: Date, required: true },
  focus_skills: [{ type: String }]
});

const LearningScheduleSchema = new Schema<ILearningSchedule>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  roadmap_ids: [{ type: Schema.Types.ObjectId, ref: 'Roadmap', required: true }],
  schedule_config: { type: ScheduleConfigSchema, required: true },
  scheduled_lessons: [ScheduledLessonSchema],
  auto_reschedule: { type: Boolean, default: true },
  last_rescheduled_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Index để query nhanh
LearningScheduleSchema.index({ user_id: 1 });
LearningScheduleSchema.index({ 'scheduled_lessons.scheduled_date': 1 });
LearningScheduleSchema.index({ user_id: 1, 'scheduled_lessons.completed': 1 });

// Middleware update timestamp
LearningScheduleSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model<ILearningSchedule>('LearningSchedule', LearningScheduleSchema);
