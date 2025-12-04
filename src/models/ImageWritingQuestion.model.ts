import { Schema, model, Document } from "mongoose";

export enum ImageWritingDifficulty {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard"
}

export enum ImageWritingCategory {
    PEOPLE = "people",
    PLACES = "places",
    OBJECTS = "objects",
    ACTIVITIES = "activities",
    NATURE = "nature",
    TECHNOLOGY = "technology",
    BUSINESS = "business",
    EDUCATION = "education",
    OTHER = "other"
}

export interface IImageWritingQuestion extends Document {
    // Ảnh
    image_url: string;
    image_description: string; // Mô tả do AI Gemini tạo ra

    // Yêu cầu
    required_words: string[]; // Mảng 2 từ

    // Metadata
    difficulty: ImageWritingDifficulty;
    category: ImageWritingCategory;
    hint?: string; // Gợi ý thêm cho học sinh (optional)
    
    // Sample answer (optional)
    sample_answer?: string;
    
    // Status
    isActive: boolean;
    
    // Tracking
    createdBy: Schema.Types.ObjectId; // Admin ID
    createdAt: Date;
    updatedAt: Date;
    usageCount: number; // Số lần học sinh làm bài này
}

const ImageWritingQuestionSchema = new Schema<IImageWritingQuestion>(
    {
        image_url: {
            type: String,
            required: [true, "Image URL là bắt buộc"]
        },
        image_description: {
            type: String,
            required: [true, "Image description là bắt buộc"]
        },
        required_words: {
            type: [String],
            required: [true, "Required words là bắt buộc"],
            validate: {
                validator: function(words: string[]) {
                    return words.length === 2;
                },
                message: "Required words phải có đúng 2 từ"
            }
        },
        difficulty: {
            type: String,
            enum: Object.values(ImageWritingDifficulty),
            default: ImageWritingDifficulty.MEDIUM
        },
        category: {
            type: String,
            enum: Object.values(ImageWritingCategory),
            default: ImageWritingCategory.OTHER
        },
        hint: {
            type: String,
            required: false
        },
        sample_answer: {
            type: String,
            required: false
        },
        isActive: {
            type: Boolean,
            default: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "CreatedBy là bắt buộc"]
        },
        usageCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Index for queries
ImageWritingQuestionSchema.index({ difficulty: 1, category: 1, isActive: 1 });
ImageWritingQuestionSchema.index({ createdBy: 1 });

const ImageWritingQuestionModel = model<IImageWritingQuestion>(
    "ImageWritingQuestion",
    ImageWritingQuestionSchema
);

export default ImageWritingQuestionModel;
