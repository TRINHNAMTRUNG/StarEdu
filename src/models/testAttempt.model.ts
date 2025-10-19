import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const TestAttemptSchema = new Schema({
    test_id: { type: Schema.Types.ObjectId, ref: "Test", required: true },
    test_title: { type: String },
    answer_ids: { type: [Schema.Types.ObjectId], ref: "Answer", default: [] },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    total_score: { type: Number, default: 0 },
    max_score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    started_at: { type: Date, default: Date.now },
    submitted_at: { type: Date },
    duration: { type: Number },
    is_passed: { type: Boolean, default: false },
    remarks: { type: String }
}, { timestamps: true, collection: "testAttempts" });


export type ITestAttempt = InferSchemaType<typeof TestAttemptSchema>;
const TestAttemptModel: Model<ITestAttempt> = mongoose.model<ITestAttempt>("TestAttempt", TestAttemptSchema);
export default TestAttemptModel;