import mongoose, { Schema, InferSchemaType } from "mongoose";

const FeedbackSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    pros: { type: String, trim: true },
    cons: { type: String, trim: true },
    would_recommend: { type: String, trim: true },
}, { timestamps: true, collection: "feedbacks" });

export type IFeedback = InferSchemaType<typeof FeedbackSchema>;
const FeedbackModel = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
export default FeedbackModel;
