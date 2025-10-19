import mongoose, { Schema, Model, InferSchemaType } from "mongoose";


const AnswerSchema = new Schema({
    question_id: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    sub_question_number: { type: Number },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    filling_inputs: { type: [String], default: [] },
    writing_input: { type: String },
    selected_options: { type: [{ id: String, text: String }], default: [] },
    is_correct: { type: Boolean, default: false },
    evaluate_answer_writing: {
        overview: { type: String },
        strengths: { type: [String], default: [] },
        weaknesses: { type: [String], default: [] },
        score: { type: Number }
    },
    points_earned: { type: Number, default: 0 },
    submitted_at: { type: Date, default: Date.now }
}, { timestamps: true, collection: "answers" });


export type IAnswer = InferSchemaType<typeof AnswerSchema>;
const AnswerModel: Model<IAnswer> = mongoose.model<IAnswer>("Answer", AnswerSchema);
export default AnswerModel;