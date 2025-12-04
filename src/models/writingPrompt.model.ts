import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

export enum WritingPromptType {
    TEXT = "text",
    IMAGE = "image"
}

/**
 * Schema tối giản lưu đề writing
 * - type: "text" | "image"
 * - required_words: mảng đúng 2 từ (non-empty)
 * - image_url: chỉ dùng nếu type === "image"
 * - created_by: admin user id (audit)
 */
const WritingPromptSchema = new Schema({
    type: { type: String, enum: Object.values(WritingPromptType), required: true },
    required_words: {
        type: [String],
        required: true,
        validate: {
            validator: function (arr: string[]) {
                return Array.isArray(arr) && arr.length === 2 && arr.every(w => typeof w === "string" && w.trim().length > 0);
            },
            message: "required_words phải là mảng gồm đúng 2 từ (non-empty strings)"
        }
    },
    image_url: { type: String }, // chỉ dùng cho type === "image"
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true, collection: "writing_prompts" });

WritingPromptSchema.index({ type: 1 });

export type IWritingPrompt = InferSchemaType<typeof WritingPromptSchema>;
const WritingPromptModel: Model<IWritingPrompt> = mongoose.model<IWritingPrompt>("WritingPrompt", WritingPromptSchema);
export default WritingPromptModel;
