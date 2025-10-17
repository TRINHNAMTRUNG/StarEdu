import mongoose, { Schema, Document, Model, InferSchemaType } from "mongoose";
import bcrypt from "bcrypt";

export enum UserRole {
    STUDENT = "student",
    TEACHER = "teacher",
    ADMIN = "admin"
}

export enum Gender {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other"
}

// const OtpSchema = new Schema({
//     code: { type: String, required: true },
//     expiredAt: { type: Date, required: true },
//     isUsed: { type: Boolean, required: true },
// }, { _id: false });

const UserSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    password: {
        type: String,
        trim: true,
        required: true
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        required: true
    },
    avatar: {
        type: String,
        trim: true,
        default: `https://media.tinmoi.vn/2016/11/17/ca-si-noi-tieng-nhat-moi-thoi-dai-1.jpg`
    },
    phone: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    gender: {
        type: String,
        enum: Object.values(Gender),
        required: true
    },
    date_of_birth: {
        type: Date
    },
    address: {
        type: String,
        trim: true
    },
    country: {
        type: String, trim: true
    },
    last_login: {
        type: Date
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    pinId: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
    // otp: {
    //     type: OtpSchema
    // },
}, { timestamps: true, collection: "users" });

interface IUserMethods {
    comparePassword(candidatePassword: string): Promise<boolean>;
}

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export type IUser = InferSchemaType<typeof UserSchema>;
const UserModel = mongoose.model<IUser, Model<IUser, {}, IUserMethods>>("User", UserSchema);
export default UserModel;
