import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import CourseModel from '../models/course.model';
import LessonModel from '../models/lesson.model';
import SectionModel from '../models/section.model';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/staredu';

/**
 * Script để import 2 khóa học trung cấp LR (CHẶNG 2):
 * 1. TOEIC LR Trung Cấp 550-650 (Listening + Reading tổng hợp)
 * 2. TOEIC Reading Mastery (Chinh phục Part 5, 6, 7)
 * 
 * Cả 2 khóa học đều thuộc CHẶNG 2: LR Trung Cấp 550-650
 */

async function importIntermediateLRCourses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Xóa các khóa học cũ nếu có
    await CourseModel.deleteMany({ 
      title: { 
        $in: [
          'TOEIC LR Trung Cấp 550-650',
          'TOEIC Reading Mastery – Chinh phục Part 5, 6, 7'
        ] 
      } 
    });
    console.log('🗑️  Đã xóa courses cũ');

    // ============================================
    // COURSE 1: TOEIC LR Trung Cấp 550-650
    // ============================================
    const course1 = await CourseModel.create({
      title: 'TOEIC LR Trung Cấp 550-650',
      description: 'Khóa học TOEIC Listening & Reading trung cấp. Nâng cao kỹ năng nghe và đọc hiểu. Mục tiêu: 550-650 điểm. [LEVEL:INTERMEDIATE] [TARGET:550] [TARGET:650]',
      thumbnail: 'https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg',
      skill_groups: ['listening', 'reading'],
      assigned_teachers: [],
      is_published: true,
      order: 1, // Thứ tự trong chặng
      price: 1190000,
      original_price: 1690000,
      is_free: false
    });
    console.log(`✅ Created Course 1: ${course1.title}`);

    // Lessons cho Course 1
    const course1Lessons = [
      {
        title: 'Chương 1: Nâng cao Part 1 & 2',
        description: 'Kỹ thuật nghe nâng cao cho Part 1 và 2',
        order: 1,
        is_published: true,
        sections: [
          {
            title: 'Video: Advanced Listening Strategies',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 25
          },
          {
            title: 'Exercise: 30 câu Part 1 & 2 nâng cao',
            type: 'exercise',
            order: 2,
            duration_minutes: 30
          }
        ]
      },
      {
        title: 'Chương 2: Chinh phục Part 3 & 4',
        description: 'Hội thoại và bài nói dài',
        order: 2,
        is_published: true,
        sections: [
          {
            title: 'Video: Part 3 & 4 Strategies',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 35
          },
          {
            title: 'Exercise: 20 bài Part 3 & 4',
            type: 'exercise',
            order: 2,
            duration_minutes: 45
          }
        ]
      },
      {
        title: 'Chương 3: Reading nâng cao Part 5-7',
        description: 'Ngữ pháp và đọc hiểu nâng cao',
        order: 3,
        is_published: true,
        sections: [
          {
            title: 'Video: Advanced Reading Techniques',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 40
          }
        ]
      }
    ];

    for (const lessonData of course1Lessons) {
      const lesson = await LessonModel.create({
        course_id: course1._id,
        title: lessonData.title,
        description: lessonData.description,
        order: lessonData.order,
        is_published: lessonData.is_published
      });

      for (const sectionData of lessonData.sections) {
        await SectionModel.create({
          lesson_id: lesson._id,
          title: sectionData.title,
          type: sectionData.type,
          order: sectionData.order,
          video_url: sectionData.video_url || null,
          duration_minutes: sectionData.duration_minutes
        });
      }
    }
    console.log(`✅ Created ${course1Lessons.length} lessons for Course 1`);

    // ============================================
    // COURSE 2: TOEIC Reading Mastery
    // ============================================
    const course2 = await CourseModel.create({
      title: 'TOEIC Reading Mastery – Chinh phục Part 5, 6, 7',
      description: 'Khóa học chuyên sâu về Reading TOEIC: Ngữ pháp, từ vựng, đọc hiểu. Từ 450 lên 600+ chỉ trong 3 tháng. [LEVEL:INTERMEDIATE] [TARGET:550] [TARGET:600]',
      thumbnail: 'https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg',
      skill_groups: ['reading', 'grammar'],
      assigned_teachers: [],
      is_published: true,
      order: 2, // Thứ tự thứ 2 trong chặng
      price: 990000,
      original_price: 1590000,
      is_free: false
    });
    console.log(`✅ Created Course 2: ${course2.title}`);

    // Lessons cho Course 2
    const course2Lessons = [
      {
        title: 'Chương 1: Giới thiệu & Đánh giá Reading',
        description: 'Tổng quan Part 5, 6, 7 và kiểm tra trình độ',
        order: 1,
        is_published: true,
        sections: [
          {
            title: 'Video: Reading TOEIC – Chiến lược tổng quát',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 30
          },
          {
            title: 'Mindmap: Cấu trúc Reading TOEIC',
            type: 'mindmap',
            order: 2,
            duration_minutes: 10
          },
          {
            title: 'Quiz: Đánh giá Reading đầu vào',
            type: 'quiz',
            order: 3,
            duration_minutes: 25
          }
        ]
      },
      {
        title: 'Chương 2: Part 5 – Incomplete Sentences',
        description: '30 câu ngữ pháp & từ vựng cơ bản',
        order: 2,
        is_published: true,
        sections: [
          {
            title: 'Video: 4 dạng câu hỏi Part 5',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 45
          },
          {
            title: 'Exercise: Từ loại – 50 câu',
            type: 'exercise',
            order: 2,
            duration_minutes: 40
          },
          {
            title: 'Exercise: Thì động từ – 40 câu',
            type: 'exercise',
            order: 3,
            duration_minutes: 35
          },
          {
            title: 'Quiz: Part 5 – 60 câu tổng hợp',
            type: 'quiz',
            order: 4,
            duration_minutes: 40
          }
        ]
      },
      {
        title: 'Chương 3: Part 6 – Text Completion',
        description: '16 câu điền từ vào đoạn văn',
        order: 3,
        is_published: true,
        sections: [
          {
            title: 'Video: Chiến lược Part 6 – Đọc văn cảnh',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 40
          },
          {
            title: 'Exercise: 10 bài Part 6 - Email',
            type: 'exercise',
            order: 2,
            duration_minutes: 50
          },
          {
            title: 'Quiz: Part 6 – 32 câu (8 bài)',
            type: 'quiz',
            order: 3,
            duration_minutes: 30
          }
        ]
      },
      {
        title: 'Chương 4: Part 7 – Single Passages',
        description: '29 câu đọc hiểu đơn',
        order: 4,
        is_published: true,
        sections: [
          {
            title: 'Video: Chiến lược Part 7 – Skimming & Scanning',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 50
          },
          {
            title: 'Exercise: 10 bài Email',
            type: 'exercise',
            order: 2,
            duration_minutes: 60
          },
          {
            title: 'Quiz: Part 7 Single – 30 bài',
            type: 'quiz',
            order: 3,
            duration_minutes: 60
          }
        ]
      },
      {
        title: 'Chương 5: Part 7 Double & Triple + Full Test',
        description: '25 câu đọc kép/ba + Thi thử hoàn chỉnh',
        order: 5,
        is_published: true,
        sections: [
          {
            title: 'Video: Chiến lược Part 7 Double & Triple',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 45
          },
          {
            title: 'Exercise: 10 bài Double Passages',
            type: 'exercise',
            order: 2,
            duration_minutes: 80
          },
          {
            title: 'Full Test: Reading 100 câu',
            type: 'quiz',
            order: 3,
            duration_minutes: 90
          }
        ]
      }
    ];

    for (const lessonData of course2Lessons) {
      const lesson = await LessonModel.create({
        course_id: course2._id,
        title: lessonData.title,
        description: lessonData.description,
        order: lessonData.order,
        is_published: lessonData.is_published
      });

      for (const sectionData of lessonData.sections) {
        await SectionModel.create({
          lesson_id: lesson._id,
          title: sectionData.title,
          type: sectionData.type,
          order: sectionData.order,
          video_url: sectionData.video_url || null,
          duration_minutes: sectionData.duration_minutes
        });
      }
    }
    console.log(`✅ Created ${course2Lessons.length} lessons for Course 2`);

    console.log('\n=================================');
    console.log('✅ Import thành công!');
    console.log('=================================');
    console.log(`Course 1: ${course1.title}`);
    console.log(`  - ID: ${course1._id}`);
    console.log(`  - Order: ${course1.order}`);
    console.log(`  - Price: ${course1.price.toLocaleString('vi-VN')}đ`);
    console.log(`  - Skill Groups: ${course1.skill_groups.join(', ')}`);
    console.log('');
    console.log(`Course 2: ${course2.title}`);
    console.log(`  - ID: ${course2._id}`);
    console.log(`  - Order: ${course2.order}`);
    console.log(`  - Price: ${course2.price.toLocaleString('vi-VN')}đ`);
    console.log(`  - Skill Groups: ${course2.skill_groups.join(', ')}`);
    console.log('');
    console.log('📝 Lưu ý: Cả 2 khóa học đều thuộc CHẶNG 2 (LR Trung Cấp 550-650)');
    console.log('   Chúng sẽ hiển thị cùng nhau trong trang chi tiết lộ trình');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

importIntermediateLRCourses();
