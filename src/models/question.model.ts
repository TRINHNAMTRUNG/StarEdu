import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


export enum QuestionType {
    MULTIPLE_CHOICE = "multiple_choice",
    FILLING = "filling",
    WRITING = "writing",
    SPEAKING = "speaking"
}


const OptionSubSchema = new Schema({
    id: { type: String },
    text: { type: String }
}, { _id: false });


const SubQuestionSchema = new Schema({
    number: { type: Number },
    options: { type: [OptionSubSchema], default: [] },
    text: { type: String }
}, { _id: false });


const QuestionSchema = new Schema({
    test_id: { type: Schema.Types.ObjectId, ref: "Test" },
    type: { type: String, enum: Object.values(QuestionType), default: QuestionType.MULTIPLE_CHOICE },
    content: { type: String },
    display_content: { type: String },
    filling_answer: { type: [String], default: [] },
    sub_questions: { type: [SubQuestionSchema], default: [] },
    correct_answer: { type: [String], default: [] },
    explanation: { type: String },
    writing_task: {
        keywords: { type: [String], default: [] },
        model_answer: { type: String },
        word_count_range: {
            min: { type: Number },
            max: { type: Number }
        },
        outline_guidelines: { type: [String], default: [] }
    },
    points: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    skill: { type: String },
    media: {
        audio_url: { type: String },
        image_url: { type: String }
    }
}, { timestamps: true, collection: "questions" });


export type IQuestion = InferSchemaType<typeof QuestionSchema>;
const QuestionModel: Model<IQuestion> = mongoose.model<IQuestion>("Question", QuestionSchema);
export default QuestionModel;