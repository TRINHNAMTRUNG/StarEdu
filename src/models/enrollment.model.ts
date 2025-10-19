import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const EnrollmentSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roadmap_id: { type: Schema.Types.ObjectId, ref: "Roadmap" },
    roadmap_title: { type: String },
    payment_id: { type: Schema.Types.ObjectId, ref: "Payment" },
    enrolled_at: { type: Date, default: Date.now },
    original_price: { type: Number },
    discount_percentage: { type: Number, default: 0 }
}, { timestamps: true, collection: "enrollments" });


export type IEnrollment = InferSchemaType<typeof EnrollmentSchema>;
const EnrollmentModel: Model<IEnrollment> = mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
export default EnrollmentModel;