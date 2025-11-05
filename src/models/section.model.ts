import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const QuestionSchema = new Schema({
    id: { type: String, required: true },
    questionText: { type: String },
    questionType: { type: String, enum: ['multiple-choice', 'fill-blank'], required: true },
    options: [{ type: String }],
    correctAnswer: { type: Number },
    correctAnswers: [{ type: String }],
    explanation: { type: String },
    points: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
    audio: { type: String },
    image: { type: String },
    transcript: { type: String }
}, { _id: false });

const SectionSchema = new Schema({
    lesson_id: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    video_url: { type: String },
    mindmap_url: { type: String },
    description: { type: String },
    test_id: { type: Schema.Types.ObjectId, ref: "Test" },
    type: { type: String, enum: ['video', 'audio', 'mindmap', 'quiz', 'exercise', 'article'], default: 'video' },
    audioUrl: { type: String },
    articleContent: { type: String },
    questions: [QuestionSchema],
    passingScore: { type: Number, default: 70 }
}, { timestamps: true, collection: "sections" });

export type ISection = InferSchemaType<typeof SectionSchema>;
const SectionModel: Model<ISection> = mongoose.model<ISection>("Section", SectionSchema);
export default SectionModel;