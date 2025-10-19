import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const TestSchema = new Schema({
    type: { type: String },
    title: { type: String, required: true },
    topicSet_id: { type: Schema.Types.ObjectId, ref: "TopicSet" },
    description: { type: String },
    questions: { type: [Schema.Types.ObjectId], ref: "Question", default: [] }
}, { timestamps: true, collection: "tests" });


export type ITest = InferSchemaType<typeof TestSchema>;
const TestModel: Model<ITest> = mongoose.model<ITest>("Test", TestSchema);
export default TestModel;