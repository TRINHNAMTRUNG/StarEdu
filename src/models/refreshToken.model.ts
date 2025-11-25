import mongoose, { Schema, InferSchemaType } from "mongoose";

const RefreshTokenSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }, // Liên kết với User

    token: {
        type: String,
        required: true
    }, // Refresh Token

    isRevoked: {
        type: Boolean,
        default: false
    }, // Đã bị thu hồi chưa

    // TTL index: MongoDB sẽ tự động xóa document khi đến thời điểm expiresAt
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    },
}, {
    timestamps: true,
    collection: "refreshTokens"
});

export type IRefreshToken = InferSchemaType<typeof RefreshTokenSchema>;

const RefreshTokenModel = mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);

export default RefreshTokenModel;
