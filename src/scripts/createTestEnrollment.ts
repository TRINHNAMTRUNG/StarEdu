import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import StudentModel from "../models/student.model";
import EnrollmentModel from "../models/enrollment.model";
import RoadmapModel from "../models/roadmap.model";

async function createTestEnrollment() {
    try {
        // Connect to MongoDB
        const dbUri = process.env.DB_URI || "mongodb://localhost:27017";
        const dbName = process.env.DB_NAME || "staredu";
        await mongoose.connect(dbUri, { dbName });
        console.log("✅ Connected to MongoDB");

        // Find student by user ID
        const userId = "691d6a9ab01eb0adc55d7bf9";
        const student = await StudentModel.findOne({ user: userId });

        if (!student) {
            console.error("❌ Student not found for user:", userId);
            process.exit(1);
        }

        console.log("✅ Found student:", student._id);

        // Check if roadmap exists
        const roadmapId = "691fc322c4bbf04108f13fa3";
        const roadmap = await RoadmapModel.findById(roadmapId);

        if (!roadmap) {
            console.error("❌ Roadmap not found:", roadmapId);
            process.exit(1);
        }

        console.log("✅ Found roadmap:", roadmap.title);

        // Check if enrollment already exists
        const existingEnrollment = await EnrollmentModel.findOne({
            student: student._id,
            roadmap: roadmapId
        });

        if (existingEnrollment) {
            console.log("⚠️ Enrollment already exists!");
            console.log("Enrollment ID:", existingEnrollment._id);
            process.exit(0);
        }

        // Create dummy payment ID
        const dummyPaymentId = new mongoose.Types.ObjectId("000000000000000000000000");

        // Calculate enrolled price with discount
        const enrolledPrice = roadmap.price * (1 - roadmap.discount_percentage / 100);

        // Create enrollment
        const enrollment = await EnrollmentModel.create({
            student: student._id,
            roadmap: roadmapId,
            payment_id: dummyPaymentId,
            enrolled_date: new Date(),
            enrolled_by: "admin",
            status: "active",
            enrolled_price: enrolledPrice,
            completion_percentage: 0,
            last_accessed: new Date()
        });

        console.log("✅ Enrollment created successfully!");
        console.log("Enrollment ID:", enrollment._id);
        console.log("Student:", student._id);
        console.log("Roadmap:", roadmap.title);
        console.log("Price:", enrolledPrice.toLocaleString("vi-VN"), "₫");

        // Increment roadmap total_enrollments
        await RoadmapModel.findByIdAndUpdate(roadmapId, {
            $inc: { total_enrollments: 1 }
        });

        console.log("✅ Updated roadmap total_enrollments");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

createTestEnrollment();
