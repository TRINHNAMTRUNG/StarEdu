import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

export enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded"
}

export enum PaymentMethod {
    MOMO = "momo",
    VNPAY = "vnpay",
    ZALOPAY = "zalopay"
}

const PaymentItemSchema = new Schema({
    roadmap: { type: Schema.Types.ObjectId, ref: "Roadmap", required: true },
    price: { type: Number, required: true },  // Giá tại thời điểm mua
    discount_percentage: { type: Number, default: 0 },
    final_price: { type: Number, required: true }  // Giá sau giảm
}, { _id: false });

const PaymentSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    items: [PaymentItemSchema],  // Danh sách roadmaps mua
    total_amount: { type: Number, required: true },  // Tổng tiền
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },
    transaction_id: { type: String },
    payment_method: { type: String, enum: Object.values(PaymentMethod) },
    payment_gateway_response: { type: Schema.Types.Mixed },
    payment_date: { type: Date },
}, { timestamps: true, collection: "payments" });

export type IPayment = InferSchemaType<typeof PaymentSchema>;
const PaymentModel: Model<IPayment> = mongoose.model<IPayment>("Payment", PaymentSchema);
export default PaymentModel;
