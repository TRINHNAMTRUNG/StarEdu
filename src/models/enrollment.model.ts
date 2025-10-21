import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

export enum EnrollmentStatus {
    ACTIVE = "active",
    COMPLETED = "completed",
    EXPIRED = "expired"
}

export enum EnrolledBy {
    SELF = "self",
    ADMIN = "admin"
}

const EnrollmentSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    roadmap: { type: Schema.Types.ObjectId, ref: "Roadmap", required: true },
    payment_id: { type: Schema.Types.ObjectId, ref: "Payment", required: true },  // Link đến Payment
    enrolled_date: { type: Date, default: Date.now },
    enrolled_by: { type: String, enum: Object.values(EnrolledBy), default: EnrolledBy.SELF },
    expire_date: { type: Date },
    status: { type: String, enum: Object.values(EnrollmentStatus), default: EnrollmentStatus.ACTIVE },
    enrolled_price: { type: Number },  // Giá roadmap tại thời điểm mua
}, { timestamps: true, collection: "enrollments" });

export type IEnrollment = InferSchemaType<typeof EnrollmentSchema>;
const EnrollmentModel: Model<IEnrollment> = mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
export default EnrollmentModel;