import { injectable } from "tsyringe";
import CourseModel from "../models/course.model";
import LessonModel from "../models/lesson.model";
import SectionModel from "../models/section.model";
import EnrollmentModel from "../models/enrollment.model";
import SectionProgressModel from "../models/sectionProgress.model";
import StudentModel from "../models/student.model";
import AppError from "../utils/AppError";
import mongoose from "mongoose";

@injectable()
class StudentCourseService {
    // Helper: Populate va transform course
    private transformCourseData(course: any) {
        return {
            ...course,
            _id: course._id.toString(),
            assigned_teachers: course.assigned_teachers?.map((teacher: any) => ({
                _id: teacher._id.toString(),
                name: teacher.user?.name || "",
                avatar: teacher.user?.avatar || null,
                experience_years: teacher.experience_years || 0
            })) || []
        };
    }

    // API #1: Lay courses cong khai
    getPublicCourses = async (page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {
            is_published: true
        };

        // Filter by skill_groups
        if (filters?.skill_groups) {
            const skillGroups = Array.isArray(filters.skill_groups)
                ? filters.skill_groups
                : [filters.skill_groups];
            query.skill_groups = { $in: skillGroups };
        }

        // Filter by min_rating
        if (filters?.min_rating) {
            query.average_rating = { $gte: Number(filters.min_rating) };
        }

        // Sort
        let sort: any = { createdAt: -1 };
        if (filters?.sortBy === 'popular') {
            sort = { total_enrollments: -1 };
        } else if (filters?.sortBy === 'rating') {
            sort = { average_rating: -1 };
        }

        const [total, courses] = await Promise.all([
            CourseModel.countDocuments(query),
            CourseModel.find(query)
                .populate({
                    path: "assigned_teachers",
                    select: "user experience_years",
                    populate: {
                        path: "user",
                        select: "name avatar"
                    }
                })
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        const data = courses.map(course => this.transformCourseData(course));

        return { total, page, limit, data };
    };

    // API #2: Lay chi tiet course cong khai
    getCourseById = async (courseId: string) => {
        const course = await CourseModel.findById(courseId)
            .populate({
                path: "assigned_teachers",
                select: "user experience_years",
                populate: {
                    path: "user",
                    select: "name avatar"
                }
            })
            .lean();

        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        if (!course.is_published) {
            throw AppError.forbiddenError("Khóa học chưa được xuất bản");
        }

        // Dem so luong lessons va sections
        const lessonsCount = await LessonModel.countDocuments({ course_id: courseId });
        const lessons = await LessonModel.find({ course_id: courseId }).select("_id").lean();
        const lessonIds = lessons.map((l: any) => l._id);

        const sectionsCount = await mongoose.connection
            .collection("sections")
            .countDocuments({ lesson_id: { $in: lessonIds } });

        return {
            ...this.transformCourseData(course),
            total_lessons: lessonsCount,
            total_sections: sectionsCount
        };
    };

    // API #3: Lay courses da enroll
    getEnrolledCourses = async (studentId: string) => {
        const enrollments = await EnrollmentModel.find({
            student: studentId
        }).populate("roadmap").lean();

        if (enrollments.length === 0) {
            return [];
        }

        const courseIds = new Set<string>();
        const courseToRoadmapMap: Record<string, Array<{ roadmap_id: string, roadmap_title: string }>> = {};

        enrollments.forEach(enrollment => {
            // Type guard cho roadmap
            const roadmap = enrollment.roadmap as any;
            if (roadmap && roadmap.courses) {
                roadmap.courses.forEach((courseId: any) => {
                    const courseIdStr = courseId.toString();
                    courseIds.add(courseIdStr);

                    if (!courseToRoadmapMap[courseIdStr]) {
                        courseToRoadmapMap[courseIdStr] = [];
                    }
                    courseToRoadmapMap[courseIdStr].push({
                        roadmap_id: roadmap._id.toString(),
                        roadmap_title: roadmap.title
                    });
                });
            }
        });

        const courses = await CourseModel.find({
            _id: { $in: Array.from(courseIds) }
        })
            .populate({
                path: "assigned_teachers",
                select: "user experience_years",
                populate: {
                    path: "user",
                    select: "name avatar"
                }
            })
            .lean();

        return courses.map(course => ({
            ...this.transformCourseData(course),
            enrolled_via_roadmaps: courseToRoadmapMap[course._id.toString()] || []
        }));
    };

    // API #4: Lay lessons va sections cua course
    getCourseLessonsWithSections = async (courseId: string, studentId?: string) => {
        console.log('🔍 [getCourseLessonsWithSections] courseId:', courseId, 'studentId:', studentId);
        
        // Kiem tra course co ton tai va published
        const course = await CourseModel.findById(courseId).lean();
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }
        if (!course.is_published) {
            throw AppError.forbiddenError("Khóa học chưa được xuất bản");
        }

        // Kiem tra student co enrolled khong (neu co studentId)
        let isEnrolled = false;
        let studentObjId: mongoose.Types.ObjectId | null = null;
        
        if (studentId) {
            // Lấy student object id từ user id
            const student = await StudentModel.findOne({ user: studentId }).lean();
            console.log('👤 [getCourseLessonsWithSections] Student found:', student?._id);
            
            if (student) {
                studentObjId = student._id as mongoose.Types.ObjectId;
            }
            
            const enrollmentCount = await EnrollmentModel.countDocuments({
                student: studentObjId,
                roadmap: { $exists: true }
            });
            console.log('📊 [getCourseLessonsWithSections] Enrollment count:', enrollmentCount);

            if (enrollmentCount > 0) {
                const enrollments = await EnrollmentModel.find({
                    student: studentObjId
                }).populate("roadmap").lean();
                
                console.log('📝 [getCourseLessonsWithSections] Enrollments:', enrollments.length);

                for (const enrollment of enrollments) {
                    const roadmap = enrollment.roadmap as any;
                    if (roadmap && roadmap.courses) {
                        const courseIds = roadmap.courses.map((id: any) => id.toString());
                        console.log('🗺️ [getCourseLessonsWithSections] Roadmap:', roadmap.title, 'Courses:', courseIds);
                        
                        if (courseIds.includes(courseId)) {
                            isEnrolled = true;
                            console.log('✅ [getCourseLessonsWithSections] ENROLLED! Course found in roadmap');
                            break;
                        }
                    }
                }
            }
        }
        
        console.log('🎯 [getCourseLessonsWithSections] Final isEnrolled:', isEnrolled);

        // Lay lessons va sections
        const lessons: any[] = await LessonModel.find({ course_id: courseId })
            .sort({ order: 1 })
            .lean();

        // Lấy tiến độ làm bài của student cho course này
        let sectionProgressMap: Map<string, any> = new Map();
        if (isEnrolled && studentObjId) {
            const progresses = await SectionProgressModel.find({
                student: studentObjId,
                course_id: courseId
            }).lean();
            
            progresses.forEach(p => {
                sectionProgressMap.set(p.section_id.toString(), p);
            });
        }

        // Helper: Kiểm tra chương trước đã hoàn thành bài tập >= 70% chưa
        const checkPreviousLessonCompleted = async (lessonIndex: number): Promise<boolean> => {
            if (lessonIndex === 0) return true; // Chương đầu tiên luôn mở
            
            const previousLesson = lessons[lessonIndex - 1];
            const previousSections = await SectionModel.find({ lesson_id: previousLesson._id }).lean();
            
            // Tìm section exercise/quiz của chương trước
            const exerciseSections = previousSections.filter(s => 
                s.type === "exercise" || s.type === "quiz"
            );
            
            // Nếu chương trước không có bài tập -> tự động mở khóa
            if (exerciseSections.length === 0) return true;
            
            // Kiểm tra tất cả bài tập chương trước đã hoàn thành >= 70%
            for (const exerciseSection of exerciseSections) {
                const progress = sectionProgressMap.get(exerciseSection._id.toString());
                if (!progress || !progress.is_completed || progress.score_percentage < 70) {
                    return false;
                }
            }
            
            return true;
        };

        const lessonsWithSections = await Promise.all(
            lessons.map(async (lesson, index) => {
                const sections = await SectionModel.find({ lesson_id: lesson._id })
                    .sort({ order: 1 })
                    .lean();

                // Kiểm tra điều kiện mở khóa chương
                let canAccessLesson = false;
                
                if (!isEnrolled) {
                    // Chưa enrolled: chỉ xem được chương có is_published = true
                    canAccessLesson = lesson.is_published;
                } else {
                    // Đã enrolled: kiểm tra chương trước đã hoàn thành bài tập chưa
                    canAccessLesson = await checkPreviousLessonCompleted(index);
                }

                // Map sections với trạng thái progress
                const filteredSections = sections.map(s => {
                    const progress = sectionProgressMap.get(s._id.toString());
                    return {
                        _id: s._id,
                        lesson_id: s.lesson_id,
                        title: s.title,
                        order: s.order,
                        description: s.description,
                        video_url: s.video_url,
                        mindmap_url: s.mindmap_url,
                        test_id: s.test_id,
                        type: s.type, // ✅ Đảm bảo trả về type
                        audioUrl: s.audioUrl,
                        articleContent: s.articleContent,
                        questions: s.questions,
                        passingScore: s.passingScore,
                        createdAt: s.createdAt,
                        updatedAt: s.updatedAt,
                        is_locked: !canAccessLesson,
                        // Thêm thông tin progress nếu có
                        progress: progress ? {
                            is_completed: progress.is_completed,
                            score_percentage: progress.score_percentage,
                            attempts: progress.attempts,
                            is_viewed: progress.is_viewed
                        } : null
                    };
                });

                return {
                    ...lesson,
                    total_sections: sections.length,
                    is_free: lesson.is_published,
                    is_locked: !canAccessLesson,
                    // Thêm lý do lock nếu bị lock
                    lock_reason: !canAccessLesson && isEnrolled 
                        ? "Bạn cần hoàn thành bài tập chương trước với điểm >= 70% để mở khóa chương này" 
                        : (!canAccessLesson ? "Bạn cần đăng ký khóa học để xem nội dung này" : null),
                    sections: filteredSections
                };
            })
        );

        return {
            course_id: courseId,
            course_title: course.title,
            is_enrolled: isEnrolled,
            lessons: lessonsWithSections
        };
    };
}

export default StudentCourseService;
