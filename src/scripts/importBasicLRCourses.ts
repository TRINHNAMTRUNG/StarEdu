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
 * Script để import 2 khóa học cơ bản LR:
 * 1. TOEIC LR Cơ Bản 450+ (Listening + Reading tổng hợp)
 * 2. TOEIC Grammar Basics (Ngữ pháp từ căn bản đến vững chắc)
 * 
 * Cả 2 khóa học đều thuộc CHẶNG 1: LR Căn Bản 450+
 */

async function importBasicLRCourses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Xóa các khóa học cũ nếu có
    await CourseModel.deleteMany({ 
      title: { 
        $in: [
          'TOEIC LR Cơ Bản 450+',
          'TOEIC Grammar Basics – Ngữ pháp từ căn bản đến vững chắc'
        ] 
      } 
    });
    console.log('🗑️  Đã xóa courses cũ');

    // ============================================
    // COURSE 1: TOEIC LR Cơ Bản 450+
    // ============================================
    const course1 = await CourseModel.create({
      title: 'TOEIC LR Cơ Bản 450+',
      description: 'Khóa học TOEIC Listening & Reading toàn diện cho người mới bắt đầu. Học 7 Part với phương pháp đơn giản, dễ hiểu. Mục tiêu: 450+ điểm. [LEVEL:BEGINNER] [TARGET:450]',
      thumbnail: 'https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg',
      skill_groups: ['listening', 'reading'], // Chỉ dùng enum hợp lệ
      assigned_teachers: [],
      is_published: true,
      order: 1, // Thứ tự trong chặng
      price: 990000,
      original_price: 1490000,
      is_free: false
    });
    console.log(`✅ Created Course 1: ${course1.title}`);

    // Lessons cho Course 1
    const course1Lessons = [
      {
        title: 'Chương 1: Giới thiệu TOEIC & Chiến lược thi',
        description: 'Tổng quan về bài thi TOEIC và cách học hiệu quả',
        order: 1,
        is_published: true,
        sections: [
          {
            title: 'Video: TOEIC là gì? Cấu trúc bài thi',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 15,
            mindmap_url: undefined
          },
          {
            title: 'Mindmap: Sơ đồ 7 Part TOEIC',
            type: 'mindmap',
            order: 2,
            duration_minutes: 10,
            video_url: undefined,
            mindmap_url: 'https://nativex.edu.vn/wp-content/uploads/2021/07/mindmap-hoc-tieng-anh.jpeg'
          }
        ]
      },
      {
        title: 'Chương 2: Part 1 - Photographs',
        description: 'Kỹ thuật làm bài mô tả hình ảnh',
        order: 2,
        is_published: false,
        sections: [
          {
            title: 'Video: Chiến lược Part 1',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 20,
            mindmap_url: undefined
          },
          {
            title: 'Exercise: 10 câu luyện tập Part 1',
            type: 'exercise',
            order: 2,
            duration_minutes: 15,
            video_url: undefined,
            mindmap_url: undefined
          }
        ]
      },
      {
        title: 'Chương 3: Part 5 - Grammar & Vocabulary',
        description: 'Ngữ pháp và từ vựng cơ bản',
        order: 3,
        is_published: false,
        sections: [
          {
            title: 'Video: Các dạng câu hỏi Part 5',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 25,
            mindmap_url: undefined
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
          mindmap_url: sectionData.mindmap_url || null,
          duration_minutes: sectionData.duration_minutes
        });
      }
    }
    console.log(`✅ Created ${course1Lessons.length} lessons for Course 1`);

    // ============================================
    // COURSE 2: TOEIC Grammar Basics
    // ============================================
    const course2 = await CourseModel.create({
      title: 'TOEIC Grammar Basics – Ngữ pháp từ căn bản đến vững chắc',
      description: 'Khóa học ngữ pháp TOEIC toàn diện: Thì động từ, câu bị động, từ loại, giới từ, liên từ. Dành riêng cho Part 5 & 6. [LEVEL:BEGINNER] [TARGET:450]',
      thumbnail: 'https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg',
      skill_groups: ['grammar', 'reading'], // Cùng chặng với Course 1
      assigned_teachers: [],
      is_published: true,
      order: 2, // Thứ tự thứ 2 trong chặng
      price: 890000,
      original_price: 1390000,
      is_free: false
    });
    console.log(`✅ Created Course 2: ${course2.title}`);

    // Lessons cho Course 2
    const course2Lessons = [
      {
        title: 'Chương 1: Giới thiệu ngữ pháp TOEIC',
        description: 'Tổng quan ngữ pháp cần thiết cho TOEIC',
        order: 1,
        is_published: true,
        sections: [
          {
            title: 'Video: Ngữ pháp TOEIC quan trọng như thế nào?',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 15,
            mindmap_url: undefined
          },
          {
            title: 'Mindmap: Sơ đồ ngữ pháp TOEIC',
            type: 'mindmap',
            order: 2,
            duration_minutes: 10,
            video_url: undefined,
            mindmap_url: 'https://nativex.edu.vn/wp-content/uploads/2021/07/mindmap-hoc-tieng-anh.jpeg'
          }
        ]
      },
      {
        title: 'Chương 2: Thì động từ (Verb Tenses)',
        description: '12 thì tiếng Anh thường gặp trong TOEIC',
        order: 2,
        is_published: false,
        sections: [
          {
            title: 'Video: Tổng quan 12 thì tiếng Anh',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 30,
            mindmap_url: undefined
          },
          {
            title: 'Exercise: Chia động từ đúng thì',
            type: 'exercise',
            order: 2,
            duration_minutes: 40,
            video_url: undefined,
            mindmap_url: undefined
          }
        ]
      },
      {
        title: 'Chương 3: Từ loại (Parts of Speech)',
        description: 'Danh từ, động từ, tính từ, trạng từ...',
        order: 3,
        is_published: false,
        sections: [
          {
            title: 'Video: 8 từ loại chính trong tiếng Anh',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 30,
            mindmap_url: undefined
          },
          {
            title: 'Exercise: Chọn từ loại đúng',
            type: 'exercise',
            order: 2,
            duration_minutes: 40,
            video_url: undefined,
            mindmap_url: undefined
          }
        ]
      },
      {
        title: 'Chương 4: Giới từ & Liên từ',
        description: 'In, on, at, because, although...',
        order: 4,
        is_published: false,
        sections: [
          {
            title: 'Video: Giới từ thường gặp',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 35,
            mindmap_url: undefined
          },
          {
            title: 'Exercise: Điền giới từ đúng',
            type: 'exercise',
            order: 2,
            duration_minutes: 45,
            video_url: undefined,
            mindmap_url: undefined
          }
        ]
      },
      {
        title: 'Chương 5: Tổng ôn & Final Test',
        description: 'Ôn tập toàn bộ ngữ pháp + Thi thử',
        order: 5,
        is_published: false,
        sections: [
          {
            title: 'Video: Tổng ôn ngữ pháp TOEIC',
            type: 'video',
            order: 1,
            video_url: 'https://staredu-app-bucket.s3.ap-southeast-1.amazonaws.com/videos/Talk+About+the+Weather++Daily+English+Conversation++English+Speaking+%26+Listening+Practice.mp4',
            duration_minutes: 40,
            mindmap_url: undefined
          },
          {
            title: 'Final Test: 50 câu tổng hợp',
            type: 'quiz',
            order: 2,
            duration_minutes: 60,
            video_url: undefined,
            mindmap_url: undefined
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
          mindmap_url: sectionData.mindmap_url || null,
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
    console.log(`  - Price: ${((course1 as any).price || 0).toLocaleString('vi-VN')}đ`);
    console.log(`  - Skill Groups: ${course1.skill_groups.join(', ')}`);
    console.log('');
    console.log(`Course 2: ${course2.title}`);
    console.log(`  - ID: ${course2._id}`);
    console.log(`  - Order: ${course2.order}`);
    console.log(`  - Price: ${((course2 as any).price || 0).toLocaleString('vi-VN')}đ`);
    console.log(`  - Skill Groups: ${course2.skill_groups.join(', ')}`);
    console.log('');
    console.log('📝 Lưu ý: Cả 2 khóa học đều thuộc CHẶNG 1 (LR Cơ Bản 450+)');
    console.log('   Chúng sẽ hiển thị cùng nhau trong trang chi tiết lộ trình');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

importBasicLRCourses();
