import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const LessonSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    description: { type: String },
    is_preview: { type: Boolean, default: false },
    is_published: { type: Boolean, default: false },
    test_id: { type: Schema.Types.ObjectId, ref: "Test" }
}, { timestamps: true, collection: "lessons" });


export type ILesson = InferSchemaType<typeof LessonSchema>;
const LessonModel: Model<ILesson> = mongoose.model<ILesson>("Lesson", LessonSchema);
export default LessonModel;