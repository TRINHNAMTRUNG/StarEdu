import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const CourseProgressSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    completed_lessons: { type: Number, default: 0 },
    total_lessons: { type: Number, default: 0 },
    progress_percentage: { type: Number, default: 0 },
    is_completed: { type: Boolean, default: false },
    completed_at: { type: Date },
    last_accessed_section: { type: Schema.Types.ObjectId, ref: "Section" }, // Section cuối cùng học
    total_time_spent: { type: Number, default: 0 }, // Tổng thời gian học (giây)
    last_accessed_at: { type: Date }, // Lần cuối truy cập
}, { timestamps: true, collection: "course_progress" });

export type ICourseProgress = InferSchemaType<typeof CourseProgressSchema>;
const CourseProgressModel: Model<ICourseProgress> = mongoose.model<ICourseProgress>("CourseProgress", CourseProgressSchema);
export default CourseProgressModel;
