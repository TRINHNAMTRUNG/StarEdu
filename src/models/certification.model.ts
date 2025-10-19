import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const CertificationSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String }
}, { timestamps: true, collection: "certifications" });


export type ICertification = InferSchemaType<typeof CertificationSchema>;
const CertificationModel: Model<ICertification> = mongoose.model<ICertification>("Certification", CertificationSchema);
export default CertificationModel;