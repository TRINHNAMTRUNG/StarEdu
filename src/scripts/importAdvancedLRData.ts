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
 * Script import ADVANCED Listening & Reading 800+ test data
 */

interface TestQuestion {
  part: number;
  questions: any[];
}

async function importAdvancedLRData() {
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
          const optionValues = Object.values(item.options);
          const hasEmptyOptions = optionValues.some(opt => opt === "" || opt === null);
          
          questions.push({
            id: `q_${partNumber}_${item.number}`,
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
            passingScore: 80, // Cao cấp yêu cầu 80%
            duration_minutes: sectionData.duration_minutes || 0
          });
        }
      }
    };

    console.log("\n🗑️  Deleting old Advanced L&R roadmap data...");
    const oldAdvancedRoadmap = await RoadmapModel.findOne({ target_score: 800 });
    if (oldAdvancedRoadmap) {
      const oldCourseIds = oldAdvancedRoadmap.courses;
      
      for (const courseId of oldCourseIds) {
        const lessons = await LessonModel.find({ course_id: courseId });
        for (const lesson of lessons) {
          await SectionModel.deleteMany({ lesson_id: lesson._id });
        }
        await LessonModel.deleteMany({ course_id: courseId });
      }
      
      await CourseModel.deleteMany({ _id: { $in: oldCourseIds } });
      await RoadmapModel.deleteOne({ _id: oldAdvancedRoadmap._id });
      console.log("✅ Old advanced L&R data deleted");
    } else {
      console.log("✅ No old advanced L&R data to delete");
    }

    console.log("\n" + "=".repeat(70));
    console.log("🗺️  ROADMAP: Lộ Trình Cao Cấp 2 Kỹ Năng - Listening & Reading 800+");
    console.log("=".repeat(70));

    const roadmapCourseIds: mongoose.Types.ObjectId[] = [];

    // Course 1: TOEIC Listening Cao Cấp Part 1-2
    console.log("\n📚 Course 1: TOEIC Listening Cao Cấp Part 1-2");
    const course1 = await CourseModel.create({
      title: "TOEIC Listening Cao Cấp Part 1-2",
      description: "Khóa học chuyên sâu kỹ năng nghe Part 1-2 với độ khó cao nhất từ ETS. Phù hợp cho người mục tiêu 800+.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 1,
      price: 250000,
      original_price: 370000,
      is_free: false,
      total_enrollments: 24,
      average_rating: 4.9,
      total_reviews: 7
    });

    await createLessonsWithRealQuestions(course1._id, [
      {
        title: "Chương 1: Part 1 - Phân tích chuyên sâu",
        description: "Luyện nghe mô tả hình ảnh phức tạp với câu hỏi đánh lừa cao",
        order: 1,
        sections: [
          { title: "Video: Kỹ thuật nghe Part 1 cao cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 25 },
          { title: "Mindmap: Phân tích Part 1 chuyên sâu", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 10 },
          { title: "Exercise: 6 câu Part 1 cao cấp", type: "exercise", order: 3, questionCount: 6, partNumber: 1, duration_minutes: 18 }
        ]
      },
      {
        title: "Chương 2: Part 2 - Tư duy nhanh",
        description: "Luyện nghe hội thoại ngắn tốc độ cao",
        order: 2,
        sections: [
          { title: "Video: Chiến lược Part 2 cao cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 30 },
          { title: "Mindmap: Dạng câu hỏi khó Part 2", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 10 },
          { title: "Exercise: 20 câu Part 2 cao cấp", type: "exercise", order: 3, questionCount: 20, partNumber: 2, duration_minutes: 30 }
        ]
      },
      {
        title: "Chương 3: Tổng ôn Part 1-2 cao cấp",
        description: "Ôn tập tổng hợp với độ khó tối đa",
        order: 3,
        sections: [
          { title: "Mindmap: Chiến lược tổng hợp Part 1-2", type: "mindmap", order: 1, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 15 },
          { title: "Mini Test: 30 câu cao cấp", type: "quiz", order: 2, questionCount: 30, partNumber: 1, duration_minutes: 40 }
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

    // Course 2: TOEIC Listening Cao Cấp Part 3-4
    console.log("\n📚 Course 2: TOEIC Listening Cao Cấp Part 3-4");
    const course2 = await CourseModel.create({
      title: "TOEIC Listening Cao Cấp Part 3-4",
      description: "Luyện nghe hội thoại dài và bài phát biểu phức tạp nhất với câu hỏi thật từ ETS.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 2,
      price: 280000,
      original_price: 410000,
      is_free: false,
      total_enrollments: 21,
      average_rating: 5.0,
      total_reviews: 6
    });

    await createLessonsWithRealQuestions(course2._id, [
      {
        title: "Chương 1: Part 3 - Hội thoại chuyên sâu",
        description: "Luyện nghe hội thoại dài với tình huống phức tạp nhất",
        order: 1,
        sections: [
          { title: "Video: Kỹ thuật Part 3 cao cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 35 },
          { title: "Mindmap: Phân loại tình huống Part 3 khó", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 12 },
          { title: "Exercise: 30 câu Part 3 cao cấp", type: "exercise", order: 3, questionCount: 30, partNumber: 3, duration_minutes: 40 }
        ]
      },
      {
        title: "Chương 2: Part 4 - Bài phát biểu thành thạo",
        description: "Luyện nghe bài phát biểu với thông tin chi tiết phức tạp",
        order: 2,
        sections: [
          { title: "Video: Chiến lược Part 4 cao cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 35 },
          { title: "Mindmap: Dạng bài Part 4 chuyên sâu", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 12 },
          { title: "Exercise: 30 câu Part 4 cao cấp", type: "exercise", order: 3, questionCount: 30, partNumber: 4, duration_minutes: 40 }
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

    // Course 3: TOEIC Reading Cao Cấp Part 5-6
    console.log("\n📚 Course 3: TOEIC Reading Cao Cấp Part 5-6");
    const course3 = await CourseModel.create({
      title: "TOEIC Reading Cao Cấp Part 5-6",
      description: "Luyện đọc ngữ pháp và hoàn thành đoạn văn cao cấp với câu hỏi thật từ ETS.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading", "grammar"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 3,
      price: 270000,
      original_price: 400000,
      is_free: false,
      total_enrollments: 26,
      average_rating: 4.8,
      total_reviews: 8
    });

    await createLessonsWithRealQuestions(course3._id, [
      {
        title: "Chương 1: Part 5 - Ngữ pháp thành thạo",
        description: "Luyện ngữ pháp và từ vựng cao cấp",
        order: 1,
        sections: [
          { title: "Video: Phân tích Part 5 cao cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 30 },
          { title: "Mindmap: Cấu trúc ngữ pháp chuyên sâu", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 12 },
          { title: "Exercise: 50 câu Part 5 cao cấp", type: "exercise", order: 3, questionCount: 50, partNumber: 5, duration_minutes: 35 }
        ]
      },
      {
        title: "Chương 2: Part 6 - Đoạn văn phức tạp",
        description: "Hoàn thành đoạn văn với ngữ cảnh phức tạp nhất",
        order: 2,
        sections: [
          { title: "Video: Kỹ thuật Part 6 cao cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 30 },
          { title: "Mindmap: Dạng bài Part 6 chuyên sâu", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 12 },
          { title: "Exercise: 24 câu Part 6 cao cấp", type: "exercise", order: 3, questionCount: 24, partNumber: 6, duration_minutes: 30 }
        ]
      }
    ]);

    roadmapCourseIds.push(course3._id);
    console.log(`✅ Created: ${course3.title}`);

    const course3_lessons = await LessonModel.find({ course_id: course3._id });
    const course3_duration = course3_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course3._id }, { $set: { total_duration_minutes: course3_duration } });
    console.log(`   ⏱️  Duration: ${course3_duration} minutes`);
    console.log(`   👥 Enrollments: ${course3.total_enrollments} | ⭐ Rating: ${course3.average_rating} (${course3.total_reviews} reviews)`);

    // Course 4: TOEIC Reading Cao Cấp Part 7
    console.log("\n📚 Course 4: TOEIC Reading Cao Cấp Part 7");
    const course4 = await CourseModel.create({
      title: "TOEIC Reading Cao Cấp Part 7 - Đọc Hiểu Chuyên Sâu",
      description: "Luyện đọc hiểu văn bản phức tạp nhất với câu hỏi thật từ ETS. Thành thạo đọc đa dạng thể loại.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 4,
      price: 300000,
      original_price: 440000,
      is_free: false,
      total_enrollments: 22,
      average_rating: 4.9,
      total_reviews: 7
    });

    await createLessonsWithRealQuestions(course4._id, [
      {
        title: "Chương 1: Đọc hiểu thành thạo",
        description: "Đọc hiểu đoạn văn đơn, kép và ba đoạn phức tạp",
        order: 1,
        sections: [
          { title: "Video: Chiến lược Part 7 cao cấp", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 40 },
          { title: "Mindmap: Phân loại văn bản Part 7 khó", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 12 },
          { title: "Exercise: 54 câu Part 7 cao cấp", type: "exercise", order: 3, questionCount: 54, partNumber: 7, duration_minutes: 60 }
        ]
      }
    ]);

    roadmapCourseIds.push(course4._id);
    console.log(`✅ Created: ${course4.title}`);

    const course4_lessons = await LessonModel.find({ course_id: course4._id });
    const course4_duration = course4_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course4._id }, { $set: { total_duration_minutes: course4_duration } });
    console.log(`   ⏱️  Duration: ${course4_duration} minutes`);
    console.log(`   👥 Enrollments: ${course4.total_enrollments} | ⭐ Rating: ${course4.average_rating} (${course4.total_reviews} reviews)`);

    // Calculate total roadmap stats
    const totalRoadmapMinutes = course1_duration + course2_duration + course3_duration + course4_duration;
    const estimatedWeeks = Math.ceil(totalRoadmapMinutes / (60 * 10));
    const totalRoadmapEnrollments = course1.total_enrollments + course2.total_enrollments + course3.total_enrollments + course4.total_enrollments;
    const averageRoadmapRating = ((course1.average_rating + course2.average_rating + course3.average_rating + course4.average_rating) / 4).toFixed(1);

    // Create Roadmap
    const roadmap = await RoadmapModel.create({
      title: "Lộ Trình Cao Cấp 2 Kỹ Năng - Listening & Reading 800+",
      description: "Lộ trình học TOEIC cao cấp với câu hỏi thật từ ETS 2020. Gồm 4 khóa học chuyên sâu bao gồm tất cả các Part từ 1-7 với độ khó tối đa.",
      skill_groups: ["listening", "reading"],
      target_score: 800,
      courses: roadmapCourseIds,
      price: 850000,
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
    console.log(`   - Uses REAL ETS 2020 Test 1 questions`);

    console.log("\n" + "=".repeat(70));
    console.log("✅ Import hoàn tất - Lộ Trình Cao Cấp L&R 800+!");
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
importAdvancedLRData();
