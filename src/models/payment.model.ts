import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const PaymentSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    roadmap: { type: Schema.Types.ObjectId, ref: "Roadmap", required: true },
    amount: { type: Number, required: true },
    gateway: {
        type: String,
        enum: ["momo", "vnpay", "zalopay"], // ✅ Literal values
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "success", "failed", "cancelled"], // ✅ Literal values
        default: "pending"
    },
    order_id: { type: String, required: true, unique: true },
    transaction_id: { type: String },
    payment_date: { type: Date }
}, { timestamps: true, collection: "payments" });

export type IPayment = InferSchemaType<typeof PaymentSchema>;
const PaymentModel: Model<IPayment> = mongoose.model<IPayment>("Payment", PaymentSchema);
export default PaymentModel;
