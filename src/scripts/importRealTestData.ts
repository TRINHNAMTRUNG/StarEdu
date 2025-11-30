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
 * Script import REAL test data từ file ets 2020 test 1.txt
 * Load câu hỏi thật và gán vào các section exercise
 */

interface TestQuestion {
  part: number;
  questions: any[];
}

async function importRealTestData() {
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
        const lesson = await LessonModel.create({
          course_id: courseId,
          title: lessonData.title,
          description: lessonData.description,
          order: lessonData.order,
          is_published: true
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
            audioUrl: questions[0]?.audio || undefined,
            questions: questions,
            passingScore: 70
          });
        }
      }
    };

    console.log("\n🗑️  Deleting old data...");
    await SectionModel.deleteMany({});
    await LessonModel.deleteMany({});
    await CourseModel.deleteMany({});
    await RoadmapModel.deleteMany({});
    console.log("✅ Old data deleted");

    // =====================================================
    // ROADMAP 1: Lộ Trình Cơ Bản 2 Kỹ Năng
    // =====================================================
    console.log("\n" + "=".repeat(70));
    console.log("🗺️  ROADMAP 1: Lộ Trình Cơ Bản 2 Kỹ Năng - Listening & Reading 450+");
    console.log("=".repeat(70));

    const roadmap1CourseIds: mongoose.Types.ObjectId[] = [];

    // Course 1: TOEIC Listening Cơ Bản Part 1-2
    console.log("\n📚 Course 1: TOEIC Listening Cơ Bản Part 1-2");
    const course1_1 = await CourseModel.create({
      title: "TOEIC Listening Cơ Bản Part 1-2",
      description: "Khóa học tập trung vào kỹ năng nghe Part 1 (Photographs) và Part 2 (Question-Response) với câu hỏi thật từ ETS.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 1,
      price: 490000,
      original_price: 790000,
      is_free: false
    });

    await createLessonsWithRealQuestions(course1_1._id, [
      {
        title: "Chương 1: Part 1 - Photographs",
        description: "Luyện nghe mô tả hình ảnh với câu hỏi thật",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn Part 1", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 6 câu Part 1 thực tế", type: "exercise", order: 2, questionCount: 6, partNumber: 1 }
        ]
      },
      {
        title: "Chương 2: Part 2 - Question-Response",
        description: "Luyện nghe hội thoại ngắn với câu hỏi thật",
        order: 2,
        sections: [
          { title: "Video: Hướng dẫn Part 2", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 15 câu Part 2 thực tế", type: "exercise", order: 2, questionCount: 15, partNumber: 2 }
        ]
      },
      {
        title: "Chương 3: Tổng ôn Part 1-2",
        description: "Ôn tập tổng hợp",
        order: 3,
        sections: [
          { title: "Mini Test: 25 câu thực tế", type: "quiz", order: 1, questionCount: 25, partNumber: 1 }
        ]
      }
    ]);

    roadmap1CourseIds.push(course1_1._id);
    console.log(`✅ Created: ${course1_1.title}`);

    // Course 2: TOEIC Listening Part 3-4
    console.log("\n📚 Course 2: TOEIC Listening Part 3-4");
    const course1_2 = await CourseModel.create({
      title: "TOEIC Listening Nâng Cao Part 3-4",
      description: "Luyện nghe hội thoại dài và bài phát biểu với câu hỏi thật từ ETS",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 2,
      price: 690000,
      original_price: 990000,
      is_free: false
    });

    await createLessonsWithRealQuestions(course1_2._id, [
      {
        title: "Chương 1: Part 3 - Conversations",
        description: "Luyện nghe hội thoại dài",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn Part 3", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 20 câu Part 3 thực tế", type: "exercise", order: 2, questionCount: 20, partNumber: 3 }
        ]
      },
      {
        title: "Chương 2: Part 4 - Talks",
        description: "Luyện nghe bài phát biểu",
        order: 2,
        sections: [
          { title: "Video: Hướng dẫn Part 4", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 20 câu Part 4 thực tế", type: "exercise", order: 2, questionCount: 20, partNumber: 4 }
        ]
      }
    ]);

    roadmap1CourseIds.push(course1_2._id);
    console.log(`✅ Created: ${course1_2.title}`);

    // Course 3: TOEIC Reading Part 5-6
    console.log("\n📚 Course 3: TOEIC Reading Part 5-6");
    const course1_3 = await CourseModel.create({
      title: "TOEIC Reading Cơ Bản Part 5-6",
      description: "Luyện đọc ngữ pháp và hoàn thành đoạn văn với câu hỏi thật từ ETS",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading", "grammar"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 3,
      price: 590000,
      original_price: 890000,
      is_free: false
    });

    await createLessonsWithRealQuestions(course1_3._id, [
      {
        title: "Chương 1: Part 5 - Grammar & Vocabulary",
        description: "Luyện ngữ pháp và từ vựng",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn Part 5", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 30 câu Part 5 thực tế", type: "exercise", order: 2, questionCount: 30, partNumber: 5 }
        ]
      },
      {
        title: "Chương 2: Part 6 - Text Completion",
        description: "Hoàn thành đoạn văn",
        order: 2,
        sections: [
          { title: "Video: Hướng dẫn Part 6", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 16 câu Part 6 thực tế", type: "exercise", order: 2, questionCount: 16, partNumber: 6 }
        ]
      }
    ]);

    roadmap1CourseIds.push(course1_3._id);
    console.log(`✅ Created: ${course1_3.title}`);

    // Course 4: TOEIC Reading Part 7
    console.log("\n📚 Course 4: TOEIC Reading Part 7");
    const course1_4 = await CourseModel.create({
      title: "TOEIC Reading Part 7 - Đọc Hiểu",
      description: "Luyện đọc hiểu văn bản với câu hỏi thật từ ETS",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading"],
      assigned_teachers: [teacher._id],
      is_published: true,
      order: 4,
      price: 790000,
      original_price: 1190000,
      is_free: false
    });

    await createLessonsWithRealQuestions(course1_4._id, [
      {
        title: "Chương 1: Single & Multiple Passages",
        description: "Đọc hiểu đoạn văn đơn và kép",
        order: 1,
        sections: [
          { title: "Video: Hướng dẫn Part 7", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 40 câu Part 7 thực tế", type: "exercise", order: 2, questionCount: 40, partNumber: 7 }
        ]
      }
    ]);

    roadmap1CourseIds.push(course1_4._id);
    console.log(`✅ Created: ${course1_4.title}`);

    // Create Roadmap 1
    const roadmap1 = await RoadmapModel.create({
      title: "Lộ Trình Cơ Bản 2 Kỹ Năng - Listening & Reading 450+",
      description: "Lộ trình học TOEIC hoàn chỉnh với câu hỏi thật từ ETS 2020. Gồm 4 khóa học bao gồm tất cả các Part từ 1-7.",
      skill_groups: ["listening", "reading"],
      target_score: 450,
      courses: roadmap1CourseIds,
      price: 1990000,
      discount_percentage: 20,
      is_published: true,
      total_enrollments: 5000
    });

    console.log(`\n✅ Created Roadmap: ${roadmap1.title}`);
    console.log(`   - Total Courses: ${roadmap1CourseIds.length}`);
    console.log(`   - Uses REAL ETS 2020 Test 1 questions`);

    console.log("\n" + "=".repeat(70));
    console.log("✅ Import hoàn tất với câu hỏi thật từ ETS 2020 Test 1!");
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
importRealTestData();
