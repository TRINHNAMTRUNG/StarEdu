import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const LessonSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true, default: 0 }, // Thứ tự lesson trong course
    is_published: { type: Boolean, default: false }, // Xuất bản/ẩn
    estimated_duration: { type: Number, default: 0 }, // Thời lượng ước tính (phút)
    created_by: { type: Schema.Types.ObjectId, ref: "Teacher", required: true }, // Teacher tạo
}, { timestamps: true, collection: "lessons" });

export type ILesson = InferSchemaType<typeof LessonSchema>;
const LessonModel: Model<ILesson> = mongoose.model<ILesson>("Lesson", LessonSchema);
export default LessonModel;