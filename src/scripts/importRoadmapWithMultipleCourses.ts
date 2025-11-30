import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import RoadmapModel from "../models/roadmap.model";
import CourseModel from "../models/course.model";
import LessonModel from "../models/lesson.model";
import SectionModel from "../models/section.model";
import TeacherModel from "../models/teacher.model";
import UserModel from "../models/user.model";
import { QuestionModel } from "../models/question.model";
import { TestModel } from "../models/test.model";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DB_URI = process.env.DB_URI || "mongodb://localhost:27017/staredu_db";
const DB_NAME = process.env.DB_NAME || "staredu_db";

/**
 * Script import data theo cấu trúc mới:
 * Roadmap (Lộ trình) → Multiple Courses → Lessons → Sections
 * 
 * VÍ DỤ:
 * - Lộ trình Cơ Bản 2 Kỹ Năng → 3 khóa học
 * - Lộ trình Trung Cấp 2 Kỹ Năng → 5 khóa học
 */

async function importRoadmapWithMultipleCourses() {
  try {
    // Connect to MongoDB with specific database name
    await mongoose.connect(DB_URI, { dbName: DB_NAME });
    console.log(`✅ Connected to MongoDB - Database: ${DB_NAME}`);

    // =====================================================
    // STEP 0: XÓA HẾT DATA CŨ
    // =====================================================
    console.log("\n🗑️  Deleting all old data...");
    
    const deletedSections = await SectionModel.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSections.deletedCount} sections`);
    
    const deletedLessons = await LessonModel.deleteMany({});
    console.log(`   ✅ Deleted ${deletedLessons.deletedCount} lessons`);
    
    const deletedCourses = await CourseModel.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCourses.deletedCount} courses`);
    
    const deletedRoadmaps = await RoadmapModel.deleteMany({});
    console.log(`   ✅ Deleted ${deletedRoadmaps.deletedCount} roadmaps`);
    
    console.log("\n✅ All old data deleted successfully!");

    // =====================================================
    // STEP 1: Tạo hoặc lấy Teacher
    // =====================================================
    console.log("\n👨‍🏫 Creating/Getting Teacher...");
    
    let teacherUser = await UserModel.findOne({ phone: "0987654321" });
    
    if (!teacherUser) {
      teacherUser = await UserModel.create({
        phone: "0987654321",
        password: "$2b$10$exampleHashedPassword",
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
    // HELPER FUNCTION: Create sample questions
    // =====================================================
    const createSampleQuestions = async (partNumber: number, count: number) => {
      const questions = [];
      for (let i = 1; i <= count; i++) {
        const question = await QuestionModel.create({
          part: partNumber,
          type: "single",
          questionNumber: i,
          questionText: `Sample question ${i} for Part ${partNumber}`,
          audio: partNumber <= 4 ? "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/audio/sample.mp3" : undefined,
          image: partNumber === 1 ? "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/images/sample.jpg" : undefined,
          transcript: partNumber <= 4 ? `This is the transcript for question ${i}` : undefined,
          options: {
            A: "Option A",
            B: "Option B", 
            C: "Option C",
            D: "Option D"
          },
          answer: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
          explanation: `Explanation for question ${i}. The correct answer is based on the context provided.`
        });
        questions.push(question);
      }
      return questions;
    };

    // Helper function to create lessons with sections
    const createLessonsWithSections = async (courseId: any, lessonsData: any[]) => {
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
          
          // Create questions for exercise/quiz type
          if ((sectionData.type === 'exercise' || sectionData.type === 'quiz') && sectionData.questionCount) {
            const questionDocs = await createSampleQuestions(sectionData.partNumber || 5, sectionData.questionCount);
            questions = questionDocs.map((q: any) => ({
              id: q._id.toString(),
              questionText: q.questionText,
              questionType: 'multiple-choice',
              options: [q.options.A, q.options.B, q.options.C, q.options.D],
              correctAnswer: ['A', 'B', 'C', 'D'].indexOf(q.answer),
              explanation: q.explanation,
              order: q.questionNumber,
              audio: q.audio,
              image: q.image,
              transcript: q.transcript
            }));
          }
          
          await SectionModel.create({
            lesson_id: lesson._id,
            title: sectionData.title,
            type: sectionData.type,
            order: sectionData.order,
            video_url: sectionData.video_url || null,
            audioUrl: (sectionData.type === 'exercise' || sectionData.type === 'quiz') && sectionData.partNumber && sectionData.partNumber <= 4 
              ? "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/audio/sample.mp3" 
              : undefined,
            questions: questions,
            passingScore: 70
          });
        }
      }
    };

    // =====================================================
    // ROADMAP 1: Lộ Trình Cơ Bản 2 Kỹ Năng (3 khóa học)
    // =====================================================
    console.log("\n" + "=".repeat(70));
    console.log("🗺️  ROADMAP 1: Lộ Trình Cơ Bản 2 Kỹ Năng - Listening & Reading 450+");
    console.log("=".repeat(70));

    // Xóa roadmap cũ nếu có
    await RoadmapModel.deleteOne({ title: "Lộ Trình Cơ Bản 2 Kỹ Năng - Listening & Reading 450+" });

    const roadmap1CourseIds: mongoose.Types.ObjectId[] = [];

    // --- Course 1: TOEIC Listening Cơ Bản ---
    console.log("\n📚 Course 1: TOEIC Listening Cơ Bản Part 1-2");
    await CourseModel.deleteOne({ title: "TOEIC Listening Cơ Bản Part 1-2" });

    const course1_1 = await CourseModel.create({
      title: "TOEIC Listening Cơ Bản Part 1-2",
      description: "Khóa học tập trung vào kỹ năng nghe Part 1 (Photographs) và Part 2 (Question-Response). Mục tiêu: Nghe hiểu 80% câu hỏi cơ bản.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacherId],
      is_published: true,
      order: 1,
      price: 490000,
      original_price: 790000,
      is_free: false,
      total_enrollments: 15000,
      average_rating: 4.7,
      total_reviews: 1200
    });

    // Lessons for Course 1
    const course1_1_lessons = [
      {
        title: "Chương 1: Giới thiệu Part 1 - Photographs",
        description: "Chiến lược làm bài mô tả hình ảnh",
        order: 1,
        sections: [
          { title: "Video: Part 1 là gì?", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 10 câu luyện tập Part 1", type: "exercise", order: 2, questionCount: 10, partNumber: 1 }
        ]
      },
      {
        title: "Chương 2: Part 2 - Question-Response",
        description: "Kỹ thuật nghe và chọn câu trả lời đúng",
        order: 2,
        sections: [
          { title: "Video: Các dạng câu hỏi Part 2", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 20 câu luyện tập Part 2", type: "exercise", order: 2, questionCount: 20, partNumber: 2 }
        ]
      },
      {
        title: "Chương 3: Tổng ôn Part 1-2",
        description: "Ôn tập và làm bài thi thử",
        order: 3,
        sections: [
          { title: "Video: Tổng kết chiến lược", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Mini Test: 30 câu Part 1-2", type: "quiz", order: 2, questionCount: 30, partNumber: 1 }
        ]
      }
    ];

    await createLessonsWithSections(course1_1._id, course1_1_lessons);

    roadmap1CourseIds.push(course1_1._id);
    console.log(`✅ Created: ${course1_1.title} (${course1_1_lessons.length} lessons)`);

    // --- Course 2: TOEIC Reading Cơ Bản ---
    console.log("\n📚 Course 2: TOEIC Reading Cơ Bản Part 5-6");
    await CourseModel.deleteOne({ title: "TOEIC Reading Cơ Bản Part 5-6" });

    const course1_2 = await CourseModel.create({
      title: "TOEIC Reading Cơ Bản Part 5-6",
      description: "Khóa học tập trung vào Part 5 (Incomplete Sentences) và Part 6 (Text Completion). Học ngữ pháp và từ vựng cơ bản.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading", "grammar"],
      assigned_teachers: [teacherId],
      is_published: true,
      order: 2,
      price: 590000,
      original_price: 890000,
      is_free: false,
      total_enrollments: 18000,
      average_rating: 4.8,
      total_reviews: 1500
    });

    const course1_2_lessons = [
      {
        title: "Chương 1: Part 5 - Grammar & Vocabulary",
        description: "Các dạng câu hỏi ngữ pháp và từ vựng",
        order: 1,
        sections: [
          { title: "Video: Chiến lược Part 5", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 30 câu Part 5", type: "exercise", order: 2, questionCount: 30, partNumber: 5 }
        ]
      },
      {
        title: "Chương 2: Part 6 - Text Completion",
        description: "Hoàn thành đoạn văn bản",
        order: 2,
        sections: [
          { title: "Video: Kỹ thuật Part 6", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: 12 câu Part 6", type: "exercise", order: 2, questionCount: 12, partNumber: 6 }
        ]
      },
      {
        title: "Chương 3: Ngữ pháp TOEIC cần thiết",
        description: "Thì động từ, từ loại, giới từ",
        order: 3,
        sections: [
          { title: "Video: 12 thì tiếng Anh", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Exercise: Chia động từ", type: "exercise", order: 2, questionCount: 20, partNumber: 5 }
        ]
      },
      {
        title: "Chương 4: Tổng ôn Part 5-6",
        description: "Ôn tập và thi thử",
        order: 4,
        sections: [
          { title: "Mini Test: 40 câu Part 5-6", type: "quiz", order: 1, questionCount: 40, partNumber: 5 }
        ]
      }
    ];

    await createLessonsWithSections(course1_2._id, course1_2_lessons);

    roadmap1CourseIds.push(course1_2._id);
    console.log(`✅ Created: ${course1_2.title} (${course1_2_lessons.length} lessons)`);

    // --- Course 3: TOEIC Từ Vựng Cơ Bản ---
    console.log("\n📚 Course 3: TOEIC Từ Vựng Cơ Bản 500 từ");
    await CourseModel.deleteOne({ title: "TOEIC Từ Vựng Cơ Bản 500 từ" });

    const course1_3 = await CourseModel.create({
      title: "TOEIC Từ Vựng Cơ Bản 500 từ",
      description: "500 từ vựng TOEIC quan trọng nhất. Học theo chủ đề: Business, Office, Travel, Shopping, Technology.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["vocabulary"],
      assigned_teachers: [teacherId],
      is_published: true,
      order: 3,
      price: 390000,
      original_price: 590000,
      is_free: false,
      total_enrollments: 25000,
      average_rating: 4.9,
      total_reviews: 2000
    });

    const course1_3_lessons = [
      {
        title: "Chương 1: Business Vocabulary",
        description: "Từ vựng liên quan đến kinh doanh",
        order: 1,
        sections: [
          { title: "Video: 100 từ Business", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Flashcard: Học 100 từ", type: "exercise", order: 2, questionCount: 20, partNumber: 5 }
        ]
      },
      {
        title: "Chương 2: Office Vocabulary",
        description: "Từ vựng văn phòng",
        order: 2,
        sections: [
          { title: "Video: 100 từ Office", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Flashcard: Học 100 từ", type: "exercise", order: 2, questionCount: 20, partNumber: 5 }
        ]
      },
      {
        title: "Chương 3: Travel & Shopping",
        description: "Từ vựng du lịch và mua sắm",
        order: 3,
        sections: [
          { title: "Video: 100 từ Travel", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Flashcard: Học 100 từ", type: "exercise", order: 2, questionCount: 20, partNumber: 5 }
        ]
      },
      {
        title: "Chương 4: Technology Vocabulary",
        description: "Từ vựng công nghệ",
        order: 4,
        sections: [
          { title: "Video: 100 từ Tech", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" },
          { title: "Flashcard: Học 100 từ", type: "exercise", order: 2, questionCount: 20, partNumber: 5 }
        ]
      },
      {
        title: "Chương 5: Tổng ôn 500 từ",
        description: "Ôn tập toàn bộ từ vựng",
        order: 5,
        sections: [
          { title: "Final Test: 100 câu từ vựng", type: "quiz", order: 1, questionCount: 100, partNumber: 5 }
        ]
      }
    ];

    await createLessonsWithSections(course1_3._id, course1_3_lessons);

    roadmap1CourseIds.push(course1_3._id);
    console.log(`✅ Created: ${course1_3.title} (${course1_3_lessons.length} lessons)`);

    // Create Roadmap 1
    const roadmap1 = await RoadmapModel.create({
      title: "Lộ Trình Cơ Bản 2 Kỹ Năng - Listening & Reading 450+",
      description: "Lộ trình học TOEIC hoàn chỉnh cho người mới bắt đầu. Gồm 3 khóa học: Listening Part 1-2, Reading Part 5-6, và Từ vựng 500 từ. Mục tiêu: 450+ điểm TOEIC.",
      skill_groups: ["listening", "reading", "vocabulary"],
      target_score: 450,
      courses: roadmap1CourseIds,
      price: 1290000,
      discount_percentage: 20, // Giảm 20%
      is_published: true,
      total_enrollments: 5000
    });

    console.log(`\n✅ Created Roadmap 1: ${roadmap1.title}`);
    console.log(`   - Total Courses: ${roadmap1CourseIds.length}`);
    console.log(`   - Target Score: ${roadmap1.target_score}`);
    console.log(`   - Price: ${roadmap1.price.toLocaleString('vi-VN')}đ`);
    console.log(`   - Discount: ${roadmap1.discount_percentage}%`);
    console.log(`   - Final Price: ${(roadmap1.price * (1 - roadmap1.discount_percentage / 100)).toLocaleString('vi-VN')}đ`);

    // =====================================================
    // ROADMAP 2: Lộ Trình Trung Cấp 2 Kỹ Năng (5 khóa học)
    // =====================================================
    console.log("\n" + "=".repeat(70));
    console.log("🗺️  ROADMAP 2: Lộ Trình Trung Cấp 2 Kỹ Năng - Listening & Reading 650+");
    console.log("=".repeat(70));

    await RoadmapModel.deleteOne({ title: "Lộ Trình Trung Cấp 2 Kỹ Năng - Listening & Reading 650+" });

    const roadmap2CourseIds: mongoose.Types.ObjectId[] = [];

    // --- Course 1: TOEIC Listening Part 3-4 ---
    console.log("\n📚 Course 1: TOEIC Listening Nâng Cao Part 3-4");
    await CourseModel.deleteOne({ title: "TOEIC Listening Nâng Cao Part 3-4" });

    const course2_1 = await CourseModel.create({
      title: "TOEIC Listening Nâng Cao Part 3-4",
      description: "Khóa học tập trung vào Part 3 (Conversations) và Part 4 (Talks). Luyện nghe hội thoại dài và bài phát biểu.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening"],
      assigned_teachers: [teacherId],
      is_published: true,
      order: 1,
      price: 690000,
      original_price: 990000,
      is_free: false,
      total_enrollments: 12000,
      average_rating: 4.8,
      total_reviews: 1000
    });

    const course2_1_lessons = [
      { title: "Chương 1: Part 3 - Conversations", description: "Kỹ thuật nghe hội thoại", order: 1, sections: [{ title: "Video: Chiến lược Part 3", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" }, { title: "Exercise: 20 hội thoại", type: "exercise", order: 2, questionCount: 20, partNumber: 3 }] },
      { title: "Chương 2: Part 4 - Talks", description: "Kỹ thuật nghe bài phát biểu", order: 2, sections: [{ title: "Video: Chiến lược Part 4", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" }, { title: "Exercise: 20 talks", type: "exercise", order: 2, questionCount: 20, partNumber: 4 }] },
      { title: "Chương 3: Tổng ôn Part 3-4", description: "Ôn tập và thi thử", order: 3, sections: [{ title: "Mini Test: 40 câu Part 3-4", type: "quiz", order: 1, questionCount: 40, partNumber: 3 }] }
    ];

    await createLessonsWithSections(course2_1._id, course2_1_lessons);

    roadmap2CourseIds.push(course2_1._id);
    console.log(`✅ Created: ${course2_1.title} (${course2_1_lessons.length} lessons)`);

    // --- Course 2: TOEIC Reading Part 7 ---
    console.log("\n📚 Course 2: TOEIC Reading Part 7 - Đọc Hiểu");
    await CourseModel.deleteOne({ title: "TOEIC Reading Part 7 - Đọc Hiểu" });

    const course2_2 = await CourseModel.create({
      title: "TOEIC Reading Part 7 - Đọc Hiểu",
      description: "Khóa học chuyên sâu Part 7 (Reading Comprehension). Học cách đọc và hiểu văn bản phức tạp.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["reading"],
      assigned_teachers: [teacherId],
      is_published: true,
      order: 2,
      price: 790000,
      original_price: 1190000,
      is_free: false,
      total_enrollments: 10000,
      average_rating: 4.7,
      total_reviews: 800
    });

    const course2_2_lessons = [
      { title: "Chương 1: Single Passages", description: "Đọc hiểu đoạn văn đơn", order: 1, sections: [{ title: "Video: Kỹ thuật đọc nhanh", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" }, { title: "Exercise: 10 passages", type: "exercise", order: 2, questionCount: 30, partNumber: 7 }] },
      { title: "Chương 2: Double Passages", description: "Đọc hiểu 2 đoạn văn liên quan", order: 2, sections: [{ title: "Video: Chiến lược đọc kép", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" }, { title: "Exercise: 8 double passages", type: "exercise", order: 2, questionCount: 16, partNumber: 7 }] },
      { title: "Chương 3: Triple Passages", description: "Đọc hiểu 3 đoạn văn liên quan", order: 3, sections: [{ title: "Video: Chiến lược đọc triple", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" }, { title: "Exercise: 5 triple passages", type: "exercise", order: 2, questionCount: 15, partNumber: 7 }] },
      { title: "Chương 4: Tổng ôn Part 7", description: "Ôn tập và thi thử", order: 4, sections: [{ title: "Mini Test: 54 câu Part 7", type: "quiz", order: 1, questionCount: 54, partNumber: 7 }] }
    ];

    await createLessonsWithSections(course2_2._id, course2_2_lessons);

    roadmap2CourseIds.push(course2_2._id);
    console.log(`✅ Created: ${course2_2.title} (${course2_2_lessons.length} lessons)`);

    // --- Course 3: TOEIC Grammar Nâng Cao ---
    console.log("\n📚 Course 3: TOEIC Grammar Nâng Cao");
    await CourseModel.deleteOne({ title: "TOEIC Grammar Nâng Cao" });

    const course2_3 = await CourseModel.create({
      title: "TOEIC Grammar Nâng Cao",
      description: "Ngữ pháp nâng cao cho TOEIC 650+. Học câu điều kiện, câu bị động, mệnh đề quan hệ, đảo ngữ.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["grammar", "reading"],
      assigned_teachers: [teacherId],
      is_published: true,
      order: 3,
      price: 590000,
      original_price: 890000,
      is_free: false,
      total_enrollments: 13000,
      average_rating: 4.8,
      total_reviews: 1100
    });

    const course2_3_lessons = [
      { title: "Chương 1: Câu điều kiện nâng cao", description: "Mixed conditionals & Inversion", order: 1, sections: [{ title: "Video: Câu điều kiện", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" }, { title: "Exercise: Câu điều kiện", type: "exercise", order: 2, questionCount: 15, partNumber: 5 }] },
      { title: "Chương 2: Mệnh đề quan hệ", description: "Relative clauses & Reduced clauses", order: 2, sections: [{ title: "Video: Mệnh đề quan hệ", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" }, { title: "Exercise: Mệnh đề quan hệ", type: "exercise", order: 2, questionCount: 15, partNumber: 5 }] },
      { title: "Chương 3: Câu bị động nâng cao", description: "Passive voice with modals", order: 3, sections: [{ title: "Video: Câu bị động", type: "video", order: 1, video_url: "https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4" }, { title: "Exercise: Câu bị động", type: "exercise", order: 2, questionCount: 15, partNumber: 5 }] }
    ];

    await createLessonsWithSections(course2_3._id, course2_3_lessons);

    roadmap2CourseIds.push(course2_3._id);
    console.log(`✅ Created: ${course2_3.title} (${course2_3_lessons.length} lessons)`);

    // --- Course 4: TOEIC Từ Vựng Nâng Cao ---
    console.log("\n📚 Course 4: TOEIC Từ Vựng Nâng Cao 1000 từ");
    await CourseModel.deleteOne({ title: "TOEIC Từ Vựng Nâng Cao 1000 từ" });

    const course2_4 = await CourseModel.create({
      title: "TOEIC Từ Vựng Nâng Cao 1000 từ",
      description: "1000 từ vựng TOEIC nâng cao. Học theo chủ đề: Finance, Marketing, HR, Logistics, Innovation.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["vocabulary"],
      assigned_teachers: [teacherId],
      is_published: true,
      order: 4,
      price: 490000,
      original_price: 790000,
      is_free: false,
      total_enrollments: 15000,
      average_rating: 4.9,
      total_reviews: 1300
    });

    const course2_4_lessons = [
      { title: "Chương 1: Finance Vocabulary", description: "200 từ về tài chính", order: 1, sections: [{ title: "Flashcard: 200 từ Finance", type: "exercise", order: 1, questionCount: 40, partNumber: 5 }] },
      { title: "Chương 2: Marketing Vocabulary", description: "200 từ về marketing", order: 2, sections: [{ title: "Flashcard: 200 từ Marketing", type: "exercise", order: 1, questionCount: 40, partNumber: 5 }] },
      { title: "Chương 3: HR Vocabulary", description: "200 từ về nhân sự", order: 3, sections: [{ title: "Flashcard: 200 từ HR", type: "exercise", order: 1, questionCount: 40, partNumber: 5 }] },
      { title: "Chương 4: Logistics Vocabulary", description: "200 từ về logistics", order: 4, sections: [{ title: "Flashcard: 200 từ Logistics", type: "exercise", order: 1, questionCount: 40, partNumber: 5 }] },
      { title: "Chương 5: Innovation Vocabulary", description: "200 từ về công nghệ", order: 5, sections: [{ title: "Flashcard: 200 từ Innovation", type: "exercise", order: 1, questionCount: 40, partNumber: 5 }] }
    ];

    await createLessonsWithSections(course2_4._id, course2_4_lessons);

    roadmap2CourseIds.push(course2_4._id);
    console.log(`✅ Created: ${course2_4.title} (${course2_4_lessons.length} lessons)`);

    // --- Course 5: TOEIC Thực Chiến 4 Full Tests ---
    console.log("\n📚 Course 5: TOEIC Thực Chiến - 4 Full Tests");
    await CourseModel.deleteOne({ title: "TOEIC Thực Chiến - 4 Full Tests" });

    const course2_5 = await CourseModel.create({
      title: "TOEIC Thực Chiến - 4 Full Tests",
      description: "4 bài thi TOEIC hoàn chỉnh (200 câu/bài). Luyện tập để làm quen với format và thời gian thi thực tế.",
      thumbnail: "https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg",
      skill_groups: ["listening", "reading"],
      assigned_teachers: [teacherId],
      is_published: true,
      order: 5,
      price: 690000,
      original_price: 990000,
      is_free: false,
      total_enrollments: 8000,
      average_rating: 4.9,
      total_reviews: 700
    });

    const course2_5_lessons = [
      { title: "Full Test 1", description: "Bài thi thử đầu tiên", order: 1, sections: [{ title: "Listening (45 phút)", type: "quiz", order: 1, questionCount: 100, partNumber: 1 }, { title: "Reading (75 phút)", type: "quiz", order: 2, questionCount: 100, partNumber: 5 }] },
      { title: "Full Test 2", description: "Bài thi thử thứ hai", order: 2, sections: [{ title: "Listening (45 phút)", type: "quiz", order: 1, questionCount: 100, partNumber: 1 }, { title: "Reading (75 phút)", type: "quiz", order: 2, questionCount: 100, partNumber: 5 }] },
      { title: "Full Test 3", description: "Bài thi thử thứ ba", order: 3, sections: [{ title: "Listening (45 phút)", type: "quiz", order: 1, questionCount: 100, partNumber: 1 }, { title: "Reading (75 phút)", type: "quiz", order: 2, questionCount: 100, partNumber: 5 }] },
      { title: "Full Test 4", description: "Bài thi thử cuối cùng", order: 4, sections: [{ title: "Listening (45 phút)", type: "quiz", order: 1, questionCount: 100, partNumber: 1 }, { title: "Reading (75 phút)", type: "quiz", order: 2, questionCount: 100, partNumber: 5 }] }
    ];

    await createLessonsWithSections(course2_5._id, course2_5_lessons);

    roadmap2CourseIds.push(course2_5._id);
    console.log(`✅ Created: ${course2_5.title} (${course2_5_lessons.length} lessons)`);

    // Create Roadmap 2
    const roadmap2 = await RoadmapModel.create({
      title: "Lộ Trình Trung Cấp 2 Kỹ Năng - Listening & Reading 650+",
      description: "Lộ trình học TOEIC nâng cao cho người đã có 450+ điểm. Gồm 5 khóa học: Listening Part 3-4, Reading Part 7, Grammar nâng cao, Từ vựng 1000 từ, và 4 Full Tests. Mục tiêu: 650+ điểm TOEIC.",
      skill_groups: ["listening", "reading", "grammar", "vocabulary"],
      target_score: 650,
      courses: roadmap2CourseIds,
      price: 2490000,
      discount_percentage: 25, // Giảm 25%
      is_published: true,
      total_enrollments: 3000
    });

    console.log(`\n✅ Created Roadmap 2: ${roadmap2.title}`);
    console.log(`   - Total Courses: ${roadmap2CourseIds.length}`);
    console.log(`   - Target Score: ${roadmap2.target_score}`);
    console.log(`   - Price: ${roadmap2.price.toLocaleString('vi-VN')}đ`);
    console.log(`   - Discount: ${roadmap2.discount_percentage}%`);
    console.log(`   - Final Price: ${(roadmap2.price * (1 - roadmap2.discount_percentage / 100)).toLocaleString('vi-VN')}đ`);

    // =====================================================
    // FINAL SUMMARY
    // =====================================================
    console.log("\n" + "=".repeat(70));
    console.log("📊 TỔNG KẾT IMPORT DATA");
    console.log("=".repeat(70));
    console.log(`✅ Roadmap 1: ${roadmap1.title}`);
    console.log(`   - Courses: ${roadmap1.courses.length}`);
    console.log(`   - Price: ${(roadmap1.price * (1 - roadmap1.discount_percentage / 100)).toLocaleString('vi-VN')}đ`);
    console.log(`\n✅ Roadmap 2: ${roadmap2.title}`);
    console.log(`   - Courses: ${roadmap2.courses.length}`);
    console.log(`   - Price: ${(roadmap2.price * (1 - roadmap2.discount_percentage / 100)).toLocaleString('vi-VN')}đ`);
    console.log("=".repeat(70));
    console.log("✅ Import hoàn tất! Kiểm tra database để xem kết quả.");
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
importRoadmapWithMultipleCourses();
