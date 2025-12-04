import mongoose from "mongoose";
import { config } from "@dotenvx/dotenvx";
config();

async function checkSections() {
    await mongoose.connect(process.env.MONGO_URI!);
    
    const SectionModel = (await import("./src/models/section.model.js")).default;
    const LessonModel = (await import("./src/models/lesson.model.js")).default;
    
    const lesson = await LessonModel.findById("692f1b3f49de697f921500d5");
    console.log("Lesson:", lesson?.title);
    
    const sections = await SectionModel.find({ lesson_id: "692f1b3f49de697f921500d5" });
    console.log("\nSections:");
    sections.forEach(s => {
        console.log(`  ${s._id} - ${s.title} (${s.type})`);
    });
    
    await mongoose.connection.close();
}

checkSections().catch(console.error);
