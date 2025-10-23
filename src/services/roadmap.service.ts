import { injectable } from "tsyringe";
import RoadmapModel from "../models/roadmap.model";
import CourseModel from "../models/course.model";
import CertificationModel from "../models/certification.model";
import EnrollmentModel from "../models/enrollment.model";
import AppError from "../utils/AppError";
import {
    CreateRoadmapReqDto,
    UpdateRoadmapReqDto,
    AddCoursesToRoadmapReqDto
} from "../dtos/request/roadmap.request.dto";
import mongoose from "mongoose";

@injectable()
class RoadmapService {
    private async populateAndTransformRoadmap(roadmapId: string) {
        const roadmap = await RoadmapModel.findById(roadmapId)
            .populate({
                path: "courses",
                select: "title thumbnail skill_groups"
            })
            .lean();

        if (!roadmap) return null;

        return {
            ...roadmap,
            _id: roadmap._id.toString(),
            courses: roadmap.courses.map((course: any) => ({
                _id: course._id.toString(),
                title: course.title,
                thumbnail: course.thumbnail,
                skill_groups: course.skill_groups
            }))
        };
    }

    // API #1: Tao roadmap moi
    createRoadmap = async (dto: CreateRoadmapReqDto) => {

        const roadmap = await RoadmapModel.create({
            ...dto,
            courses: [],
            is_published: false,
            total_enrollments: 0
        });

        const result = await this.populateAndTransformRoadmap(roadmap._id.toString());
        if (!result) {
            throw AppError.internalServerError("Tạo lộ trình thất bại");
        }

        return result;
    };

    // API #2: Lay danh sach roadmaps
    getRoadmapList = async (page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {};

        if (filters?.is_published !== undefined) {
            query.is_published = filters.is_published === "true";
        }

        const [total, roadmaps] = await Promise.all([
            RoadmapModel.countDocuments(query),
            RoadmapModel.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        const data = roadmaps.map(roadmap => ({
            _id: roadmap._id.toString(),
            title: roadmap.title,
            target_score: roadmap.target_score,
            price: roadmap.price,
            discount_percentage: roadmap.discount_percentage,
            is_published: roadmap.is_published,
            total_enrollments: roadmap.total_enrollments
        }));

        return { total, page, limit, data };
    };

    // API #3: Lay chi tiet roadmap
    getRoadmapById = async (id: string) => {
        const roadmap = await this.populateAndTransformRoadmap(id);
        if (!roadmap) {
            throw AppError.notFoundError("Lộ trình không tồn tại");
        }

        return roadmap;
    };

    // API #4: Cap nhat roadmap
    updateRoadmap = async (id: string, dto: UpdateRoadmapReqDto) => {
        const exists = await RoadmapModel.exists({ _id: id });
        if (!exists) {
            throw AppError.notFoundError("Lộ trình không tồn tại");
        }

        await RoadmapModel.findByIdAndUpdate(
            id,
            { $set: dto },
            { new: true, runValidators: true }
        );

        const result = await this.populateAndTransformRoadmap(id);
        if (!result) {
            throw AppError.internalServerError("Cập nhật lộ trình thất bại");
        }

        return result;
    };

    // API #5: Xoa roadmap
    deleteRoadmap = async (id: string) => {
        const hasEnrollments = await EnrollmentModel.exists({ roadmap: id });
        if (hasEnrollments) {
            throw AppError.conflictError("Không thể xóa lộ trình đã có học viên đăng ký");
        }

        const deleted = await RoadmapModel.findByIdAndDelete(id);
        if (!deleted) {
            throw AppError.notFoundError("Lộ trình không tồn tại");
        }

        return {
            message: "Xóa lộ trình thành công",
            deletedId: id
        };
    };

    // API #6: Publish/Unpublish roadmap
    togglePublishRoadmap = async (id: string) => {
        const roadmap = await RoadmapModel.findById(id);
        if (!roadmap) {
            throw AppError.notFoundError("Lộ trình không tồn tại");
        }

        if (!roadmap.is_published && roadmap.courses.length === 0) {
            throw AppError.badRequestError("Lộ trình phải có ít nhất 1 khóa học trước khi xuất bản");
        }

        roadmap.is_published = !roadmap.is_published;
        await roadmap.save();

        return {
            _id: roadmap._id.toString(),
            title: roadmap.title,
            is_published: roadmap.is_published
        };
    };

    // API #7: Add courses vao roadmap
    addCoursesToRoadmap = async (id: string, dto: AddCoursesToRoadmapReqDto) => {
        const courses = await CourseModel.find({
            _id: { $in: dto.course_ids }
        });

        if (courses.length !== dto.course_ids.length) {
            throw AppError.notFoundError("Một số khóa học không tồn tại");
        }

        const roadmap = await RoadmapModel.findById(id);
        if (!roadmap) {
            throw AppError.notFoundError("Lộ trình không tồn tại");
        }

        const uniqueCourseIds = [...new Set([...roadmap.courses.map(c => c.toString()), ...dto.course_ids])];
        roadmap.courses = uniqueCourseIds.map(id => new mongoose.Types.ObjectId(id));
        await roadmap.save();

        const result = await this.populateAndTransformRoadmap(id);
        if (!result) {
            throw AppError.internalServerError("Thêm khóa học thất bại");
        }

        return result;
    };

    // API #8: Remove course khoi roadmap
    removeCourseFromRoadmap = async (roadmapId: string, courseId: string) => {
        const roadmap = await RoadmapModel.findById(roadmapId);
        if (!roadmap) {
            throw AppError.notFoundError("Lộ trình không tồn tại");
        }

        if (roadmap.is_published) {
            const hasEnrollments = await EnrollmentModel.exists({ roadmap: roadmapId });
            if (hasEnrollments) {
                throw AppError.conflictError("Không thể xóa khóa học khỏi lộ trình đã có học viên đăng ký");
            }
        }

        roadmap.courses = roadmap.courses.filter(c => c.toString() !== courseId);
        await roadmap.save();

        const result = await this.populateAndTransformRoadmap(roadmapId);
        if (!result) {
            throw AppError.internalServerError("Xóa khóa học thất bại");
        }

        return result;
    };
}

export default RoadmapService;
