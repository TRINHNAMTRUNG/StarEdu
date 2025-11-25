import mongoose, { Schema, InferSchemaType } from "mongoose";

export enum CertificationType {
    IELTS = "ielts",
    TOEIC = "toeic",
    TOEFL = "toefl",
}

const CertificationSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: Object.values(CertificationType), required: true },
    description: { type: String },
    issuer: { type: String, required: true },
    validityPeriod: { type: Number }, // Thời hạn hiệu lực (tháng)

}, { timestamps: true, collection: "certifications" });

export type ICertification = InferSchemaType<typeof CertificationSchema>;
const CertificationModel = mongoose.model<ICertification>("Certification", CertificationSchema);

export default CertificationModel;