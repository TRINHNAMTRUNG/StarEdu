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
 * Script import INTERMEDIATE test data từ file ets 2020 test 1.txt
 * Load câu hỏi thật cho lộ trình Trung Cấp 550+
 */

interface TestQuestion {
  part: number;
  questions: any[];
}

async function importIntermediateTestData() {
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

    // Helper: Get questions by part
    const getQuestionsByPart = (partNumber: number, count: number) => {
      const partData = testData.find(p => p.part === partNumber);
      if (!partData) return [];
      
      const questions = [];
      let questionIndex = 0;

      for (const item of partData.questions) {
        if (questionIndex >= count) break;

        if (item.type === "single") {
          // Single question
          const optionValues = Object.values(item.options);
          const hasEmptyOptions = optionValues.some(opt => opt === "" || opt === null);
          
          questions.push({
            id: `q_${partNumber}_${item.number}`,
            questionText: item.questionText || `Question ${item.number}`,
            questionType: "multiple-choice",
            // For Part 1-2 with empty options, show the options from transcript or generate labels
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
          // Group questions
          for (const subQ of item.questions) {
            if (questionIndex >= count) break;
            
            const optionValues = Object.values(subQ.options);
            
            questions.push({
              id: `q_${partNumber}_${subQ.number}`,
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

    // Helper: Create lessons with real questions
    const createLessonsWithRealQuestions = async (courseId: any, lessonsData: any[]) => {
      for (const lessonData of lessonsData) {
        // Calculate lesson duration from sections
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
          is_published: lessonData.order === 1, // Chỉ Chương 1 được publish
          is_free: lessonData.order === 1 // Chương 1 miễn phí để preview
        });

        for (const sectionData of lessonData.sections) {
          let questions: any[] = [];
          
          // Get real questions for exercise/quiz type
          if ((sectionData.type === "exercise" || sectionData.type === "quiz") && sectionData.questionCount) {
            questions = getQuestionsByPart(sectionData.partNumber || 5, sectionData.questionCount);
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
            passingScore: 75, // Trung cấp yêu cầu cao hơn (75% vs 70%)
            duration_minutes: sectionData.duration_minutes || 0
          });
        }
      }
    };

    console.log("\n🗑️  Deleting old Intermediate roadmap data...");
    // Only delete intermediate roadmap, not all data
    const oldIntermediateRoadmap = await RoadmapModel.findOne({ target_score: 550 });
    if (oldIntermediateRoadmap) {
      const oldCourseIds = oldIntermediateRoadmap.courses;
      
      // Delete sections of courses
      for (const courseId of oldCourseIds) {
        const lessons = await LessonModel.find({ course_id: courseId });
        for (const lesson of lessons) {
          await SectionModel.deleteMany({ lesson_id: lesson._id });
        }
        await LessonModel.deleteMany({ course_id: courseId });
      }
      
      // Delete courses and roadmap
      await CourseModel.deleteMany({ _id: { $in: oldCourseIds } });
      await RoadmapModel.deleteOne({ _id: oldIntermediateRoadmap._id });
      console.log("✅ Old intermediate data deleted");
    } else {
      console.log("✅ No old intermediate data to delete");
    }

    // =====================================================
    // ROADMAP 2: Lộ Trình Trung Cấp 2 Kỹ Năng
    // =====================================================
    console.log("\n" + "=".repeat(70));
    console.log("🗺️  ROADMAP 2: Lộ Trình Trung Cấp 2 Kỹ Năng - Listening & Reading 550+");
    console.log("=".repeat(70));

    const roadmap2CourseIds: mongoose.Types.ObjectId[] = [];

    // Course 1: TOEIC Listening Trung Cấp Part 1-2
    console.log("\n📚 Course 1: TOEIC Listening Trung Cấp Part 1-2");
    const course2_1 = await CourseModel.create({
      title: "TOEIC Listening Trung Cấp Part 1-2",
      description: "Khóa học nâng cao kỹ năng nghe Part 1 (Photographs) và Part 2 (Question-Response) với câu hỏi thật từ ETS. Phù hợp cho người đã có nền tảng cơ bản.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 1,
      price: 200000,
      original_price: 290000,
      is_free: false,
      total_enrollments: 32,
      average_rating: 4.8,
      total_reviews: 9
    });

    await createLessonsWithRealQuestions(course2_1._id, [
      {
        title: "Chương 1: Part 1 - Mô tả hình ảnh nâng cao",
        description: "Luyện nghe mô tả hình ảnh phức tạp với câu hỏi thật",
        order: 1,
        sections: [
          { title: "Video: Kỹ thuật nghe Part 1 nâng cao", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 20 },
          { title: "Mindmap: Phân tích Part 1 trung cấp", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 8 },
          { title: "Exercise: 6 câu Part 1 nâng cao", type: "exercise", order: 3, questionCount: 6, partNumber: 1, duration_minutes: 15 }
        ]
      },
      {
        title: "Chương 2: Part 2 - Hội thoại phức tạp",
        description: "Luyện nghe hội thoại ngắn với câu hỏi khó",
        order: 2,
        sections: [
          { title: "Video: Chiến lược Part 2 trung cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 25 },
          { title: "Mindmap: Dạng câu hỏi khó Part 2", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 8 },
          { title: "Exercise: 20 câu Part 2 nâng cao", type: "exercise", order: 3, questionCount: 20, partNumber: 2, duration_minutes: 25 }
        ]
      },
      {
        title: "Chương 3: Tổng ôn Part 1-2 trung cấp",
        description: "Ôn tập tổng hợp với độ khó cao hơn",
        order: 3,
        sections: [
          { title: "Mindmap: Chiến lược tổng hợp Part 1-2", type: "mindmap", order: 1, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 12 },
          { title: "Mini Test: 30 câu trung cấp", type: "quiz", order: 2, questionCount: 30, partNumber: 1, duration_minutes: 35 }
        ]
      }
    ]);

    roadmap2CourseIds.push(course2_1._id);
    console.log(`✅ Created: ${course2_1.title}`);

    // Calculate total duration for course
    const course2_1_lessons = await LessonModel.find({ course_id: course2_1._id });
    const course2_1_duration = course2_1_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course2_1._id }, { $set: { total_duration_minutes: course2_1_duration } });
    console.log(`   ⏱️  Duration: ${course2_1_duration} minutes`);
    console.log(`   👥 Enrollments: ${course2_1.total_enrollments} | ⭐ Rating: ${course2_1.average_rating} (${course2_1.total_reviews} reviews)`);

    // Course 2: TOEIC Listening Trung Cấp Part 3-4
    console.log("\n📚 Course 2: TOEIC Listening Trung Cấp Part 3-4");
    const course2_2 = await CourseModel.create({
      title: "TOEIC Listening Trung Cấp Part 3-4",
      description: "Luyện nghe hội thoại dài và bài phát biểu phức tạp với câu hỏi thật từ ETS. Yêu cầu kỹ năng nghe hiểu sâu.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 2,
      price: 230000,
      original_price: 330000,
      is_free: false,
      total_enrollments: 28,
      average_rating: 4.9,
      total_reviews: 8
    });

    await createLessonsWithRealQuestions(course2_2._id, [
      {
        title: "Chương 1: Part 3 - Hội thoại nâng cao",
        description: "Luyện nghe hội thoại dài với tình huống phức tạp",
        order: 1,
        sections: [
          { title: "Video: Kỹ thuật Part 3 trung cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 30 },
          { title: "Mindmap: Phân loại tình huống Part 3", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 10 },
          { title: "Exercise: 25 câu Part 3 nâng cao", type: "exercise", order: 3, questionCount: 25, partNumber: 3, duration_minutes: 35 }
        ]
      },
      {
        title: "Chương 2: Part 4 - Bài phát biểu chuyên sâu",
        description: "Luyện nghe bài phát biểu với thông tin chi tiết",
        order: 2,
        sections: [
          { title: "Video: Chiến lược Part 4 trung cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 30 },
          { title: "Mindmap: Dạng bài Part 4 khó", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 10 },
          { title: "Exercise: 25 câu Part 4 nâng cao", type: "exercise", order: 3, questionCount: 25, partNumber: 4, duration_minutes: 35 }
        ]
      }
    ]);

    roadmap2CourseIds.push(course2_2._id);
    console.log(`✅ Created: ${course2_2.title}`);

    // Calculate total duration for course
    const course2_2_lessons = await LessonModel.find({ course_id: course2_2._id });
    const course2_2_duration = course2_2_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course2_2._id }, { $set: { total_duration_minutes: course2_2_duration } });
    console.log(`   ⏱️  Duration: ${course2_2_duration} minutes`);
    console.log(`   👥 Enrollments: ${course2_2.total_enrollments} | ⭐ Rating: ${course2_2.average_rating} (${course2_2.total_reviews} reviews)`);

    // Course 3: TOEIC Reading Trung Cấp Part 5-6
    console.log("\n📚 Course 3: TOEIC Reading Trung Cấp Part 5-6");
    const course2_3 = await CourseModel.create({
      title: "TOEIC Reading Trung Cấp Part 5-6",
      description: "Luyện đọc ngữ pháp và hoàn thành đoạn văn nâng cao với câu hỏi thật từ ETS. Đòi hỏi kiến thức ngữ pháp vững chắc.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading", "grammar"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 3,
      price: 220000,
      original_price: 320000,
      is_free: false,
      total_enrollments: 35,
      average_rating: 4.7,
      total_reviews: 11
    });

    await createLessonsWithRealQuestions(course2_3._id, [
      {
        title: "Chương 1: Part 5 - Ngữ pháp nâng cao",
        description: "Luyện ngữ pháp và từ vựng trung cấp",
        order: 1,
        sections: [
          { title: "Video: Phân tích Part 5 trung cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 25 },
          { title: "Mindmap: Cấu trúc ngữ pháp phức tạp", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 10 },
          { title: "Exercise: 40 câu Part 5 nâng cao", type: "exercise", order: 3, questionCount: 40, partNumber: 5, duration_minutes: 30 }
        ]
      },
      {
        title: "Chương 2: Part 6 - Đoạn văn phức tạp",
        description: "Hoàn thành đoạn văn với ngữ cảnh khó",
        order: 2,
        sections: [
          { title: "Video: Kỹ thuật Part 6 trung cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 25 },
          { title: "Mindmap: Dạng bài Part 6 khó", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 10 },
          { title: "Exercise: 20 câu Part 6 nâng cao", type: "exercise", order: 3, questionCount: 20, partNumber: 6, duration_minutes: 25 }
        ]
      }
    ]);

    roadmap2CourseIds.push(course2_3._id);
    console.log(`✅ Created: ${course2_3.title}`);

    // Calculate total duration for course
    const course2_3_lessons = await LessonModel.find({ course_id: course2_3._id });
    const course2_3_duration = course2_3_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course2_3._id }, { $set: { total_duration_minutes: course2_3_duration } });
    console.log(`   ⏱️  Duration: ${course2_3_duration} minutes`);
    console.log(`   👥 Enrollments: ${course2_3.total_enrollments} | ⭐ Rating: ${course2_3.average_rating} (${course2_3.total_reviews} reviews)`);

    // Course 4: TOEIC Reading Trung Cấp Part 7
    console.log("\n📚 Course 4: TOEIC Reading Trung Cấp Part 7");
    const course2_4 = await CourseModel.create({
      title: "TOEIC Reading Trung Cấp Part 7 - Đọc Hiểu Nâng Cao",
      description: "Luyện đọc hiểu văn bản phức tạp với câu hỏi thật từ ETS. Tập trung vào kỹ năng đọc hiểu sâu và phân tích.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 4,
      price: 250000,
      original_price: 360000,
      is_free: false,
      total_enrollments: 30,
      average_rating: 4.9,
      total_reviews: 10
    });

    await createLessonsWithRealQuestions(course2_4._id, [
      {
        title: "Chương 1: Đọc hiểu đa dạng thể loại",
        description: "Đọc hiểu đoạn văn đơn, kép và ba đoạn",
        order: 1,
        sections: [
          { title: "Video: Chiến lược Part 7 trung cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 35 },
          { title: "Mindmap: Phân loại văn bản Part 7", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 10 },
          { title: "Exercise: 50 câu Part 7 nâng cao", type: "exercise", order: 3, questionCount: 50, partNumber: 7, duration_minutes: 55 }
        ]
      }
    ]);

    roadmap2CourseIds.push(course2_4._id);
    console.log(`✅ Created: ${course2_4.title}`);

    // Calculate total duration for course
    const course2_4_lessons = await LessonModel.find({ course_id: course2_4._id });
    const course2_4_duration = course2_4_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course2_4._id }, { $set: { total_duration_minutes: course2_4_duration } });
    console.log(`   ⏱️  Duration: ${course2_4_duration} minutes`);
    console.log(`   👥 Enrollments: ${course2_4.total_enrollments} | ⭐ Rating: ${course2_4.average_rating} (${course2_4.total_reviews} reviews)`);

    // Calculate total roadmap duration and stats
    const totalRoadmapMinutes = course2_1_duration + course2_2_duration + course2_3_duration + course2_4_duration;
    const estimatedWeeks = Math.ceil(totalRoadmapMinutes / (60 * 10)); // Assuming 10 hours study per week
    const totalRoadmapEnrollments = course2_1.total_enrollments + course2_2.total_enrollments + course2_3.total_enrollments + course2_4.total_enrollments;
    const averageRoadmapRating = ((course2_1.average_rating + course2_2.average_rating + course2_3.average_rating + course2_4.average_rating) / 4).toFixed(1);

    // Create Roadmap 2
    const roadmap2 = await RoadmapModel.create({
      title: "Lộ Trình Trung Cấp 2 Kỹ Năng - Listening & Reading 550+",
      description: "Lộ trình học TOEIC trung cấp với câu hỏi thật từ ETS 2020. Gồm 4 khóa học nâng cao bao gồm tất cả các Part từ 1-7 với độ khó cao hơn.",
      skill_groups: ["listening", "reading"],
      target_score: 550,
      courses: roadmap2CourseIds,
      price: 900000,
      discount_percentage: 20,
      is_published: true,
      total_enrollments: totalRoadmapEnrollments,
      average_rating: parseFloat(averageRoadmapRating),
      estimated_duration_weeks: estimatedWeeks
    });

    console.log(`\n✅ Created Roadmap: ${roadmap2.title}`);
    console.log(`   - Total Courses: ${roadmap2CourseIds.length}`);
    console.log(`   - Total Duration: ${totalRoadmapMinutes} minutes (~${Math.round(totalRoadmapMinutes/60)} hours)`);
    console.log(`   - Estimated Duration: ${estimatedWeeks} weeks`);
    console.log(`   - Total Enrollments: ${roadmap2.total_enrollments} students`);
    console.log(`   - Average Rating: ${roadmap2.average_rating} ⭐`);
    console.log(`   - Original Price: ${roadmap2.price.toLocaleString('vi-VN')} VND`);
    console.log(`   - Final Price: ${Math.round(roadmap2.price * (1 - roadmap2.discount_percentage / 100)).toLocaleString('vi-VN')} VND (${roadmap2.discount_percentage}% off)`);
    console.log(`   - Uses REAL ETS 2020 Test 1 questions`);

    console.log("\n" + "=".repeat(70));
    console.log("✅ Import hoàn tất với câu hỏi thật từ ETS 2020 Test 1 - Trung Cấp 550+!");
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
importIntermediateTestData();
