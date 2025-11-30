import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const TestAttemptSchema = new Schema({
    user_id: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    test_id: { 
        type: Schema.Types.ObjectId, 
        ref: "Test", 
        required: true 
    },
    started_at: { 
        type: Date, 
        default: Date.now 
    },
    completed_at: { 
        type: Date 
    },
    answers: [{
        question_id: { type: Schema.Types.ObjectId, ref: "Question" },
        selected_answer: String, // "A", "B", "C", "D"
        is_correct: Boolean,
        time_spent: Number // seconds spent on this question
    }],
    current_part: { 
        type: Number, 
        default: 1 
    }, // Part đang làm (1-7)
    status: { 
        type: String, 
        enum: ["in_progress", "completed", "abandoned"], 
        default: "in_progress" 
    },
    listening_score: { type: Number, default: 0 },
    reading_score: { type: Number, default: 0 },
    total_score: { type: Number, default: 0 },
    correct_answers: { type: Number, default: 0 },
    total_questions: { type: Number, default: 200 },
    time_limit: { type: Number }, // phút
    time_used: { type: Number }, // phút đã sử dụng
}, { 
    timestamps: true, 
    collection: "testAttempts" 
});

// Index để tìm kiếm nhanh
TestAttemptSchema.index({ user_id: 1, test_id: 1 });
TestAttemptSchema.index({ status: 1 });

export type ITestAttempt = InferSchemaType<typeof TestAttemptSchema>;
const TestAttemptModel: Model<ITestAttempt> = mongoose.model<ITestAttempt>("TestAttempt", TestAttemptSchema);
export default TestAttemptModel;
