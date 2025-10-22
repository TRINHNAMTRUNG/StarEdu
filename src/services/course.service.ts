import { injectable } from "tsyringe";
import CourseModel from "../models/course.model";
import TeacherModel from "../models/teacher.model";
import EnrollmentModel from "../models/enrollment.model";
import LessonModel from "../models/lesson.model";
import AppError from "../utils/AppError";
import {
    CreateCourseReqDto,
    UpdateCourseReqDto,
    AssignTeachersReqDto,
    ToggleModifiableReqDto
} from "../dtos/request/course.request.dto";
import mongoose from "mongoose";

@injectable()
class CourseService {
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

        return this.transformCourseData(course);
    }

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

    // API #1: Tao course moi
    createCourse = async (dto: CreateCourseReqDto) => {
        const course = await CourseModel.create({
            ...dto,
            assigned_teachers: [],
            is_published: false,
            isModifiable: true,
            total_enrollments: 0,
            average_rating: 0,
            total_reviews: 0
        });

        const result = await this.populateAndTransformCourse(course._id.toString());
        if (!result) {
            throw AppError.internalServerError("Tạo khóa học thất bại");
        }

        return result;
    };

    // API #2: Lay danh sach courses
    getCourseList = async (page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {};

        if (filters?.is_published !== undefined) {
            query.is_published = filters.is_published === "true";
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

        const data = courses.map(course => this.transformCourseData(course));

        return { total, page, limit, data };
    };

    // API #3: Lay chi tiet course
    getCourseById = async (id: string) => {
        const course = await this.populateAndTransformCourse(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        return course;
    };

    // API #4: Cap nhat course
    updateCourse = async (id: string, dto: UpdateCourseReqDto) => {
        const exists = await CourseModel.exists({ _id: id });
        if (!exists) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        await CourseModel.findByIdAndUpdate(
            id,
            { $set: dto },
            { new: true, runValidators: true }
        );

        const result = await this.populateAndTransformCourse(id);
        if (!result) {
            throw AppError.internalServerError("Cập nhật khóa học thất bại");
        }

        return result;
    };

    // API #5: Xoa course
    deleteCourse = async (id: string) => {
        const roadmapsWithCourse = await mongoose.connection
            .collection("roadmaps")
            .find({ courses: new mongoose.Types.ObjectId(id) })
            .project({ _id: 1 })
            .toArray();

        if (roadmapsWithCourse.length > 0) {
            const roadmapIds = roadmapsWithCourse.map(r => r._id);
            const hasEnrollments = await EnrollmentModel.exists({
                roadmap: { $in: roadmapIds }
            });

            if (hasEnrollments) {
                throw AppError.conflictError("Không thể xóa khóa học đã có học viên đăng ký");
            }
        }

        const deleted = await CourseModel.findByIdAndDelete(id);
        if (!deleted) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        return {
            message: "Xóa khóa học thành công",
            deletedId: id
        };
    };

    // API #6: Publish/Unpublish course
    togglePublishCourse = async (id: string) => {
        const course = await CourseModel.findById(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        if (!course.is_published) {
            if (!course.thumbnail) {
                throw AppError.badRequestError("Khóa học phải có thumbnail trước khi xuất bản");
            }
            if (!course.description) {
                throw AppError.badRequestError("Khóa học phải có mô tả trước khi xuất bản");
            }

            const hasLessons = await LessonModel.exists({ course_id: id });
            if (!hasLessons) {
                throw AppError.badRequestError("Khóa học phải có ít nhất 1 bài học trước khi xuất bản");
            }

            course.isModifiable = false;
        }

        course.is_published = !course.is_published;
        await course.save();

        return {
            _id: course._id.toString(),
            title: course.title,
            is_published: course.is_published
        };
    };

    // API #7: Assign teachers vao course
    assignTeachersToCourse = async (id: string, dto: AssignTeachersReqDto) => {
        const teachers = await TeacherModel.find({ 
            _id: { $in: dto.teacher_ids } 
        });

        if (teachers.length !== dto.teacher_ids.length) {
            throw AppError.notFoundError("Một số giáo viên không tồn tại");
        }

        const updated = await CourseModel.findByIdAndUpdate(
            id,
            { $set: { assigned_teachers: dto.teacher_ids } },
            { new: true }
        );

        if (!updated) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        const result = await this.populateAndTransformCourse(id);
        if (!result) {
            throw AppError.internalServerError("Gán giáo viên thất bại");
        }

        return result;
    };

    // API #8: Thong ke course
    getCourseStatistics = async (id: string) => {
        const course = await CourseModel.findById(id).lean();
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        const roadmapsWithCourse = await mongoose.connection
            .collection("roadmaps")
            .find({ courses: new mongoose.Types.ObjectId(id) })
            .project({ _id: 1 })
            .toArray();

        const roadmapIds = roadmapsWithCourse.map(r => r._id);

        const revenueResult = await EnrollmentModel.aggregate([
            { $match: { roadmap: { $in: roadmapIds } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$enrolled_price" }
                }
            }
        ]);

        const total_revenue = revenueResult[0]?.total || 0;

        return {
            _id: course._id.toString(),
            title: course.title,
            total_enrollments: course.total_enrollments,
            average_rating: course.average_rating,
            total_reviews: course.total_reviews,
            total_revenue
        };
    };

    // API #9: Toggle isModifiable
    toggleModifiable = async (id: string, dto: ToggleModifiableReqDto, adminId: string) => {
        const course = await CourseModel.findById(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        if (!course.is_published) {
            throw AppError.badRequestError("Chỉ toggle isModifiable cho khóa học đã xuất bản");
        }

        course.isModifiable = dto.isModifiable;
        course.last_modified_by = new mongoose.Types.ObjectId(adminId);
        course.last_modified_at = new Date();

        await course.save();

        return {
            _id: course._id.toString(),
            title: course.title,
            isModifiable: course.isModifiable,
            last_modified_by: adminId,
            last_modified_at: course.last_modified_at
        };
    };
}

export default CourseService;