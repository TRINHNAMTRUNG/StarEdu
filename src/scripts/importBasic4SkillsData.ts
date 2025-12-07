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
 * Script import BASIC 4 Skills (L&R 450+ & S&W 100+) data
 */

interface TestQuestion {
  part: number;
  questions: any[];
}

async function importBasic4SkillsData() {
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
            id: `q_4s_${partNumber}_${item.number}`,
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
              id: `q_4s_${partNumber}_${subQ.number}`,
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
            passingScore: 70,
            duration_minutes: sectionData.duration_minutes || 0
          });
        }
      }
    };

    console.log("\n🗑️  Deleting old Basic 4 Skills roadmap data...");
    const oldBasic4SkillsRoadmap = await RoadmapModel.findOne({ title: /Cơ Bản 4 Kỹ Năng.*450.*100/ });
    if (oldBasic4SkillsRoadmap) {
      const oldCourseIds = oldBasic4SkillsRoadmap.courses;
      
      for (const courseId of oldCourseIds) {
        const lessons = await LessonModel.find({ course_id: courseId });
        for (const lesson of lessons) {
          await SectionModel.deleteMany({ lesson_id: lesson._id });
        }
        await LessonModel.deleteMany({ course_id: courseId });
      }
      
      await CourseModel.deleteMany({ _id: { $in: oldCourseIds } });
      await RoadmapModel.deleteOne({ _id: oldBasic4SkillsRoadmap._id });
      console.log("✅ Old basic 4 skills data deleted");
    } else {
      console.log("✅ No old basic 4 skills data to delete");
    }

    console.log("\n" + "=".repeat(70));
    console.log("🗺️  ROADMAP: Lộ Trình Cơ Bản 4 Kỹ Năng - 450+ & 100+");
    console.log("=".repeat(70));

    const roadmapCourseIds: mongoose.Types.ObjectId[] = [];

    // Course 1: TOEIC Listening Cơ Bản Part 1-2
    console.log("\n📚 Course 1: TOEIC Listening Cơ Bản Part 1-2");
    const course1 = await CourseModel.create({
      title: "TOEIC Listening Cơ Bản Part 1-2",
      description: "Khóa học tập trung vào kỹ năng nghe Part 1 (Photographs) và Part 2 (Question-Response) với câu hỏi thật từ ETS.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 1,
      price: 150000,
      original_price: 220000,
      is_free: false,
      total_enrollments: 48,
      average_rating: 4.7,
      total_reviews: 13
    });

    await createLessonsWithRealQuestions(course1._id, [
      {
        title: "Chương 1: Part 1 - Photographs",
        description: "Luyện nghe mô tả hình ảnh với câu hỏi thật",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn Part 1", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 15 },
          { title: "Mindmap: Tổng quan Part 1", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: 6 câu Part 1 thực tế", type: "exercise", order: 3, questionCount: 6, partNumber: 1, duration_minutes: 10 }
        ]
      },
      {
        title: "Chương 2: Part 2 - Question-Response",
        description: "Luyện nghe hội thoại ngắn với câu hỏi thật",
        order: 2,
        sections: [
          { title: "Video: Hướng dẫn Part 2", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 20 },
          { title: "Mindmap: Tổng quan Part 2", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: 15 câu Part 2 thực tế", type: "exercise", order: 3, questionCount: 15, partNumber: 2, duration_minutes: 20 }
        ]
      },
      {
        title: "Chương 3: Tổng ôn Part 1-2",
        description: "Ôn tập tổng hợp",
        order: 3,
        sections: [
          { title: "Mindmap: Ôn tập Part 1-2", type: "mindmap", order: 1, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 10 },
          { title: "Mini Test: 25 câu thực tế", type: "quiz", order: 2, questionCount: 25, partNumber: 1, duration_minutes: 30 }
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

    // Course 2: TOEIC Listening Part 3-4
    console.log("\n📚 Course 2: TOEIC Listening Nâng Cao Part 3-4");
    const course2 = await CourseModel.create({
      title: "TOEIC Listening Nâng Cao Part 3-4",
      description: "Luyện nghe hội thoại dài và bài phát biểu với câu hỏi thật từ ETS",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 2,
      price: 180000,
      original_price: 260000,
      is_free: false,
      total_enrollments: 42,
      average_rating: 4.8,
      total_reviews: 11
    });

    await createLessonsWithRealQuestions(course2._id, [
      {
        title: "Chương 1: Part 3 - Conversations",
        description: "Luyện nghe hội thoại dài",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn Part 3", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 25 },
          { title: "Mindmap: Tổng quan Part 3", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: 20 câu Part 3 thực tế", type: "exercise", order: 3, questionCount: 20, partNumber: 3, duration_minutes: 30 }
        ]
      },
      {
        title: "Chương 2: Part 4 - Talks",
        description: "Luyện nghe bài phát biểu",
        order: 2,
        sections: [
          { title: "Video: Hướng dẫn Part 4", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 25 },
          { title: "Mindmap: Tổng quan Part 4", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: 20 câu Part 4 thực tế", type: "exercise", order: 3, questionCount: 20, partNumber: 4, duration_minutes: 30 }
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

    // Course 3: TOEIC Reading Part 5-6
    console.log("\n📚 Course 3: TOEIC Reading Cơ Bản Part 5-6");
    const course3 = await CourseModel.create({
      title: "TOEIC Reading Cơ Bản Part 5-6",
      description: "Luyện đọc ngữ pháp và hoàn thành đoạn văn với câu hỏi thật từ ETS",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading", "grammar"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 3,
      price: 170000,
      original_price: 250000,
      is_free: false,
      total_enrollments: 55,
      average_rating: 4.6,
      total_reviews: 16
    });

    await createLessonsWithRealQuestions(course3._id, [
      {
        title: "Chương 1: Part 5 - Grammar & Vocabulary",
        description: "Luyện ngữ pháp và từ vựng",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn Part 5", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 20 },
          { title: "Mindmap: Tổng quan Part 5", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: 30 câu Part 5 thực tế", type: "exercise", order: 3, questionCount: 30, partNumber: 5, duration_minutes: 25 }
        ]
      },
      {
        title: "Chương 2: Part 6 - Text Completion",
        description: "Hoàn thành đoạn văn",
        order: 2,
        sections: [
          { title: "Video: Hướng dẫn Part 6", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 20 },
          { title: "Mindmap: Tổng quan Part 6", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: 16 câu Part 6 thực tế", type: "exercise", order: 3, questionCount: 16, partNumber: 6, duration_minutes: 20 }
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

    // Course 4: TOEIC Reading Part 7
    console.log("\n📚 Course 4: TOEIC Reading Part 7");
    const course4 = await CourseModel.create({
      title: "TOEIC Reading Part 7 - Đọc Hiểu",
      description: "Luyện đọc hiểu văn bản với câu hỏi thật từ ETS",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 4,
      price: 200000,
      original_price: 290000,
      is_free: false,
      total_enrollments: 44,
      average_rating: 4.9,
      total_reviews: 14
    });

    await createLessonsWithRealQuestions(course4._id, [
      {
        title: "Chương 1: Single & Multiple Passages",
        description: "Đọc hiểu đoạn văn đơn và kép",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn Part 7", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 30 },
          { title: "Mindmap: Tổng quan Part 7", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: 40 câu Part 7 thực tế", type: "exercise", order: 3, questionCount: 40, partNumber: 7, duration_minutes: 45 }
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

    // Course 5: TOEIC Speaking Cơ Bản
    console.log("\n📚 Course 5: TOEIC Speaking Cơ Bản");
    const course5 = await CourseModel.create({
      title: "TOEIC Speaking Cơ Bản",
      description: "Khóa học tập trung vào kỹ năng nói cơ bản với bài tập thực hành từ ETS.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["speaking"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 5,
      price: 150000,
      original_price: 220000,
      is_free: false,
      total_enrollments: 36,
      average_rating: 4.7,
      total_reviews: 10
    });

    await createLessonsWithRealQuestions(course5._id, [
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
      }
    ]);

    roadmapCourseIds.push(course5._id);
    console.log(`✅ Created: ${course5.title}`);

    const course5_lessons = await LessonModel.find({ course_id: course5._id });
    const course5_duration = course5_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course5._id }, { $set: { total_duration_minutes: course5_duration } });
    console.log(`   ⏱️  Duration: ${course5_duration} minutes`);
    console.log(`   👥 Enrollments: ${course5.total_enrollments} | ⭐ Rating: ${course5.average_rating} (${course5.total_reviews} reviews)`);

    // Course 6: TOEIC Writing Cơ Bản
    console.log("\n📚 Course 6: TOEIC Writing Cơ Bản");
    const course6 = await CourseModel.create({
      title: "TOEIC Writing Cơ Bản",
      description: "Luyện viết câu và đoạn văn cơ bản với bài tập thực hành từ ETS",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["writing"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 6,
      price: 130000,
      original_price: 190000,
      is_free: false,
      total_enrollments: 31,
      average_rating: 4.8,
      total_reviews: 9
    });

    await createLessonsWithRealQuestions(course6._id, [
      {
        title: "Chương 1: Viết câu cơ bản",
        description: "Luyện viết câu đơn giản",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn viết câu", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4", duration_minutes: 18 },
          { title: "Mindmap: Cấu trúc câu cơ bản", type: "mindmap", order: 2, mindmap_url: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXcYusuaFOjIBwV56VIILxSgHPZz3ssSjjdbhUfsEGJ-7fVHRCSYt79sjcPNNpLRd6N3vVjGVdVNNySKpKfpRyKOV60KtYs5xdi2gLKUiUDxcQhC0mB_9VfpiUVK7JH5F_6TkE__bQ?key=Mn6ZeYKJRcJWjwlHVnr2zw", duration_minutes: 5 },
          { title: "Exercise: Thực hành 12 câu", type: "exercise", order: 3, questionCount: 12, partNumber: 2, duration_minutes: 22 }
        ]
      }
    ]);

    roadmapCourseIds.push(course6._id);
    console.log(`✅ Created: ${course6.title}`);

    const course6_lessons = await LessonModel.find({ course_id: course6._id });
    const course6_duration = course6_lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    await CourseModel.updateOne({ _id: course6._id }, { $set: { total_duration_minutes: course6_duration } });
    console.log(`   ⏱️  Duration: ${course6_duration} minutes`);
    console.log(`   👥 Enrollments: ${course6.total_enrollments} | ⭐ Rating: ${course6.average_rating} (${course6.total_reviews} reviews)`);

    // Calculate total roadmap stats
    const totalRoadmapMinutes = course1_duration + course2_duration + course3_duration + course4_duration + course5_duration + course6_duration;
    const estimatedWeeks = Math.ceil(totalRoadmapMinutes / (60 * 10));
    const totalRoadmapEnrollments = course1.total_enrollments + course2.total_enrollments + course3.total_enrollments + course4.total_enrollments + course5.total_enrollments + course6.total_enrollments;
    const averageRoadmapRating = ((course1.average_rating + course2.average_rating + course3.average_rating + course4.average_rating + course5.average_rating + course6.average_rating) / 6).toFixed(1);

    // Create Roadmap
    const roadmap = await RoadmapModel.create({
      title: "Lộ Trình Cơ Bản 4 Kỹ Năng - 450+ & 100+",
      description: "Lộ trình học TOEIC hoàn chỉnh 4 kỹ năng với câu hỏi thật từ ETS 2020. Gồm 6 khóa học: Listening & Reading (450+) + Speaking & Writing (100+).",
      skill_groups: ["listening", "reading", "speaking", "writing"],
      target_score: 550, // 450 + 100
      courses: roadmapCourseIds,
      price: 980000,
      discount_percentage: 25,
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
    console.log(`   - Target: L&R 450+ & S&W 100+`);

    console.log("\n" + "=".repeat(70));
    console.log("✅ Import hoàn tất - Lộ Trình Cơ Bản 4 Kỹ Năng!");
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
importBasic4SkillsData();
