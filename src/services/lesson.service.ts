import { injectable } from "tsyringe";
import LessonModel from "../models/lesson.model";
import CourseModel from "../models/course.model";
import TeacherModel from "../models/teacher.model";
import AppError from "../utils/AppError";
import { CreateLessonReqDto, UpdateLessonReqDto } from "../dtos/request/lesson.request.dto";
import mongoose from "mongoose";

@injectable()
class LessonService {
    // Helper: Populate va transform lesson
    private async populateAndTransformLesson(lessonId: string) {
        const lesson = await LessonModel.findById(lessonId)
            .populate({
                path: "created_by",
                select: "user",
                populate: {
                    path: "user",
                    select: "name avatar"
                }
            })
            .lean();

        if (!lesson) return null;

        return this.transformLessonData(lesson);
    }

    // Helper: Transform lesson data
    private transformLessonData(lesson: any) {
        if (!lesson.created_by?.user) {
            throw AppError.internalServerError("Dữ liệu giáo viên không đầy đủ");
        }

        return {
            ...lesson,
            _id: lesson._id.toString(),
            course_id: lesson.course_id.toString(),
            created_by: {
                _id: lesson.created_by._id.toString(),
                name: lesson.created_by.user.name,
                avatar: lesson.created_by.user.avatar || null
            }
        };
    }

    // API #1: Tao lesson moi
    createLesson = async (dto: CreateLessonReqDto) => {
        // Validate course ton tai
        const course = await CourseModel.findById(dto.course_id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        // Validate teacher ton tai
        const teacher = await TeacherModel.findById(dto.created_by);
        if (!teacher) {
            throw AppError.notFoundError("Giáo viên không tồn tại");
        }

        // Kiem tra order da ton tai chua
        const existingLesson = await LessonModel.findOne({
            course_id: dto.course_id,
            order: dto.order
        });

        if (existingLesson) {
            throw AppError.conflictError(`Thứ tự ${dto.order} đã tồn tại trong khóa học này`);
        }

        // Tao lesson moi
        const lesson = await LessonModel.create({
            ...dto,
            is_published: false,
            total_sections: 0,
            duration_minutes: dto.duration_minutes || 0
        });

        const result = await this.populateAndTransformLesson(lesson._id.toString());
        if (!result) {
            throw AppError.internalServerError("Tạo bài học thất bại");
        }

        return result;
    };

    // API #2: Lay danh sach lessons
    getLessonList = async (page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {};

        // Filter by course_id
        if (filters?.course_id) {
            query.course_id = filters.course_id;
        }

        // Filter by is_published
        if (filters?.is_published !== undefined) {
            query.is_published = filters.is_published === "true";
        }

        // Filter by created_by
        if (filters?.created_by) {
            query.created_by = filters.created_by;
        }

        const [total, lessons] = await Promise.all([
            LessonModel.countDocuments(query),
            LessonModel.find(query)
                .populate({
                    path: "created_by",
                    select: "user",
                    populate: {
                        path: "user",
                        select: "name avatar"
                    }
                })
                .sort({ course_id: 1, order: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        const data = lessons.map(lesson => this.transformLessonData(lesson));

        return { total, page, limit, data };
    };

    // API #3: Lay chi tiet lesson
    getLessonById = async (id: string) => {
        const lesson = await this.populateAndTransformLesson(id);
        if (!lesson) {
            throw AppError.notFoundError("Bài học không tồn tại");
        }

        return lesson;
    };

    // API #4: Cap nhat lesson
    updateLesson = async (id: string, dto: UpdateLessonReqDto) => {
        const lesson = await LessonModel.findById(id);
        if (!lesson) {
            throw AppError.notFoundError("Bài học không tồn tại");
        }

        // Neu update order, kiem tra trung
        if (dto.order && dto.order !== lesson.order) {
            const existingLesson = await LessonModel.findOne({
                course_id: lesson.course_id,
                order: dto.order,
                _id: { $ne: id }
            });

            if (existingLesson) {
                throw AppError.conflictError(`Thứ tự ${dto.order} đã tồn tại trong khóa học này`);
            }
        }

        // Cap nhat
        Object.assign(lesson, dto);
        await lesson.save();

        const result = await this.populateAndTransformLesson(id);
        if (!result) {
            throw AppError.internalServerError("Cập nhật bài học thất bại");
        }

        return result;
    };

    // API #5: Xoa lesson
    deleteLesson = async (id: string) => {
        // Kiem tra lesson co sections khong
        const sectionsCount = await mongoose.connection
            .collection("sections")
            .countDocuments({ lesson_id: new mongoose.Types.ObjectId(id) });

        if (sectionsCount > 0) {
            throw AppError.conflictError("Không thể xóa bài học đã có sections");
        }

        const deleted = await LessonModel.findByIdAndDelete(id);
        if (!deleted) {
            throw AppError.notFoundError("Bài học không tồn tại");
        }

        return {
            message: "Xóa bài học thành công",
            deletedId: id
        };
    };
}

export default LessonService;
