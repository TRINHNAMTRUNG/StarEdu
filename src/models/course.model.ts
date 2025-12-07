import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

export enum SkillGroup {
    LISTENING = "listening",
    READING = "reading",
    SPEAKING = "speaking",
    WRITING = "writing",
    VOCABULARY = "vocabulary",
    GRAMMAR = "grammar"
}

const CourseSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String },
    skill_groups: [{ type: String, enum: Object.values(SkillGroup) }],

    assigned_teachers: [{
        type: Schema.Types.ObjectId,
        ref: "Teacher"
    }],

    is_published: { type: Boolean, default: false },
    is_free: { type: Boolean, default: false }, // ✅ THÊM MỚI - Course miễn phí
    price: { type: Number, default: 0 }, // ✅ Giá khóa học (VND)
    original_price: { type: Number, default: 0 }, // ✅ Giá gốc trước khi giảm (VND)
    is_deleted: { type: Boolean, default: false }, // ✅ THÊM MỚI - Soft delete
    deleted_at: { type: Date }, // ✅ THÊM MỚI
    deleted_by: { type: Schema.Types.ObjectId, ref: "User" }, // ✅ THÊM MỚI

    order: { type: Number, default: 0 },
    total_enrollments: { type: Number, default: 0 },
    total_duration_minutes: { type: Number, default: 0 }, // ✅ Tổng thời gian khóa học (phút)
    average_rating: { type: Number, default: 0 },
    total_reviews: { type: Number, default: 0 },
}, { timestamps: true, collection: "courses" });

export type ICourse = InferSchemaType<typeof CourseSchema>;
const CourseModel: Model<ICourse> = mongoose.model<ICourse>("Course", CourseSchema);
export default CourseModel;