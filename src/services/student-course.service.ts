import { injectable } from "tsyringe";
import CourseModel from "../models/course.model";
import LessonModel from "../models/lesson.model";
import SectionModel from "../models/section.model";
import EnrollmentModel from "../models/enrollment.model";
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
        if (studentId) {
            const enrollmentCount = await EnrollmentModel.countDocuments({
                student: studentId,
                roadmap: { $exists: true }
            });

            if (enrollmentCount > 0) {
                const enrollments = await EnrollmentModel.find({
                    student: studentId
                }).populate("roadmap").lean();

                for (const enrollment of enrollments) {
                    const roadmap = enrollment.roadmap as any;
                    if (roadmap && roadmap.courses) {
                        const courseIds = roadmap.courses.map((id: any) => id.toString());
                        if (courseIds.includes(courseId)) {
                            isEnrolled = true;
                            break;
                        }
                    }
                }
            }
        }

        // Lay lessons va sections
        const lessons: any[] = await LessonModel.find({ course_id: courseId })
            .sort({ order: 1 })
            .lean();

        const lessonsWithSections = await Promise.all(
            lessons.map(async (lesson) => {
                const sections = await SectionModel.find({ lesson_id: lesson._id })
                    .sort({ order: 1 })
                    .lean();

                // Neu chua enrolled, chi tra ve section free (is_published = true trong lesson)
                const filteredSections = isEnrolled
                    ? sections
                    : lesson.is_published
                        ? sections
                        : sections.map(s => ({
                            ...s,
                            video_url: null,
                            mindmap_url: null,
                            test_id: null,
                            is_locked: true
                        }));

                return {
                    ...lesson,
                    is_free: lesson.is_published,
                    is_locked: !isEnrolled && !lesson.is_published,
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
