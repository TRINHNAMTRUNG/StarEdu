import mongoose, { Schema, InferSchemaType } from "mongoose";

export enum PartOfSpeech {
    NOUN = "noun",
    VERB = "verb",
    ADJECTIVE = "adjective",
    ADVERB = "adverb",
}

const FlashCardSchema = new Schema({
    term: { type: String, required: true },          // Từ vựng
    mainMeaning: { type: String, required: true },   // Nghĩa chính
    example: { type: String },                       // Ví dụ
    ipa: { type: String },                           // Phiên âm
    collocations: {                                  // Cụm collocation (3 cụm)
        type: [
            {
                phrase: { type: String },
                meaning: { type: String },
            },
        ],
        default: [],
    },
    audioUS_url: { type: String },                   // Âm thanh US
    audioUK_url: { type: String },                   // Âm thanh UK
}, { _id: true }); // mỗi flashcard có _id riêng

const VocabularySetSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    part_of_speech: { type: String, enum: Object.values(PartOfSpeech), required: true },
    day_number: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    cards: { type: [FlashCardSchema], default: [] },
}, { timestamps: true, collection: "vocabulary_sets" });

export type IVocabularySet = InferSchemaType<typeof VocabularySetSchema>;
const VocabularySetModel = mongoose.model<IVocabularySet>("VocabularySet", VocabularySetSchema);
export default VocabularySetModel;
