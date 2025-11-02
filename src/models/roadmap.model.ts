import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

export enum SkillGroup {
    LISTENING = "listening",
    READING = "reading",
    SPEAKING = "speaking",
    WRITING = "writing",
    VOCABULARY = "vocabulary",
    GRAMMAR = "grammar"
}

const RoadmapSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    skill_groups: [{ type: String, enum: Object.values(SkillGroup) }], // Tập trung vào kỹ năng nào
    target_score: { type: Number, required: true }, // Điểm mục tiêu (VD: TOEIC 850, IELTS 7.0)
    courses: [{ type: Schema.Types.ObjectId, ref: "Course" }], // Danh sách courses
    price: { type: Number, required: true, default: 0 }, // Giá gốc
    discount_percentage: { type: Number, default: 0, min: 0, max: 100 }, // Giảm giá %
    is_published: { type: Boolean, default: false }, // Xuất bản/ẩn
    total_enrollments: { type: Number, default: 0 }, // Số lượng đăng ký
}, { timestamps: true, collection: "roadmaps" });

// Virtual field: Giá sau giảm
RoadmapSchema.virtual("final_price").get(function () {
    return this.price * (1 - this.discount_percentage / 100);
});

export type IRoadmap = InferSchemaType<typeof RoadmapSchema>;
const RoadmapModel: Model<IRoadmap> = mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
export default RoadmapModel;