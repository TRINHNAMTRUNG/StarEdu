import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const LessonSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    is_published: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    duration_minutes: { type: Number, default: 0 },
    total_sections: { type: Number, default: 0 },
}, { timestamps: true, collection: "lessons" });

export type ILesson = InferSchemaType<typeof LessonSchema>;
const LessonModel: Model<ILesson> = mongoose.model<ILesson>("Lesson", LessonSchema);
export default LessonModel;