import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const RoadmapSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    certification_id: { type: Schema.Types.ObjectId, ref: "Certification" },
    target_score: { type: Number },
    total_courses: { type: Number, default: 0 },
    skill_groups: { type: [String], default: [] },
    original_price: { type: Number },
    discount_percentage: { type: Number, default: 0 },
    is_published: { type: Boolean, default: false }
}, { timestamps: true, collection: "roadmaps" });


export type IRoadmap = InferSchemaType<typeof RoadmapSchema>;
const RoadmapModel: Model<IRoadmap> = mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
export default RoadmapModel;