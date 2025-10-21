import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const InstructorSubSchema = new Schema({
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    name: { type: String },
    avatar: { type: String },
    experience_years: { type: Number },
    specialties: { type: [String], default: [] },
    qualification_name: { type: String }
}, { _id: false });

const CourseSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    instructors: { type: [InstructorSubSchema], default: [] },
    thumbnail: { type: String },
    total_cups: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    is_published: { type: Boolean, default: false }, // Xuất bản/ẩn
    price: { type: Number, default: 0 },
    skill_groups: { type: [String], default: [] },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: "Teacher",
        required: true
    },
    order: { type: Number, default: 0 }, // Thứ tự trong roadmap
    total_enrollments: { type: Number, default: 0 }, // Số lượng đăng ký
    average_rating: { type: Number, default: 0 }, // Đánh giá trung bình
    total_reviews: { type: Number, default: 0 }, // Số lượng đánh giá
}, { timestamps: true, collection: "courses" });

export type ICourse = InferSchemaType<typeof CourseSchema>;
const CourseModel: Model<ICourse> = mongoose.model<ICourse>("Course", CourseSchema);
export default CourseModel;