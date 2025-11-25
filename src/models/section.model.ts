import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const SectionSchema = new Schema({
    lesson_id: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    video_url: { type: String },
    mindmap_url: { type: String },
    description: { type: String },
    test_id: { type: Schema.Types.ObjectId, ref: "Test" }
}, { timestamps: true, collection: "sections" });

export type ISection = InferSchemaType<typeof SectionSchema>;
const SectionModel: Model<ISection> = mongoose.model<ISection>("Section", SectionSchema);
export default SectionModel;