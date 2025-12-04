import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const VocabularyProgressSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    set_id: { type: Schema.Types.ObjectId, ref: "VocabularySet", required: true },
    learned_words: [{
        word_id: { type: Schema.Types.ObjectId, required: true },
        learned_at: { type: Date, default: Date.now },
        recorded: { type: Boolean, default: false }
    }],
    completion_percentage: { type: Number, default: 0 },
    is_completed: { type: Boolean, default: false },
    last_practiced: { type: Date, default: Date.now }
}, { timestamps: true, collection: "vocabulary_progress" });

// Index for faster queries
VocabularyProgressSchema.index({ user_id: 1, set_id: 1 }, { unique: true });

export type IVocabularyProgress = InferSchemaType<typeof VocabularyProgressSchema>;
const VocabularyProgressModel: Model<IVocabularyProgress> = mongoose.model<IVocabularyProgress>("VocabularyProgress", VocabularyProgressSchema);
export default VocabularyProgressModel;
