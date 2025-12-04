import mongoose, { Schema, InferSchemaType } from "mongoose";

const StudentFlashCardSchema = new Schema({
    term: { type: String, required: true },
    mainMeaning: { type: String, required: true },
    example: { type: String },
    ipa: { type: String },
    collocations: {
        type: [
            {
                phrase: { type: String },
                meaning: { type: String },
            },
        ],
        default: [],
    },
    audioUS_url: { type: String },
    audioUK_url: { type: String },
}, { _id: true });

const StudentVocabularySetSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    topic: { type: String, required: true }, // Chủ đề người dùng nhập
    cards: { type: [StudentFlashCardSchema], default: [] },
    is_ai_generated: { type: Boolean, default: true }, // Đánh dấu là AI tạo
}, { timestamps: true, collection: "student_vocabulary_sets" });

// Index để query nhanh theo user
StudentVocabularySetSchema.index({ user_id: 1, createdAt: -1 });

export type IStudentVocabularySet = InferSchemaType<typeof StudentVocabularySetSchema>;
const StudentVocabularySetModel = mongoose.model<IStudentVocabularySet>("StudentVocabularySet", StudentVocabularySetSchema);
export default StudentVocabularySetModel;
