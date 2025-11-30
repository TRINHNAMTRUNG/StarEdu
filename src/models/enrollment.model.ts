import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

export enum EnrolledBy {
    MOMO = "momo",
    VNPAY = "vnpay",
    ZALOPAY = "zalopay",
    ADMIN = "admin" // Admin tặng free
}

export enum EnrollmentStatus {
    ACTIVE = "active",
    EXPIRED = "expired",
    CANCELLED = "cancelled"
}

const EnrollmentSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    roadmap: { type: Schema.Types.ObjectId, ref: "Roadmap", required: true },
    payment_id: { type: Schema.Types.ObjectId, ref: "Payment", required: true }, // ✅ Required
    enrolled_date: { type: Date, required: true }, // ✅ enrolled_date (không phải enrollment_date)
    enrolled_by: {
        type: String,
        enum: Object.values(EnrolledBy),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(EnrollmentStatus),
        default: EnrollmentStatus.ACTIVE
    },
    expire_date: { type: Date }, // Optional
    enrolled_price: { type: Number }, // Optional (có thể free)
    completion_percentage: { type: Number, default: 0 },
    last_accessed: { type: Date },
    certificate: { type: Schema.Types.ObjectId, ref: "Certification" }
}, { timestamps: true, collection: "enrollments" });

export type IEnrollment = InferSchemaType<typeof EnrollmentSchema>;
const EnrollmentModel: Model<IEnrollment> = mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
export default EnrollmentModel;