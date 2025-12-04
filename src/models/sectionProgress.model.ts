import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

/**
 * Model lưu tiến độ và kết quả làm bài tập của section
 * Dùng để kiểm tra điều kiện mở khóa chương tiếp theo
 */
const SectionProgressSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    section_id: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    lesson_id: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    
    // Loại section (video, mindmap, exercise, quiz)
    section_type: { type: String, enum: ["video", "mindmap", "exercise", "quiz"], required: true },
    
    // Cho video/mindmap: đánh dấu đã xem
    is_viewed: { type: Boolean, default: false },
    viewed_at: { type: Date },
    
    // Cho exercise/quiz: lưu kết quả làm bài
    total_questions: { type: Number, default: 0 },
    correct_answers: { type: Number, default: 0 },
    score_percentage: { type: Number, default: 0 }, // 0-100%
    
    // Đánh dấu đã hoàn thành (đạt điều kiện)
    // - Video/Mindmap: is_viewed = true
    // - Exercise/Quiz: score_percentage >= 70
    is_completed: { type: Boolean, default: false },
    completed_at: { type: Date },
    
    // Số lần làm bài (cho exercise/quiz)
    attempts: { type: Number, default: 0 },
    
    // Lưu câu trả lời chi tiết (optional)
    answers: [{
        question_id: { type: String },
        selected_answer: { type: Number },
        is_correct: { type: Boolean }
    }]
}, { timestamps: true, collection: "section_progress" });

// Index để query nhanh
SectionProgressSchema.index({ student: 1, section_id: 1 }, { unique: true });
SectionProgressSchema.index({ student: 1, lesson_id: 1 });
SectionProgressSchema.index({ student: 1, course_id: 1 });

export type ISectionProgress = InferSchemaType<typeof SectionProgressSchema>;
const SectionProgressModel: Model<ISectionProgress> = mongoose.model<ISectionProgress>("SectionProgress", SectionProgressSchema);
export default SectionProgressModel;
