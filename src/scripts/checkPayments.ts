import mongoose from "mongoose";
// @ts-ignore
import { config } from "@dotenvx/dotenvx";
config();

async function checkPayments() {
    await mongoose.connect(process.env.MONGO_URI!);
    
    const PaymentModel = (await import("../models/payment.model.js")).default;
    const StudentModel = (await import("../models/student.model.js")).default;
    
    const student = await StudentModel.findOne({ user: "691d6a9ab01eb0adc55d7bf9" });
    console.log("Student ID:", student?._id);
    
    const payments = await PaymentModel.find({ student: student?._id }).sort({ createdAt: -1 });
    console.log("\nPayments:", payments.map((p: any) => ({
        id: p._id.toString(),
        status: p.status,
        amount: p.amount,
        gateway: p.gateway,
        createdAt: p.createdAt
    })));
    
    await mongoose.connection.close();
}

checkPayments().catch(console.error);
