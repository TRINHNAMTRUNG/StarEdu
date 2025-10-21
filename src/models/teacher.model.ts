import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

export enum EmploymentStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}

const QualificationSchema = new Schema({
    degree: { type: String, required: true },
    major: { type: String, required: true },
    institution: { type: String, required: true },
    issue_date: { type: Date, required: true },
}, { _id: false });

const TeacherSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String },
    experience_years: { type: Number, default: 0 },
    start_date: { type: Date, default: Date.now },
    employment_status: { type: String, enum: Object.values(EmploymentStatus), default: EmploymentStatus.ACTIVE },
    qualifications: { type: [QualificationSchema] },
    rating: { type: Number, default: 0 },
    total_courses: { type: Number, default: 0 },
}, { timestamps: true, collection: "teachers" });

export type ITeacher = InferSchemaType<typeof TeacherSchema>;
const TeacherModel: Model<ITeacher> = mongoose.model<ITeacher>("Teacher", TeacherSchema);

export default TeacherModel;
