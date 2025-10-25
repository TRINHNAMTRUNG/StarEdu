import { Schema, model, Document, InferSchemaType } from 'mongoose';

// ----------------------------------------------------
// 1. Interfaces (Type Safety)
// ----------------------------------------------------

export interface IWord {
    word: string;
    meaning: string;
}

export interface IDictationBreak {
    breakNumber: number;
    startTime: number; // Đơn vị: Giây (Seconds)
    endTime: number;   // Đơn vị: Giây (Seconds)
    originalText: string;
    textTranslation: string;
    words: IWord[];
}

// ----------------------------------------------------
// 2. Mongoose Schema
// ----------------------------------------------------

const WordSchema = new Schema<IWord>({
    word: { type: String, required: true },
    meaning: { type: String, required: true },
}, { _id: false });

const DictationBreakSchema = new Schema<IDictationBreak>({
    breakNumber: { type: Number, required: true },
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
    originalText: { type: String, required: true },
    textTranslation: { type: String, required: true },
    words: [WordSchema],
}, { _id: false });

const DictationSchema = new Schema({
    title: { type: String, required: true, trim: true },
    youtubeVideoId: { type: String, required: true, unique: true },
    lessonTranslation: { type: String, required: true },
    breaks: [DictationBreakSchema],
}, {
    timestamps: true,
    collection: 'dictations'
});

export type IDictation = InferSchemaType<typeof DictationSchema>;
const DictationModel = model<IDictation>('Dictation', DictationSchema);

export default DictationModel;