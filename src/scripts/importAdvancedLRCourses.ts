import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import CourseModel from '../models/course.model';
import LessonModel from '../models/lesson.model';
import SectionModel from '../models/section.model';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/staredu';

async function importAdvancedCourses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Xóa các courses cũ của chặng 4 (nếu có)
    await CourseModel.deleteMany({
      title: {
        $in: [
          'TOEIC Listening Master – Chinh phục 450+ Listening',
          'TOEIC Reading Master – Chinh phục 450+ Reading'
        ]
      }
    });
    console.log('🗑️  Đã xóa courses cũ');

    // Course 1: TOEIC Listening Master
    const course1 = await CourseModel.create({
      title: 'TOEIC Listening Master – Chinh phục 450+ Listening',
      description: 'Khóa học chuyên sâu về Listening TOEIC: Từ Part 1 đến Part 4. Từ 700 lên 800+ chỉ trong 4 tháng. [LEVEL:ADVANCED] [TARGET:800]',
      short_description: 'Listening Master – 80 giờ, chinh phục 450+ Listening',
      thumbnail: 'https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg',
      level: 'advanced',
      teacher_id: new mongoose.Types.ObjectId(),
      teacher_name: 'Minh & Anna',
      teacher_avatar: 'https://img.pikbest.com/png-images/qiantu/original-cute-cartoon-teacher-classroom-hand-drawn-free-buckle-element_2732027.png!sw800',
      teacher_bio: 'Cặp đôi TOEIC 990 – Chuyên dạy người mất gốc',
      total_lessons: 5,
      total_sections: 28,
      total_duration: 4800,
      total_video_duration: 2800,
      price: 1490000,
      original_price: 2290000,
      currency: 'VND',
      is_free: false,
      enrollment_count: 8900,
      completion_rate: 89,
      average_rating: 4.9,
      total_reviews: 1500,
      learning_outcomes: [
        'Đạt 95%+ Part 1 & 2',
        'Nghe hiểu Part 3 nhanh và chính xác',
        'Xử lý Part 4 phức tạp',
        'Đạt 450+ TOEIC Listening'
      ],
      prerequisites: [
        'Đã có 650-700 TOEIC',
        'Hoàn thành khóa trung cấp',
        'Có từ vựng 2500+ từ'
      ],
      has_certificate: true,
      certificate_template: 'toeic_listening_master_cert',
      is_published: true,
      published_at: new Date('2025-01-25'),
      skill_groups: ['listening'],
      order: 1
    });
    console.log('✅ Created Course 1: TOEIC Listening Master');

    // Lessons cho Course 1
    const lessons1 = [
      {
        course_id: course1._id,
        title: 'Chương 1: Giới thiệu & Đánh giá Listening',
        description: 'Tổng quan Part 1-4 và kiểm tra trình độ',
        order: 1,
        total_sections: 4,
        total_duration: 240,
        is_free: true,
        is_published: true
      },
      {
        course_id: course1._id,
        title: 'Chương 2: Part 1 & 2 Advanced',
        description: 'Hoàn thiện Part 1 & 2 đạt gần 100%',
        order: 2,
        total_sections: 6,
        total_duration: 900,
        is_free: false,
        is_published: true
      },
      {
        course_id: course1._id,
        title: 'Chương 3: Part 3 – Hội thoại chuyên sâu',
        description: '39 câu Part 3 đạt 90%+',
        order: 3,
        total_sections: 6,
        total_duration: 960,
        is_free: false,
        is_published: true
      },
      {
        course_id: course1._id,
        title: 'Chương 4: Part 4 – Diễn thuyết & Thông báo',
        description: '30 câu Part 4 đạt 85%+',
        order: 4,
        total_sections: 6,
        total_duration: 900,
        is_free: false,
        is_published: true
      },
      {
        course_id: course1._id,
        title: 'Chương 5: Full Listening Tests',
        description: 'Thi thử hoàn chỉnh 100 câu Listening',
        order: 5,
        total_sections: 6,
        total_duration: 800,
        is_free: false,
        is_published: true
      }
    ];

    for (const lessonData of lessons1) {
      await LessonModel.create(lessonData);
    }
    console.log(`✅ Created ${lessons1.length} lessons for Course 1`);

    // Course 2: TOEIC Reading Master
    const course2 = await CourseModel.create({
      title: 'TOEIC Reading Master – Chinh phục 450+ Reading',
      description: 'Khóa học chuyên sâu về Reading TOEIC: Từ Part 5 đến Part 7. Từ 700 lên 800+ chỉ trong 4 tháng. [LEVEL:ADVANCED] [TARGET:800]',
      short_description: 'Reading Master – 80 giờ, chinh phục 450+ Reading',
      thumbnail: 'https://storage.googleapis.com/prep-storage-service/course/cover/qDgMeVyQqcHeqa5oz4lHTgpW5a8fSxKmB3mwzHHK.jpg',
      level: 'advanced',
      teacher_id: new mongoose.Types.ObjectId(),
      teacher_name: 'Minh & Anna',
      teacher_avatar: 'https://img.pikbest.com/png-images/qiantu/original-cute-cartoon-teacher-classroom-hand-drawn-free-buckle-element_2732027.png!sw800',
      teacher_bio: 'Cặp đôi TOEIC 990 – Chuyên dạy người mất gốc',
      total_lessons: 5,
      total_sections: 29,
      total_duration: 4800,
      total_video_duration: 2800,
      price: 1490000,
      original_price: 2290000,
      currency: 'VND',
      is_free: false,
      enrollment_count: 9200,
      completion_rate: 91,
      average_rating: 4.9,
      total_reviews: 1650,
      learning_outcomes: [
        'Đạt 98%+ Part 5',
        'Đọc hiểu Part 6 nhanh chóng',
        'Xử lý Part 7 trong 45 phút',
        'Đạt 450+ TOEIC Reading'
      ],
      prerequisites: [
        'Đã có 650-700 TOEIC',
        'Hoàn thành khóa trung cấp',
        'Có từ vựng 2500+ từ'
      ],
      has_certificate: true,
      certificate_template: 'toeic_reading_master_cert',
      is_published: true,
      published_at: new Date('2025-01-25'),
      skill_groups: ['reading'],
      order: 2
    });
    console.log('✅ Created Course 2: TOEIC Reading Master');

    // Lessons cho Course 2
    const lessons2 = [
      {
        course_id: course2._id,
        title: 'Chương 1: Giới thiệu & Đánh giá Reading',
        description: 'Tổng quan Part 5-7 và kiểm tra trình độ',
        order: 1,
        total_sections: 4,
        total_duration: 240,
        is_free: true,
        is_published: true
      },
      {
        course_id: course2._id,
        title: 'Chương 2: Part 5 Advanced – 98% Accuracy',
        description: 'Hoàn thiện Part 5 đạt gần 100%',
        order: 2,
        total_sections: 7,
        total_duration: 1020,
        is_free: false,
        is_published: true
      },
      {
        course_id: course2._id,
        title: 'Chương 3: Part 6 Advanced – Context Master',
        description: '16 câu Part 6 đạt 95%+',
        order: 3,
        total_sections: 6,
        total_duration: 840,
        is_free: false,
        is_published: true
      },
      {
        course_id: course2._id,
        title: 'Chương 4: Part 7 Master – Speed Reading',
        description: '54 câu Part 7 trong 50 phút',
        order: 4,
        total_sections: 6,
        total_duration: 960,
        is_free: false,
        is_published: true
      },
      {
        course_id: course2._id,
        title: 'Chương 5: Full Reading Tests',
        description: 'Thi thử hoàn chỉnh 100 câu Reading',
        order: 5,
        total_sections: 6,
        total_duration: 740,
        is_free: false,
        is_published: true
      }
    ];

    for (const lessonData of lessons2) {
      await LessonModel.create(lessonData);
    }
    console.log(`✅ Created ${lessons2.length} lessons for Course 2`);

    // In thông tin tổng kết
    console.log('\n📊 Tổng kết:');
    console.log('Course 1: TOEIC Listening Master – Chinh phục 450+ Listening');
    console.log(`  - ID: ${course1._id}`);
    console.log(`  - Order: ${course1.order}`);
    console.log(`  - Skill Groups: ${course1.skill_groups.join(', ')}`);
    console.log(`  - Tags: [LEVEL:ADVANCED] [TARGET:800]`);
    
    console.log('\nCourse 2: TOEIC Reading Master – Chinh phục 450+ Reading');
    console.log(`  - ID: ${course2._id}`);
    console.log(`  - Order: ${course2.order}`);
    console.log(`  - Skill Groups: ${course2.skill_groups.join(', ')}`);
    console.log(`  - Tags: [LEVEL:ADVANCED] [TARGET:800]`);

    await mongoose.connection.close();
    console.log('\n✅ Import hoàn tất và đóng kết nối MongoDB');
  } catch (error) {
    console.error('❌ Lỗi khi import:', error);
    process.exit(1);
  }
}

importAdvancedCourses();
