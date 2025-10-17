import mongoose, { Schema, Document, Types, Model, InferSchemaType } from "mongoose";
import { Infer } from "zod";

export enum Level {
    A1 = "A1",
    A2 = "A2",
    B1 = "B1",
    B2 = "B2",
    C1 = "C1",
    C2 = "C2"
}

const StudentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    enrollment_date: { type: Date, default: Date.now },
    level: {
        type: String,
        enum: Object.values(Level),
        required: true
    },
    target_score: { type: Number, required: true },
}, { timestamps: true, collection: "students" });


export type IStudent = InferSchemaType<typeof StudentSchema>;
const StudentModel: Model<IStudent> = mongoose.model<IStudent>("Student", StudentSchema);

export default StudentModel;
