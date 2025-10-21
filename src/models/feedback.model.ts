import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const FeedbackSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    is_approved: { type: Boolean, default: true }, // Admin duyệt
    helpful_count: { type: Number, default: 0 }, // Số người thấy hữu ích
    reported_count: { type: Number, default: 0 }, // Số lần bị báo cáo
}, { timestamps: true, collection: "feedbacks" });

export type IFeedback = InferSchemaType<typeof FeedbackSchema>;
const FeedbackModel: Model<IFeedback> = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
export default FeedbackModel;
