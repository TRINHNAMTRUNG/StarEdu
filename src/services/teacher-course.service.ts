import { injectable } from "tsyringe";
import CourseModel from "../models/course.model";
import LessonModel from "../models/lesson.model";
import AppError from "../utils/AppError";
import { UpdateCourseReqDto } from "../dtos/request/course.request.dto";
import mongoose from "mongoose";

@injectable()
class TeacherCourseService {
    // Helper: Kiem tra teacher co duoc assign vao course khong
    private async checkTeacherAssignment(courseId: string, teacherId: string): Promise<boolean> {
        const course = await CourseModel.findById(courseId).lean();
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        return course.assigned_teachers.some(
            (id: any) => id.toString() === teacherId
        );
    }

    // Helper: Populate va transform course
    private async populateAndTransformCourse(courseId: string) {
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

        if (!course) return null;

        return {
            ...course,
            _id: course._id.toString(),
            assigned_teachers: course.assigned_teachers.map((teacher: any) => ({
                _id: teacher._id.toString(),
                name: teacher.user?.name || "",
                avatar: teacher.user?.avatar || null,
                experience_years: teacher.experience_years || 0
            }))
        };
    }

    // API #1: Lay courses duoc assign
    getAssignedCourses = async (teacherId: string, page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {
            assigned_teachers: teacherId
        };

        if (filters?.is_published !== undefined) {
            query.is_published = filters.is_published === "true";
        }

        if (filters?.isModifiable !== undefined) {
            query.isModifiable = filters.isModifiable === "true";
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
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        const data = courses.map(course => ({
            ...course,
            _id: course._id.toString(),
            assigned_teachers: course.assigned_teachers.map((teacher: any) => ({
                _id: teacher._id.toString(),
                name: teacher.user?.name || "",
                avatar: teacher.user?.avatar || null,
                experience_years: teacher.experience_years || 0
            }))
        }));

        return { total, page, limit, data };
    };

    // API #2: Lay chi tiet course cua minh
    getCourseById = async (courseId: string, teacherId: string) => {
        // Kiem tra assignment
        const isAssigned = await this.checkTeacherAssignment(courseId, teacherId);
        if (!isAssigned) {
            throw AppError.forbiddenError("Bạn không được giao nhiệm vụ cho khóa học này");
        }

        const course = await this.populateAndTransformCourse(courseId);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        return course;
    };

    // API #3: Sua course cua minh
    updateCourse = async (courseId: string, teacherId: string, dto: UpdateCourseReqDto) => {
        // Kiem tra assignment
        const isAssigned = await this.checkTeacherAssignment(courseId, teacherId);
        if (!isAssigned) {
            throw AppError.forbiddenError("Bạn không được giao nhiệm vụ cho khóa học này");
        }

        const course = await CourseModel.findById(courseId);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        // Kiem tra isModifiable
        if (!course.isModifiable) {
            throw AppError.forbiddenError(
                "Khóa học đã được xuất bản và không cho phép chỉnh sửa. Vui lòng liên hệ admin."
            );
        }

        // Cap nhat (chi cho phep sua: title, description, thumbnail, skill_groups)
        Object.assign(course, {
            ...(dto.title && { title: dto.title }),
            ...(dto.description && { description: dto.description }),
            ...(dto.thumbnail && { thumbnail: dto.thumbnail }),
            ...(dto.skill_groups && { skill_groups: dto.skill_groups })
        });

        course.last_modified_by = new mongoose.Types.ObjectId(teacherId);
        course.last_modified_at = new Date();
        await course.save();

        const result = await this.populateAndTransformCourse(courseId);
        if (!result) {
            throw AppError.internalServerError("Cập nhật khóa học thất bại");
        }

        return result;
    };

    // API #4: Xem lessons cua course
    getCourseLessons = async (courseId: string, teacherId: string) => {
        // Kiem tra assignment
        const isAssigned = await this.checkTeacherAssignment(courseId, teacherId);
        if (!isAssigned) {
            throw AppError.forbiddenError("Bạn không được giao nhiệm vụ cho khóa học này");
        }

        const lessons = await LessonModel.find({ course_id: courseId })
            .sort({ order: 1 })
            .lean();

        return lessons.map(lesson => ({
            ...lesson,
            _id: lesson._id.toString(),
            course_id: lesson.course_id.toString()
        }));
    };

    // API #5: Thong ke course cua minh
    getCourseStatistics = async (courseId: string, teacherId: string) => {
        // Kiem tra assignment
        const isAssigned = await this.checkTeacherAssignment(courseId, teacherId);
        if (!isAssigned) {
            throw AppError.forbiddenError("Bạn không được giao nhiệm vụ cho khóa học này");
        }

        const course = await CourseModel.findById(courseId).lean();
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        // Dem so luong lessons va sections
        const lessonsCount = await LessonModel.countDocuments({ course_id: courseId });
        const lessons = await LessonModel.find({ course_id: courseId }).select("_id").lean();
        const lessonIds = lessons.map(l => l._id);

        const sectionsCount = await mongoose.connection
            .collection("sections")
            .countDocuments({ lesson_id: { $in: lessonIds } });

        // Tinh revenue tu roadmaps chua course nay
        const roadmapsWithCourse = await mongoose.connection
            .collection("roadmaps")
            .find({ courses: new mongoose.Types.ObjectId(courseId) })
            .project({ _id: 1 })
            .toArray();

        const roadmapIds = roadmapsWithCourse.map(r => r._id);

        const revenueResult = await mongoose.connection
            .collection("enrollments")
            .aggregate([
                { $match: { roadmap: { $in: roadmapIds } } },
                { $group: { _id: null, total: { $sum: "$enrolled_price" } } }
            ])
            .toArray();

        const total_revenue = revenueResult[0]?.total || 0;

        return {
            _id: course._id.toString(),
            title: course.title,
            total_lessons: lessonsCount,
            total_sections: sectionsCount,
            total_enrollments: course.total_enrollments,
            average_rating: course.average_rating,
            total_revenue
        };
    };

    // API #6: Dashboard courses assigned
    getDashboard = async (teacherId: string) => {
        const courses = await CourseModel.find({
            assigned_teachers: teacherId
        }).lean();

        const totalCourses = courses.length;
        const publishedCourses = courses.filter(c => c.is_published).length;
        const draftCourses = courses.filter(c => !c.is_published).length;
        const modifiableCourses = courses.filter(c => c.isModifiable).length;

        const coursesList = courses.map(course => ({
            _id: course._id.toString(),
            title: course.title,
            is_published: course.is_published,
            isModifiable: course.isModifiable,
            total_enrollments: course.total_enrollments,
            average_rating: course.average_rating
        }));

        return {
            total_courses: totalCourses,
            published_courses: publishedCourses,
            draft_courses: draftCourses,
            modifiable_courses: modifiableCourses,
            courses: coursesList
        };
    };
}

export default TeacherCourseService;
