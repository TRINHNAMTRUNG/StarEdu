import mongoose from "mongoose";
import connectDB from "../config/database";
import RoadmapModel from "../models/roadmap.model";
import CourseModel from "../models/course.model";
import LessonModel from "../models/lesson.model";
import SectionModel from "../models/section.model";
import TeacherModel from "../models/teacher.model";
import UserModel from "../models/user.model";
import fs from "fs";
import path from "path";

async function importRoadmapData() {
    try {
        // Connect to DB
        await connectDB();
        console.log("✅ Connected to MongoDB");

        // Lấy tên file từ argument hoặc import tất cả
        const fileArg = process.argv[2]; // node script.js <filename>
        const filesToImport: string[] = [];

        if (fileArg) {
            // Import file cụ thể
            filesToImport.push(fileArg);
            console.log(`📖 Importing file: ${fileArg}`);
        } else {
            // Import tất cả các file course
            filesToImport.push("course_lr_co_ban.txt");
            filesToImport.push("course_ngu_phap_co_ban.txt");
            console.log("📖 Importing all course files...");
        }

        for (const fileName of filesToImport) {
            // Read JSON file
            const jsonPath = path.join(__dirname, `../../${fileName}`);
            
            if (!fs.existsSync(jsonPath)) {
                console.log(`⚠️  File not found: ${fileName}, skipping...`);
                continue;
            }

            const rawData = fs.readFileSync(jsonPath, "utf-8");
            const data = JSON.parse(rawData);

            console.log(`\n${"=".repeat(60)}`);
            console.log(`� Processing: ${fileName}`);
            console.log(`${"=".repeat(60)}`);

        // =====================================================
        // STEP 1: Tạo hoặc lấy Teacher
        // =====================================================
        console.log("\n👨‍🏫 Creating/Getting Teacher...");
        
        // Tạo User cho Teacher nếu chưa có
        let teacherUser = await UserModel.findOne({ phone: "0987654321" });
        
        if (!teacherUser) {
            teacherUser = await UserModel.create({
                phone: "0987654321",
                password: "$2b$10$exampleHashedPassword", // Bạn nên hash password thật
                name: "Minh & Anna",
                role: "teacher",
                gender: "other",
                isActive: true
            });
            console.log("✅ Created Teacher User:", teacherUser.phone);
        }

        let teacher = await TeacherModel.findOne({ user: teacherUser._id });
        
        if (!teacher) {
            teacher = await TeacherModel.create({
                user: teacherUser._id,
                bio: "Cặp đôi TOEIC 990 – Chuyên dạy người mất gốc",
                experience_years: 5,
                employment_status: "active",
                qualifications: [{
                    degree: "Master",
                    major: "English Education",
                    institution: "University of Example",
                    issue_date: new Date("2020-01-01")
                }],
                rating: 4.8,
                total_courses: 0
            });
            console.log("✅ Created Teacher:", teacher._id);
        }

        const teacherId = teacher._id;

        // =====================================================
        // STEP 2: Tạo Courses và lưu IDs
        // =====================================================
        console.log("\n📚 Creating Courses...");
        const courseIds: mongoose.Types.ObjectId[] = [];

        for (const courseData of data.courses) {
            // Xóa course cũ nếu có (để test)
            await CourseModel.deleteOne({ title: courseData.title });

            const course = await CourseModel.create({
                title: courseData.title,
                description: courseData.description,
                thumbnail: courseData.thumbnail,
                skill_groups: ["listening", "writing"], // Từ data
                assigned_teachers: [teacherId],
                is_published: true,
                isModifiable: true,
                order: 0,
                total_enrollments: courseData.enrollmentCount || 29500,
                average_rating: courseData.averageRating || 4.8,
                total_reviews: courseData.totalReviews || 3600,
                price: courseData.price || 0,
                original_price: courseData.originalPrice || 0,
                is_free: courseData.isFree !== undefined ? courseData.isFree : true,
                last_modified_by: teacherId,
                last_modified_at: new Date()
            });

            console.log(`✅ Created Course: ${course.title} (${course._id})`);
            courseIds.push(course._id);

            // =====================================================
            // STEP 3: Tạo Lessons cho Course
            // =====================================================
            console.log(`  📖 Creating Lessons for Course: ${course.title}`);

            for (const lessonData of courseData.lessons) {
                // Xóa lesson cũ nếu có
                await LessonModel.deleteOne({ 
                    course_id: course._id, 
                    title: lessonData.title 
                });

                const lesson = await LessonModel.create({
                    course_id: course._id,
                    title: lessonData.title,
                    description: lessonData.description,
                    order: lessonData.order,
                    is_published: lessonData.isPublished,
                    created_by: teacherId,
                    duration_minutes: Math.round(lessonData.totalDuration / 60), // Convert seconds to minutes
                    total_sections: lessonData.totalSections
                });

                console.log(`    ✅ Created Lesson: ${lesson.title} (${lesson._id})`);

                // =====================================================
                // STEP 4: Tạo Sections cho Lesson
                // =====================================================
                console.log(`      🎬 Creating Sections for Lesson: ${lesson.title}`);

                for (const sectionData of lessonData.sections) {
                    // Xóa section cũ nếu có
                    await SectionModel.deleteOne({ 
                        lesson_id: lesson._id, 
                        title: sectionData.title 
                    });

                    const section = await SectionModel.create({
                        lesson_id: lesson._id,
                        title: sectionData.title,
                        order: sectionData.order,
                        description: sectionData.description,
                        video_url: sectionData.videoUrl || null,
                        mindmap_url: sectionData.mindmapUrl || null,
                        test_id: null, // Sẽ tạo test sau nếu cần
                        type: sectionData.type || 'video',
                        audioUrl: sectionData.audioUrl || null,
                        articleContent: sectionData.articleContent || null,
                        questions: sectionData.questions || [],
                        passingScore: sectionData.passingScore || 70
                    });

                    console.log(`        ✅ Created Section: ${section.title}`);
                }
            }
        }

        // =====================================================
        // STEP 5: Tạo Roadmap
        // =====================================================
        console.log("\n🗺️  Creating Roadmap...");
        
        // Xóa roadmap cũ nếu có
        await RoadmapModel.deleteOne({ title: data.title });

        const roadmap = await RoadmapModel.create({
            title: data.title,
            description: data.description,
            skill_groups: ["listening", "writing"],
            target_score: data.targetScore,
            courses: courseIds,
            price: 990000,
            discount_percentage: 33, // (1490000 - 990000) / 1490000 * 100
            is_published: true,
            total_enrollments: data.totalStudents || 0
        });

        console.log(`✅ Created Roadmap: ${roadmap.title} (${roadmap._id})`);

        // =====================================================
        // SUMMARY for this file
        // =====================================================
        console.log("\n" + "=".repeat(60));
        console.log(`📊 IMPORT SUMMARY - ${fileName}`);
        console.log("=".repeat(60));
        console.log(`✅ Roadmap: ${roadmap.title}`);
        console.log(`✅ Courses: ${courseIds.length}`);
        
        for (const courseId of courseIds) {
            const course = await CourseModel.findById(courseId);
            const lessons = await LessonModel.find({ course_id: courseId });
            let totalSections = 0;
            
            for (const lesson of lessons) {
                const sections = await SectionModel.find({ lesson_id: lesson._id });
                totalSections += sections.length;
            }
            
            console.log(`   📚 ${course?.title}`);
            console.log(`      - Lessons: ${lessons.length}`);
            console.log(`      - Sections: ${totalSections}`);
        }
        
        console.log("=".repeat(60));
        
        } // End of for loop for files

        console.log("\n✅ All imports completed successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error importing data:", error);
        process.exit(1);
    }
}

// Run import
importRoadmapData();
