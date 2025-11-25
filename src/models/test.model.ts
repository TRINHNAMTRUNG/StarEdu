import { Schema, model, Types, Model, InferSchemaType } from "mongoose";

const TestSchema = new Schema({
    title: { type: String, required: true },
    year: { type: Number },
    source: { type: String, default: "ETS" },
    audioUrl: { type: String },
    parts: [
        {
            partNumber: { type: Number },
            questionIds: [{ type: Types.ObjectId, ref: "Question" }]
        }
    ],
    created_by: { type: Schema.Types.ObjectId, ref: "Teacher", required: true }, // Teacher tạo
    is_published: { type: Boolean, default: false }, // Xuất bản/ẩn
    time_limit: { type: Number }, // Giới hạn thời gian (phút)
    passing_score: { type: Number }, // Điểm đạt
}, { timestamps: true, collection: "tests" });

export type ITest = InferSchemaType<typeof TestSchema>;
export const TestModel: Model<ITest> = model<ITest>("Test", TestSchema);
