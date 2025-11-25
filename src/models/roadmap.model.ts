import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import { Level } from "./student.model";

const RoadmapSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String },
    target_level: { type: String, enum: Object.values(Level), required: true },
    duration_weeks: { type: Number, required: true },
    price: { type: Number, required: true },
    discount_price: { type: Number },

    courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    certifications: [{ type: Schema.Types.ObjectId, ref: "Certification" }],

    is_published: { type: Boolean, default: false },
    is_free: { type: Boolean, default: false }, // ✅ THÊM MỚI

    total_enrollments: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },

}, { timestamps: true, collection: "roadmaps" });

export type IRoadmap = InferSchemaType<typeof RoadmapSchema>;
const RoadmapModel: Model<IRoadmap> = mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
export default RoadmapModel;