import mongoose, { Schema, InferSchemaType } from "mongoose";

const CourseProgressSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    roadmap_id: { type: Schema.Types.ObjectId, ref: "Roadmap" },
    total_lessons: { type: Number, default: 0 },
    user_capt: { type: Number, default: 0 },
    is_completed: { type: Boolean, default: false },
    lessonProgresses: [{ type: Schema.Types.ObjectId, ref: "LessonProgress" }],
}, { timestamps: true, collection: "course_progresses" });

export type ICourseProgress = InferSchemaType<typeof CourseProgressSchema>;
const CourseProgressModel = mongoose.model<ICourseProgress>("CourseProgress", CourseProgressSchema);
export default CourseProgressModel;
