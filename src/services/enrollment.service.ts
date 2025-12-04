import { injectable } from "tsyringe";
import EnrollmentModel from "../models/enrollment.model";
import StudentModel from "../models/student.model";
import RoadmapModel from "../models/roadmap.model";
import SectionProgressModel from "../models/sectionProgress.model";
import SectionModel from "../models/section.model";
import LessonModel from "../models/lesson.model";
import AppError from "../utils/AppError";
import mongoose from "mongoose";

@injectable()
class EnrollmentService {
    /**
     * Tính completion_percentage dựa trên section progress
     */
    private async calculateCompletionPercentage(studentObjId: mongoose.Types.ObjectId, roadmapId: string): Promise<number> {
        try {
            // Lấy roadmap với courses
            const roadmap = await RoadmapModel.findById(roadmapId).lean();
            if (!roadmap || !roadmap.courses || roadmap.courses.length === 0) {
                console.log(`📊 [calculateCompletion] Roadmap ${roadmapId} không có courses`);
                return 0;
            }

            const courseIds = roadmap.courses.map((c: any) => c.toString());
            console.log(`📊 [calculateCompletion] Roadmap ${roadmapId} có ${courseIds.length} courses`);
            
            // Đếm tổng số sections trong tất cả courses của roadmap
            const lessons = await LessonModel.find({ course_id: { $in: courseIds } }).select('_id').lean();
            const lessonIds = lessons.map(l => l._id);
            const totalSections = await SectionModel.countDocuments({ lesson_id: { $in: lessonIds } });
            
            console.log(`📊 [calculateCompletion] Tổng ${totalSections} sections trong roadmap`);
            
            if (totalSections === 0) return 0;
            
            // Đếm số sections đã hoàn thành
            const completedSections = await SectionProgressModel.countDocuments({
                student: studentObjId,
                lesson_id: { $in: lessonIds },
                is_completed: true
            });
            
            console.log(`📊 [calculateCompletion] Student ${studentObjId} đã hoàn thành ${completedSections}/${totalSections} sections`);
            
            const percentage = Math.round((completedSections / totalSections) * 100);
            console.log(`📊 [calculateCompletion] Completion: ${percentage}%`);
            return Math.min(percentage, 100);
        } catch (error) {
            console.error('Error calculating completion percentage:', error);
            return 0;
        }
    }

    /**
     * GET ENROLLMENT LIST
     */
    async getEnrollmentList(studentId: string, page: number = 1, limit: number = 10) {
        const student = await StudentModel.findOne({ user: studentId });
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        const [total, enrollments] = await Promise.all([
            EnrollmentModel.countDocuments({ student: student._id }),
            EnrollmentModel.find({ student: student._id })
                .populate("roadmap", "title description thumbnail target_level price discount_percentage total_courses estimated_duration_weeks courses")
                .sort({ enrolled_date: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec()
        ]);

        // ✅ Filter out enrollments with null/deleted roadmaps
        const validEnrollments = enrollments.filter((e: any) => e.roadmap != null);

        // Tính completion_percentage cho từng enrollment
        const dataWithProgress = await Promise.all(
            validEnrollments.map(async (e: any) => {
                const completionPercentage = await this.calculateCompletionPercentage(
                    student._id as mongoose.Types.ObjectId,
                    e.roadmap._id.toString()
                );

                return {
                    _id: e._id.toString(),
                    roadmap: {
                        _id: e.roadmap._id.toString(),
                        title: e.roadmap.title,
                        description: e.roadmap.description,
                        thumbnail: e.roadmap.thumbnail,
                        target_level: e.roadmap.target_level,
                        price: e.roadmap.price,
                        discount_percentage: e.roadmap.discount_percentage || 0,
                        total_courses: e.roadmap.total_courses || 0,
                        estimated_duration_weeks: e.roadmap.estimated_duration_weeks
                    },
                    enrolled_price: e.enrolled_price,
                    enrollment_date: e.enrolled_date,
                    completion_percentage: completionPercentage, // ✅ Tính động từ section progress
                    last_accessed: e.last_accessed
                };
            })
        );

        return { total, page, limit, data: dataWithProgress };
    }

    /**
     * GET ENROLLMENT BY ID
     */
    async getEnrollmentById(enrollmentId: string, studentId: string) {
        const enrollment = await EnrollmentModel.findById(enrollmentId)
            .populate("roadmap", "title description thumbnail target_level price discount_percentage total_courses estimated_duration_weeks courses")
            .populate("certificate", "_id")
            .lean()
            .exec();

        if (!enrollment) {
            throw AppError.notFoundError("Enrollment không tồn tại");
        }

        const student = await StudentModel.findOne({ user: studentId });
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        if ((enrollment.student as any).toString() !== student._id.toString()) {
            throw AppError.forbiddenError("Bạn không có quyền truy cập enrollment này");
        }

        const roadmap = enrollment.roadmap as any;
        const certificate = enrollment.certificate as any;

        // Tính completion_percentage động
        const completionPercentage = await this.calculateCompletionPercentage(
            student._id as mongoose.Types.ObjectId,
            roadmap._id.toString()
        );

        return {
            _id: enrollment._id.toString(),
            roadmap: {
                _id: roadmap._id.toString(),
                title: roadmap.title,
                description: roadmap.description,
                thumbnail: roadmap.thumbnail,
                target_level: roadmap.target_level,
                price: roadmap.price,
                discount_percentage: roadmap.discount_percentage || 0,
                total_courses: roadmap.total_courses || 0,
                estimated_duration_weeks: roadmap.estimated_duration_weeks
            },
            enrolled_price: enrollment.enrolled_price,
            enrollment_date: enrollment.enrolled_date,
            completion_percentage: completionPercentage, // ✅ Tính động từ section progress
            last_accessed: enrollment.last_accessed,
            certificate_id: certificate?._id?.toString(),
            createdAt: (enrollment as any).createdAt
        };
    }

    /**
     * GET COURSES WITH COMPLETION PERCENTAGE FOR AN ENROLLMENT
     */
    async getEnrollmentCoursesWithProgress(enrollmentId: string, studentId: string) {
        const enrollment = await EnrollmentModel.findById(enrollmentId)
            .populate("roadmap", "courses")
            .lean()
            .exec();

        if (!enrollment) {
            throw AppError.notFoundError("Enrollment không tồn tại");
        }

        const student = await StudentModel.findOne({ user: studentId });
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        if ((enrollment.student as any).toString() !== student._id.toString()) {
            throw AppError.forbiddenError("Bạn không có quyền truy cập enrollment này");
        }

        const roadmap = enrollment.roadmap as any;
        if (!roadmap || !roadmap.courses || roadmap.courses.length === 0) {
            return { data: [] };
        }

        // Load course details từ CourseModel
        const CourseModel = require("../models/course.model").default;
        const courseIds = roadmap.courses.map((c: any) => c.toString());
        const courses = await CourseModel.find({ _id: { $in: courseIds } })
            .populate({
                path: "assigned_teachers",
                select: "user experience_years",
                populate: {
                    path: "user",
                    select: "name avatar"
                }
            })
            .lean();

        // Tính completion_percentage cho từng course
        const coursesWithProgress = await Promise.all(
            courses.map(async (course: any) => {
                // Đếm tổng số sections trong course
                const lessons = await LessonModel.find({ course_id: course._id }).select('_id').lean();
                const lessonIds = lessons.map(l => l._id);
                const totalSections = await SectionModel.countDocuments({ lesson_id: { $in: lessonIds } });
                
                // Đếm số sections đã hoàn thành
                const completedSections = totalSections === 0 ? 0 : await SectionProgressModel.countDocuments({
                    student: student._id,
                    lesson_id: { $in: lessonIds },
                    is_completed: true
                });
                
                const completionPercentage = totalSections === 0 ? 0 : Math.round((completedSections / totalSections) * 100);

                return {
                    _id: course._id.toString(),
                    title: course.title,
                    description: course.description,
                    thumbnail: course.thumbnail,
                    skill_groups: course.skill_groups,
                    target_level: course.target_level,
                    is_published: course.is_published,
                    total_lessons: course.total_lessons || 0,
                    total_duration_minutes: course.total_duration_minutes || 0,
                    average_rating: course.average_rating || 0,
                    total_enrollments: course.total_enrollments || 0,
                    assigned_teachers: course.assigned_teachers?.map((t: any) => ({
                        _id: t._id.toString(),
                        name: t.user?.name || "",
                        avatar: t.user?.avatar || null,
                        experience_years: t.experience_years || 0
                    })) || [],
                    completion_percentage: completionPercentage
                };
            })
        );

        return { data: coursesWithProgress };
    }
}

export default EnrollmentService;
