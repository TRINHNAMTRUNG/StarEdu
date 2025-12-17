import { Schema, model, Types, Model, InferSchemaType } from "mongoose";

/**
 * ========================================
 * PERSONAL VOCABULARY MODEL
 * ========================================
 * 
 * Lưu trữ từ vựng cá nhân của người dùng
 * Người dùng có thể thêm từ từ bài test, bài đọc, hoặc bất kỳ đâu
 * và luyện tập lại sau này
 */

const PersonalVocabularySchema = new Schema({
    user_id: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        required: true,
        index: true 
    },
    word: { 
        type: String, 
        required: true,
        trim: true,
        lowercase: true
    },
    definition: { 
        type: String, 
        required: true 
    },
    example: { 
        type: String 
    },
    translation: { 
        type: String // Dịch nghĩa tiếng Việt
    },
    phonetic: { 
        type: String // Phiên âm
    },
    audioUrl: { 
        type: String // Link audio phát âm
    },
    part_of_speech: { 
        type: String, // noun, verb, adjective, etc.
        enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'other'],
        default: 'other'
    },
    source: { 
        type: String, // Nguồn gốc từ: test, reading, listening, manual
        default: 'manual'
    },
    source_id: { 
        type: Schema.Types.ObjectId, // ID của test/question nếu từ đó
        refPath: 'source_type'
    },
    source_type: {
        type: String,
        enum: ['Test', 'Question']
    },
    notes: { 
        type: String // Ghi chú cá nhân của user
    },
    mastery_level: { 
        type: Number, // Mức độ thành thạo (0-5)
        default: 0,
        min: 0,
        max: 5
    },
    times_reviewed: { 
        type: Number, // Số lần đã ôn
        default: 0
    },
    last_reviewed: { 
        type: Date 
    },
    tags: [{ 
        type: String // Tags để phân loại: toeic, business, daily, etc.
    }],
    is_favorite: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true, 
    collection: "personal_vocabularies" 
});

// Compound index: Mỗi user chỉ có 1 từ duy nhất
PersonalVocabularySchema.index({ user_id: 1, word: 1 }, { unique: true });

// Index cho search và filter
PersonalVocabularySchema.index({ tags: 1 });
PersonalVocabularySchema.index({ mastery_level: 1 });
PersonalVocabularySchema.index({ is_favorite: 1 });

export type IPersonalVocabulary = InferSchemaType<typeof PersonalVocabularySchema>;
const PersonalVocabularyModel: Model<IPersonalVocabulary> = model<IPersonalVocabulary>(
    "PersonalVocabulary", 
    PersonalVocabularySchema
);

export default PersonalVocabularyModel;
