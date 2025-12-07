import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import RoadmapModel from "../models/roadmap.model";
import CourseModel from "../models/course.model";
import LessonModel from "../models/lesson.model";
import SectionModel from "../models/section.model";
import TeacherModel from "../models/teacher.model";
import UserModel from "../models/user.model";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DB_URI = process.env.DB_URI || "mongodb://localhost:27017/staredu_db";
const DB_NAME = process.env.DB_NAME || "staredu_db";

/**
 * Script import BASIC Speaking & Writing 100+ data
 */

interface TestQuestion {
  part: number;
  questions: any[];
}

async function importBasicSWData() {
  try {
    await mongoose.connect(DB_URI, { dbName: DB_NAME });
    console.log(`✅ Connected to MongoDB - Database: ${DB_NAME}`);

    // Load test data from file
    const testFilePath = path.resolve(__dirname, "../../ets 2020 test 1.txt");
    console.log(`📖 Reading test data from: ${testFilePath}`);
    
    const fileContent = fs.readFileSync(testFilePath, "utf-8");
    const testData: TestQuestion[] = JSON.parse(fileContent);
    
    console.log(`✅ Loaded test data with ${testData.length} parts`);

    // Get teacher
    const teacherUser = await UserModel.findOne({ phone: "0987654321" });
    if (!teacherUser) {
      throw new Error("Teacher not found! Run importRoadmapWithMultipleCourses.ts first");
    }

    const teacher = await TeacherModel.findOne({ user: teacherUser._id });
    if (!teacher) {
      throw new Error("Teacher not found!");
    }

    // Helper: Get questions by part (sử dụng Part 1-7 cho Speaking & Writing)
    const getQuestionsByPart = (partNumber: number, count: number) => {
      const partData = testData.find(p => p.part === partNumber);
      if (!partData) return [];
      
      const questions = [];
      let questionIndex = 0;

      for (const item of partData.questions) {
        if (questionIndex >= count) break;

        if (item.type === "single") {
          const optionValues = Object.values(item.options);
          const hasEmptyOptions = optionValues.some(opt => opt === "" || opt === null);
          
          questions.push({
            id: `q_sw_${partNumber}_${item.number}`,
            questionText: item.questionText || `Question ${item.number}`,
            questionType: "multiple-choice",
            options: hasEmptyOptions 
              ? ["A", "B", "C", "D"].map(letter => item.options[letter] || letter)
              : optionValues,
            correctAnswer: ["A", "B", "C", "D"].indexOf(item.answer),
            explanation: item.explanation,
            order: item.number,
            audio: item.audio || undefined,
            image: item.image || undefined,
            transcript: item.transcript || undefined
          });
          questionIndex++;
        } else if (item.type === "group") {
          for (const subQ of item.questions) {
            if (questionIndex >= count) break;
            
            const optionValues = Object.values(subQ.options);
            
            questions.push({
              id: `q_sw_${partNumber}_${subQ.number}`,
              questionText: subQ.questionText,
              questionType: "multiple-choice",
              options: optionValues,
              correctAnswer: ["A", "B", "C", "D"].indexOf(subQ.answer),
              explanation: subQ.explanation,
              order: subQ.number,
              audio: item.audio || undefined,
              image: item.images?.[0] || undefined,
              transcript: item.transcript || undefined,
              contextHTML: item.contextHTML || undefined
            });
            questionIndex++;
          }
        }
      }

      return questions;
    };

    // Helper: Create lessons with questions
    const createLessonsWithQuestions = async (courseId: any, lessonsData: any[]) => {
      for (const lessonData of lessonsData) {
        let lessonDuration = 0;
        for (const sectionData of lessonData.sections) {
          lessonDuration += sectionData.duration_minutes || 0;
        }

        const lesson = await LessonModel.create({
          course_id: courseId,
          title: lessonData.title,
          description: lessonData.description,
          order: lessonData.order,
          duration: lessonDuration,
          is_published: lessonData.order === 1,
          is_free: lessonData.order === 1
        });

        for (const sectionData of lessonData.sections) {
          let questions: any[] = [];
          
          if ((sectionData.type === "exercise" || sectionData.type === "quiz") && sectionData.questionCount) {
            questions = getQuestionsByPart(sectionData.partNumber || 1, sectionData.questionCount);
          }
          
          await SectionModel.create({
            lesson_id: lesson._id,
            title: sectionData.title,
            type: sectionData.type,
            order: sectionData.order,
            video_url: sectionData.video_url || null,
            mindmap_url: sectionData.mindmap_url || null,
            audioUrl: questions[0]?.audio || undefined,
            questions: questions,
            passingScore: 70,
            duration_minutes: sectionData.duration_minutes || 0
          });
        }
      }
    };

    console.log("\n🗑️  Deleting old Basic S&W roadmap data...");
    const oldBasicSWRoadmap = await RoadmapModel.findOne({ title: /Cơ Bản.*Speaking & Writing.*100\+/ });
    if (oldBasicSWRoadmap) {
      const oldCourseIds = oldBasicSWRoadmap.courses;
      
      for (const courseId of oldCourseIds) {
        const lessons = await LessonModel.find({ course_id: courseId });
        for (const lesson of lessons) {
          await SectionModel.deleteMany({ lesson_id: lesson._id });
        }
        await LessonModel.deleteMany({ course_id: courseId });
      }
      
      await CourseModel.deleteMany({ _id: { $in: oldCourseIds } });
      await RoadmapModel.deleteOne({ _id: oldBasicSWRoadmap._id });
      console.log("✅ Old basic S&W data deleted");
    } else {
      console.log("✅ No old basic S&W data to delete");
    }

    console.log("\n" + "=".repeat(70));
    console.log("🗺️  ROADMAP: Lộ Trình Cơ Bản 2 Kỹ Năng - Speaking & Writing 100+");
    console.log("=".repeat(70));

    const roadmapCourseIds: mongoose.Types.ObjectId[] = [];

    // Course 1: TOEIC Speaking Cơ Bản
    console.log("\n📚 Course 1: TOEIC Speaking Cơ Bản");
    const course1 = await CourseModel.create({
      title: "TOEIC Speaking Cơ Bản",
      description: "Khóa học tập trung vào kỹ năng nói cơ bản với bài tập thực hành từ ETS.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["speaking"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 1,
      price: 280000,
      original_price: 400000,
      is_free: false,
      total_enrollments: 32,
      average_rating: 4.6,
      total_reviews: 9
    });

    await createLessonsWithQuestions(course1._id, [
      {
        title: "Chương 1: Giới thiệu bản thân",
        description: "Luyện nói giới thiệu bản thân cơ bản",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn giới thiệu bản thân", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 15 },
          { title: "Mindmap: Cấu trúc câu giới thiệu", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: Thực hành 8 câu", type: "exercise", order: 3, questionCount: 8, partNumber: 1, duration_minutes: 12 }
        ]
      },
      {
        title: "Chương 2: Mô tả hình ảnh",
        description: "Luyện nói mô tả hình ảnh đơn giản",
        order: 2,
        sections: [
          { title: "Video: Kỹ thuật mô tả hình ảnh", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 18 },
          { title: "Mindmap: Từ vựng mô tả", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: Thực hành 10 bài", type: "exercise", order: 3, questionCount: 10, partNumber: 1, duration_minutes: 20 }
        ]
      },
      {
        title: "Chương 3: Tổng ôn Speaking cơ bản",
        description: "Ôn tập tổng hợp",
        order: 3,
        sections: [
          { title: "Mindmap: Ôn tập Speaking", type: "mindmap", order: 1, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 8 },
          { title: "Mini Test: 15 câu", type: "quiz", order: 2, questionCount: 15, partNumber: 1, duration_minutes: 25 }
        ]
      }
    ]);

    roadmapCourseIds.push(course1._id);
    console.log(`✅ Created: ${course1.title}`);

    const course1_lessons = await LessonModel.find({ course_id: course1._id });
    const course1_duration = course1_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course1._id }, { $set: { total_duration_minutes: course1_duration } });
    console.log(`   ⏱️  Duration: ${course1_duration} minutes`);
    console.log(`   👥 Enrollments: ${course1.total_enrollments} | ⭐ Rating: ${course1.average_rating} (${course1.total_reviews} reviews)`);

    // Course 2: TOEIC Writing Cơ Bản
    console.log("\n📚 Course 2: TOEIC Writing Cơ Bản");
    const course2 = await CourseModel.create({
      title: "TOEIC Writing Cơ Bản",
      description: "Luyện viết câu và đoạn văn cơ bản với bài tập thực hành từ ETS",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["writing"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 2,
      price: 220000,
      original_price: 320000,
      is_free: false,
      total_enrollments: 28,
      average_rating: 4.7,
      total_reviews: 8
    });

    await createLessonsWithQuestions(course2._id, [
      {
        title: "Chương 1: Viết câu cơ bản",
        description: "Luyện viết câu đơn giản",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn viết câu", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 18 },
          { title: "Mindmap: Cấu trúc câu cơ bản", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: Thực hành 12 câu", type: "exercise", order: 3, questionCount: 12, partNumber: 2, duration_minutes: 22 }
        ]
      },
      {
        title: "Chương 2: Viết đoạn văn",
        description: "Luyện viết đoạn văn ngắn",
        order: 2,
        sections: [
          { title: "Video: Kỹ thuật viết đoạn văn", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 20 },
          { title: "Mindmap: Cấu trúc đoạn văn", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: Thực hành 8 bài", type: "exercise", order: 3, questionCount: 8, partNumber: 2, duration_minutes: 25 }
        ]
      }
    ]);

    roadmapCourseIds.push(course2._id);
    console.log(`✅ Created: ${course2.title}`);

    const course2_lessons = await LessonModel.find({ course_id: course2._id });
    const course2_duration = course2_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course2._id }, { $set: { total_duration_minutes: course2_duration } });
    console.log(`   ⏱️  Duration: ${course2_duration} minutes`);
    console.log(`   👥 Enrollments: ${course2.total_enrollments} | ⭐ Rating: ${course2.average_rating} (${course2.total_reviews} reviews)`);

    // Calculate total roadmap stats
    const totalRoadmapMinutes = course1_duration + course2_duration;
    const estimatedWeeks = Math.ceil(totalRoadmapMinutes / (60 * 10));
    const totalRoadmapEnrollments = course1.total_enrollments + course2.total_enrollments;
    const averageRoadmapRating = ((course1.average_rating + course2.average_rating) / 2).toFixed(1);

    // Create Roadmap
    const roadmap = await RoadmapModel.create({
      title: "Lộ Trình Cơ Bản 2 Kỹ Năng - Speaking & Writing 100+",
      description: "Lộ trình học TOEIC Speaking & Writing cơ bản với bài tập thực hành từ ETS. Gồm 2 khóa học bao gồm Speaking và Writing.",
      skill_groups: ["speaking", "writing"],
      target_score: 100,
      courses: roadmapCourseIds,
      price: 500000,
      discount_percentage: 20,
      is_published: true,
      total_enrollments: totalRoadmapEnrollments,
      average_rating: parseFloat(averageRoadmapRating),
      estimated_duration_weeks: estimatedWeeks
    });

    console.log(`\n✅ Created Roadmap: ${roadmap.title}`);
    console.log(`   - Total Courses: ${roadmapCourseIds.length}`);
    console.log(`   - Total Duration: ${totalRoadmapMinutes} minutes (~${Math.round(totalRoadmapMinutes/60)} hours)`);
    console.log(`   - Estimated Duration: ${estimatedWeeks} weeks`);
    console.log(`   - Total Enrollments: ${roadmap.total_enrollments} students`);
    console.log(`   - Average Rating: ${roadmap.average_rating} ⭐`);
    console.log(`   - Original Price: ${roadmap.price.toLocaleString('vi-VN')} VND`);
    console.log(`   - Final Price: ${Math.round(roadmap.price * (1 - roadmap.discount_percentage / 100)).toLocaleString('vi-VN')} VND (${roadmap.discount_percentage}% off)`);

    console.log("\n" + "=".repeat(70));
    console.log("✅ Import hoàn tất - Lộ Trình Cơ Bản S&W 100+!");
    console.log("=".repeat(70));

    process.exit(0);

  } catch (error) {
    console.error("❌ Error importing data:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run import
importBasicSWData();
