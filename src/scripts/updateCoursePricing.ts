import mongoose from "mongoose";
import connectDB from "../config/database";
import CourseModel from "../models/course.model";

async function updateCoursePricing() {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");

        // Update all courses without pricing fields
        const result = await CourseModel.updateMany(
            {
                $or: [
                    { price: { $exists: false } },
                    { original_price: { $exists: false } },
                    { is_free: { $exists: false } }
                ]
            },
            {
                $set: {
                    price: 0,
                    original_price: 0,
                    is_free: true
                }
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} courses with default pricing`);

        // Show all courses
        const courses = await CourseModel.find({}, 'title price original_price is_free').lean();
        console.log("\n📚 All courses:");
        courses.forEach(course => {
            console.log(`   - ${course.title}`);
            console.log(`     Price: ${course.price}, Original: ${course.original_price}, Free: ${course.is_free}`);
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

updateCoursePricing();
