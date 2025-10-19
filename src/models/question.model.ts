import { Schema, model } from "mongoose";

const optionSchema = new Schema({
    A: String,
    B: String,
    C: String,
    D: String
}, { _id: false });

const questionSchema = new Schema({
    part: { type: Number, required: true },
    type: { type: String, enum: ["single", "group"], default: "single" },
    groupNumber: { type: Number },
    questionNumber: { type: Number },
    questionText: { type: String },
    audio: { type: String },
    image: { type: String },
    contextHtml: { type: String },
    transcript: { type: String },
    options: optionSchema,
    answer: { type: String },
    explanation: { type: String },
    subQuestions: [{ type: Schema.Types.ObjectId, ref: "Question" }] // cho group
}, { timestamps: true, collection: "questions" });

export const QuestionModel = model("Question", questionSchema);
