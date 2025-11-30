import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const LessonSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    duration: { type: Number, default: 0 },

    is_published: { type: Boolean, default: false }, // ✅ THÊM MỚI - Lesson published chưa
    is_free: { type: Boolean, default: false }, // ✅ THÊM MỚI - Lesson miễn phí (preview) - DEFAULT FALSE
}, { timestamps: true, collection: "lessons" });

export type ILesson = InferSchemaType<typeof LessonSchema>;
const LessonModel: Model<ILesson> = mongoose.model<ILesson>("Lesson", LessonSchema);
export default LessonModel;
