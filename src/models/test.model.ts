import { Schema, model, Types } from "mongoose";

const testSchema = new Schema({
    title: { type: String, required: true },          // ETS 2020 Practice Test 1
    year: { type: Number },
    source: { type: String, default: "ETS" },
    audioUrl: { type: String },
    parts: [
        {
            partNumber: { type: Number },
            questionIds: [{ type: Types.ObjectId, ref: "Question" }]
        }
    ]
}, { timestamps: true, collection: "tests" });

export const TestModel = model("Test", testSchema);
