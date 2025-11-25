import mongoose, { Schema, InferSchemaType } from "mongoose";

const LessonProgressSchema = new Schema({
    lesson_id: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    total_sections: { type: Number, default: 0 },
    user_capt: { type: Number, default: 0 },
    is_completed: { type: Boolean, default: false },
    section_progress: [{
        section_id: { type: Schema.Types.ObjectId, ref: "Section" },
        is_done: { type: Boolean, default: false },
        stars: { type: Number, min: 0, max: 5, default: 0 },
    }]
}, { timestamps: true, collection: "lesson_progresses" });

export type ILessonProgress = InferSchemaType<typeof LessonProgressSchema>;
const LessonProgressModel = mongoose.model<ILessonProgress>("LessonProgress", LessonProgressSchema);
export default LessonProgressModel;
