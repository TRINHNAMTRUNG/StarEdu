import mongoose, { Schema, Document, Types, Model, InferSchemaType } from "mongoose";
import { de } from "zod/v4/locales";

export enum EmploymentStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}

const QualificationSchema = new Schema({
    degree: { type: String, required: true }, // Bằng cấp
    major: { type: String, required: true }, // Chuyên ngành
    institution: { type: String, required: true }, // Tổ chức cấp bằng
    issue_date: { type: Date, required: true }, // Ngày cấp
}, { _id: false });

const TeacherSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String }, // Tiểu sử
    experience_years: { type: Number, default: 0 }, // Số năm kinh nghiệm
    start_date: { type: Date, default: Date.now }, // Ngày bắt đầu làm việc
    employment_status: { type: String, enum: Object.values(EmploymentStatus), default: EmploymentStatus.ACTIVE },
    qualifications: { type: [QualificationSchema] }, // Trình độ học vấn
    rating: { type: Number, default: 0 },
    total_courses: { type: Number, default: 0 },
}, { timestamps: true, collection: "teachers" });

export type ITeacher = InferSchemaType<typeof TeacherSchema>;
const TeacherModel = mongoose.model<ITeacher>("Teacher", TeacherSchema);

export default TeacherModel;
