import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const TopicSetSchema = new Schema({
    title: { type: String, required: true },
    skill: { type: String },
    description: { type: String },
    compiled_by: { type: Schema.Types.ObjectId, ref: "User" },
    is_preview: { type: Boolean, default: false }
}, { timestamps: true, collection: "topicSets" });


export type ITopicSet = InferSchemaType<typeof TopicSetSchema>;
const TopicSetModel: Model<ITopicSet> = mongoose.model<ITopicSet>("TopicSet", TopicSetSchema);
export default TopicSetModel;