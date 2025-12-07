import mongoose from "mongoose";
import RoadmapModel from "../models/roadmap.model";

async function checkRoadmaps() {
  try {
    // Connect to MongoDB
    const DB_URI = process.env.DB_URI || "mongodb+srv://mongobasic:mongobasic123@cluster0.pgveher.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(DB_URI, { dbName: "staredu_db" });
    console.log("✅ Connected to MongoDB");

    // Get all roadmaps
    const roadmaps = await RoadmapModel.find({});
    
    console.log(`\n📊 Total roadmaps in DB: ${roadmaps.length}\n`);

    roadmaps.forEach((roadmap, index) => {
      console.log(`${index + 1}. ${roadmap.title}`);
      console.log(`   - Target Score: ${roadmap.target_score}`);
      console.log(`   - Skill Groups: ${roadmap.skill_groups.join(', ')}`);
      console.log(`   - Is Published: ${roadmap.is_published}`);
      console.log(`   - Price: ${roadmap.price.toLocaleString('vi-VN')} VND`);
      console.log(`   - Courses: ${roadmap.courses.length}`);
      console.log('');
    });

    // Check published roadmaps
    const publishedRoadmaps = await RoadmapModel.find({ is_published: true });
    console.log(`\n✅ Published roadmaps: ${publishedRoadmaps.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkRoadmaps();
