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
    courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    price: { type: Number, required: true },
    discount_percentage: { type: Number, default: 0, min: 0, max: 100 }, // Giảm giá %
    thumbnail: { type: String },

    is_published: { type: Boolean, default: false },
    is_free: { type: Boolean, default: false }, // ✅ THÊM MỚI

    total_enrollments: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },

}, { timestamps: true, collection: "roadmaps" });

// Virtual field: Giá sau giảm
RoadmapSchema.virtual("final_price").get(function () {
    return this.price * (1 - this.discount_percentage / 100);
});

export type IRoadmap = InferSchemaType<typeof RoadmapSchema>;
const RoadmapModel: Model<IRoadmap> = mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
export default RoadmapModel;