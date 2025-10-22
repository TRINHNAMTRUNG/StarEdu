import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

export enum SkillGroup {
    LISTENING = "listening",
    READING = "reading",
    SPEAKING = "speaking",
    WRITING = "writing",
    VOCABULARY = "vocabulary",
    GRAMMAR = "grammar"
}

const CourseSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String },
    skill_groups: [{ type: String, enum: Object.values(SkillGroup) }],
    
    assigned_teachers: [{ 
        type: Schema.Types.ObjectId, 
        ref: "Teacher" 
    }],
    
    is_published: { type: Boolean, default: false },
    isModifiable: { type: Boolean, default: true },
    
    last_modified_by: { type: Schema.Types.ObjectId, ref: "Teacher" },
    last_modified_at: { type: Date },
    
    order: { type: Number, default: 0 },
    total_enrollments: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },
    total_reviews: { type: Number, default: 0 },
}, { timestamps: true, collection: "courses" });

export type ICourse = InferSchemaType<typeof CourseSchema>;
const CourseModel: Model<ICourse> = mongoose.model<ICourse>("Course", CourseSchema);
export default CourseModel;