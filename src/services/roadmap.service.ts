import { injectable } from "tsyringe";
import RoadmapModel from "../models/roadmap.model";
import CourseModel from "../models/course.model";
import LessonModel from "../models/lesson.model";
import SectionModel from "../models/section.model";
import AppError from "../utils/AppError";
import { CreateRoadmapReqDto, UpdateRoadmapReqDto, AddCoursesToRoadmapReqDto, StructureContext } from "../dtos/request/roadmap.request.dto";
import s3Util, { S3Folder } from "../utils/s3.util";
import EnrollmentModel from "../models/enrollment.model";

@injectable()
class RoadmapService {
    /**
     * CREATE ROADMAP (with thumbnail upload)
     */
    async createRoadmap(dto: CreateRoadmapReqDto, thumbnailFile?: Express.Multer.File) {
        let thumbnail_url: string | undefined;

        // Upload thumbnail nếu có
        if (thumbnailFile) {
            const validImageTypes = [".jpg", ".jpeg", ".png", ".webp"];
            if (!s3Util.validateFileType(thumbnailFile.originalname, validImageTypes)) {
                throw AppError.badRequestError("Thumbnail phải là định dạng JPG, PNG hoặc WEBP");
            }

            if (!s3Util.validateFileSize(thumbnailFile.size, 5)) {
                throw AppError.badRequestError("Thumbnail không được vượt quá 5MB");
            }

            thumbnail_url = await s3Util.uploadFile(
                thumbnailFile.buffer,
                S3Folder.IMAGES,
                `roadmap-${Date.now()}-${thumbnailFile.originalname}`,
                thumbnailFile.mimetype
            );
        }

        const roadmap = await RoadmapModel.create({
            ...dto,
            thumbnail: thumbnail_url || dto.thumbnail,
            courses: [],
            certifications: [],
            is_published: false,
            is_free: false,
            total_enrollments: 0,
            average_rating: 0
        });

        return {
            ...roadmap.toObject(),
            _id: roadmap._id.toString()
        };
    }

    /**
     * GET ROADMAP LIST
     */
    async getRoadmapList(page: number, limit: number, filters: any) {
        const query: any = {};

        if (filters.is_published !== undefined) {
            query.is_published = filters.is_published === "true";
        }

        if (filters.is_free !== undefined) {
            query.is_free = filters.is_free === "true";
        }

        const [total, roadmaps] = await Promise.all([
            RoadmapModel.countDocuments(query),
            RoadmapModel.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return {
            total,
            page,
            limit,
            data: roadmaps.map(r => ({
                ...r,
                _id: r._id.toString(),
                thumbnail: r.thumbnail || null  // Ensure thumbnail field always exists
            }))
        };
    }

    /**
     * GET ROADMAP BY ID
     */
    async getRoadmapById(id: string) {
        const roadmap = await RoadmapModel.findById(id)
            .populate({
                path: "courses",
                select: "_id title thumbnail"
            })
            .lean();

        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        return {
            ...roadmap,
            _id: roadmap._id.toString(),
            courses: roadmap.courses.map((c: any) => ({
                _id: c._id.toString(),
                title: c.title,
                thumbnail: c.thumbnail
            }))
        };
    }

    /**
     * UPDATE ROADMAP (with thumbnail upload)
     */
    async updateRoadmap(
        id: string,
        dto: UpdateRoadmapReqDto,
        thumbnailFile?: Express.Multer.File,
        removeThumbnail?: boolean
    ) {
        const roadmap = await RoadmapModel.findById(id);
        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        const oldThumbnail = roadmap.thumbnail;

        // Upload thumbnail mới
        if (thumbnailFile) {
            const validImageTypes = [".jpg", ".jpeg", ".png", ".webp"];
            if (!s3Util.validateFileType(thumbnailFile.originalname, validImageTypes)) {
                throw AppError.badRequestError("Thumbnail phải là định dạng JPG, PNG hoặc WEBP");
            }

            dto.thumbnail = await s3Util.uploadFile(
                thumbnailFile.buffer,
                S3Folder.IMAGES,
                `roadmap-${Date.now()}-${thumbnailFile.originalname}`,
                thumbnailFile.mimetype
            );

            // Xóa thumbnail cũ
            if (oldThumbnail) {
                await s3Util.deleteFile(oldThumbnail);
            }
        }

        // Remove thumbnail
        if (removeThumbnail && roadmap.thumbnail) {
            await s3Util.deleteFile(roadmap.thumbnail);
            dto.thumbnail = undefined;
        }

        Object.assign(roadmap, dto);
        await roadmap.save();

        return {
            ...roadmap.toObject(),
            _id: roadmap._id.toString()
        };
    }

    /**
     * DELETE ROADMAP (with thumbnail cleanup)
     */
    async deleteRoadmap(id: string) {
        const roadmap = await RoadmapModel.findById(id);
        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        // Check enrollments
        const hasEnrollments = await EnrollmentModel.exists({ roadmap: id });
        if (hasEnrollments) {
            throw AppError.conflictError("Không thể xóa roadmap đã có học viên đăng ký");
        }

        // ✅ DELETE THUMBNAIL from S3
        if (roadmap.thumbnail) {
            await s3Util.deleteFile(roadmap.thumbnail);
        }

        await RoadmapModel.findByIdAndDelete(id);

        return {
            message: "Xóa roadmap thành công",
            deletedId: id,
            deletedThumbnail: roadmap.thumbnail ? 1 : 0
        };
    }

    /**
     * TOGGLE PUBLISH ROADMAP
     */
    async togglePublishRoadmap(id: string) {
        const roadmap = await RoadmapModel.findById(id);

        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        roadmap.is_published = !roadmap.is_published;
        await roadmap.save();

        return {
            _id: roadmap._id.toString(),
            title: roadmap.title,
            is_published: roadmap.is_published
        };
    }

    /**
     * ADD COURSES TO ROADMAP
     */
    async addCoursesToRoadmap(id: string, dto: AddCoursesToRoadmapReqDto) {
        const roadmap = await RoadmapModel.findById(id);

        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        // Validate courses exist
        const courses = await CourseModel.find({ _id: { $in: dto.course_ids } });

        if (courses.length !== dto.course_ids.length) {
            throw AppError.badRequestError("Một số courses không tồn tại");
        }

        // Add courses (avoid duplicates)
        const existingIds = roadmap.courses.map(c => c.toString());
        const newIds = dto.course_ids.filter(id => !existingIds.includes(id));

        roadmap.courses.push(...newIds as any);
        await roadmap.save();

        const updated = await RoadmapModel.findById(id)
            .populate({
                path: "courses",
                select: "_id title thumbnail"
            })
            .lean();

        return {
            ...updated,
            _id: updated!._id.toString(),
            courses: updated!.courses.map((c: any) => ({
                _id: c._id.toString(),
                title: c.title,
                thumbnail: c.thumbnail
            }))
        };
    }

    /**
     * REMOVE COURSE FROM ROADMAP
     */
    async removeCourseFromRoadmap(id: string, courseId: string) {
        const roadmap = await RoadmapModel.findById(id);

        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        roadmap.courses = roadmap.courses.filter(c => c.toString() !== courseId) as any;
        await roadmap.save();

        const updated = await RoadmapModel.findById(id)
            .populate({
                path: "courses",
                select: "_id title thumbnail"
            })
            .lean();

        return {
            ...updated,
            _id: updated!._id.toString(),
            courses: updated!.courses.map((c: any) => ({
                _id: c._id.toString(),
                title: c.title,
                thumbnail: c.thumbnail
            }))
        };
    }

    /**
     * ============================================
     * PHASE 1: GET ROADMAP STRUCTURE
     * ============================================
     */
    async getRoadmapStructure(roadmapId: string, context: StructureContext = StructureContext.PUBLIC) {
        const roadmap = await RoadmapModel.findById(roadmapId).lean();

        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        const courseQuery: any = { _id: { $in: roadmap.courses } };

        if (context === StructureContext.PUBLIC) {
            courseQuery.is_published = true;
        }

        const courses = await CourseModel.find(courseQuery).sort({ order: 1 }).lean();
        const courseIds = courses.map(c => c._id);

        const lessonQuery: any = { course_id: { $in: courseIds } };

        if (context === StructureContext.PUBLIC) {
            lessonQuery.is_published = true;
        }

        const lessons = await LessonModel.find(lessonQuery).sort({ order: 1 }).lean();
        const lessonIds = lessons.map(l => l._id);

        // ✅ FIX: Section chỉ select các field có trong model
        const sections = await SectionModel.find({ lesson_id: { $in: lessonIds } })
            .select("_id lesson_id title order description")
            .sort({ order: 1 })
            .lean();

        const coursesWithStructure = courses.map(course => {
            const courseLessons = lessons.filter(l =>
                l.course_id.toString() === course._id.toString()
            );

            const freeLessonsCount = courseLessons.filter(l => l.is_free).length;

            const lessonsWithSections = courseLessons.map(lesson => {
                const lessonSections = sections.filter(s =>
                    s.lesson_id.toString() === lesson._id.toString()
                );

                return {
                    _id: lesson._id.toString(),
                    title: lesson.title,
                    order: lesson.order,
                    is_published: lesson.is_published,
                    is_free: lesson.is_free,
                    sections: lessonSections.map(s => ({
                        _id: s._id.toString(),
                        title: s.title,
                        order: s.order,
                        description: s.description || ""  // ✅ FIX: Dùng description
                    }))
                };
            });

            return {
                _id: course._id.toString(),
                title: course.title,
                order: course.order,
                is_published: course.is_published,
                is_free: course.is_free,
                total_lessons: courseLessons.length,
                free_lessons_count: freeLessonsCount,
                lessons: lessonsWithSections
            };
        });

        return {
            roadmap: {
                _id: roadmap._id.toString(),
                title: roadmap.title,
                description: roadmap.description,
                is_published: roadmap.is_published,
                is_free: roadmap.is_free
            },
            courses: coursesWithStructure
        };
    }

    /**
     * ============================================
     * PHASE 1: GET PUBLISH PREVIEW
     * ============================================
     */
    async getPublishPreview(roadmapId: string) {
        const roadmap = await RoadmapModel.findById(roadmapId).lean();

        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        const courses = await CourseModel.find({ _id: { $in: roadmap.courses } })
            .sort({ order: 1 })
            .lean();

        const courseIds = courses.map(c => c._id);
        const lessons = await LessonModel.find({ course_id: { $in: courseIds } }).lean();

        const coursePreviews = courses.map(course => {
            const courseLessons = lessons.filter(l =>
                l.course_id.toString() === course._id.toString()
            );

            const publishedLessons = courseLessons.filter(l => l.is_published).length;
            const freeLessons = courseLessons.filter(l => l.is_free).length;

            return {
                _id: course._id.toString(),
                title: course.title,
                total_lessons: courseLessons.length,
                published_lessons: publishedLessons,
                free_lessons: freeLessons,
                ready_to_publish: courseLessons.length > 0
            };
        });

        const totalLessons = lessons.length;
        const publishedLessons = lessons.filter(l => l.is_published).length;
        const freeLessons = lessons.filter(l => l.is_free).length;
        const readyToPublish = coursePreviews.every(c => c.ready_to_publish);

        return {
            roadmap: {
                _id: roadmap._id.toString(),
                title: roadmap.title,
                is_published: roadmap.is_published
            },
            courses: coursePreviews,
            summary: {
                total_courses: courses.length,
                total_lessons: totalLessons,
                published_lessons: publishedLessons,
                free_lessons: freeLessons,
                ready_to_publish: readyToPublish
            }
        };
    }

    /**
     * PHASE 3 - API #8: SMART PUBLISH ROADMAP
     */
    async smartPublishRoadmap(roadmapId: string, mode: string = "none", freeLessonsPerCourse: number = 0) {
        const roadmap = await RoadmapModel.findById(roadmapId).populate("courses").lean();

        if (!roadmap) throw AppError.notFoundError("Roadmap không tồn tại");
        if (!roadmap.courses || roadmap.courses.length === 0) {
            throw AppError.badRequestError("Roadmap chưa có course nào");
        }

        const courseIds = roadmap.courses.map((c: any) => c._id);
        const lessons = await LessonModel.find({ course_id: { $in: courseIds } })
            .sort({ course_id: 1, order: 1 })
            .lean();

        // Validate: mỗi course phải có ít nhất 1 lesson
        const coursesWithoutLessons: string[] = [];
        for (const course of roadmap.courses as any[]) {
            const lessonsCount = lessons.filter(l =>
                l.course_id.toString() === course._id.toString()
            ).length;

            if (lessonsCount === 0) {
                coursesWithoutLessons.push(course.title);
            }
        }

        if (coursesWithoutLessons.length > 0) {
            throw AppError.badRequestError(
                `Các course sau chưa có lesson: ${coursesWithoutLessons.join(", ")}`
            );
        }

        // Group lessons by course
        const lessonsByCourse = new Map<string, any[]>();
        lessons.forEach(lesson => {
            const courseId = lesson.course_id.toString();
            if (!lessonsByCourse.has(courseId)) {
                lessonsByCourse.set(courseId, []);
            }
            lessonsByCourse.get(courseId)!.push(lesson);
        });

        // Set free lessons theo mode
        const freeLessonIds: string[] = [];

        if (mode === "perCourseCount" && freeLessonsPerCourse > 0) {
            for (const [courseId, courseLessons] of lessonsByCourse.entries()) {
                const sortedLessons = courseLessons.sort((a, b) => a.order - b.order);
                sortedLessons.forEach((lesson, index) => {
                    if (index < freeLessonsPerCourse) {
                        freeLessonIds.push(lesson._id.toString());
                    }
                });
            }
        }

        // Update lessons
        if (freeLessonIds.length > 0) {
            await LessonModel.updateMany(
                { _id: { $in: freeLessonIds } },
                { $set: { is_free: true, is_published: true } }
            );

            await LessonModel.updateMany(
                {
                    course_id: { $in: courseIds },
                    _id: { $nin: freeLessonIds }
                },
                { $set: { is_free: false, is_published: true } }
            );
        } else {
            // Mode = "none": publish tất cả nhưng không set free
            await LessonModel.updateMany(
                { course_id: { $in: courseIds } },
                { $set: { is_published: true } }
            );
        }

        // Publish courses và roadmap
        await CourseModel.updateMany(
            { _id: { $in: courseIds } },
            { $set: { is_published: true } }
        );

        await RoadmapModel.findByIdAndUpdate(roadmapId, { is_published: true });

        // Summary
        const coursesSummary = [];
        for (const course of roadmap.courses as any[]) {
            const courseLessons = lessonsByCourse.get(course._id.toString()) || [];
            const freeLessons = freeLessonIds.filter(id =>
                courseLessons.some(l => l._id.toString() === id)
            ).length;

            coursesSummary.push({
                _id: course._id.toString(),
                title: course.title,
                total_lessons: courseLessons.length,
                free_lessons: freeLessons
            });
        }

        return {
            roadmap: {
                _id: roadmap._id.toString(),
                title: roadmap.title,
                is_published: true
            },
            summary: {
                total_courses: roadmap.courses.length,
                published_courses: roadmap.courses.length,
                total_lessons: lessons.length,
                published_lessons: lessons.length,
                free_lessons: freeLessonIds.length
            },
            courses: coursesSummary
        };
    }

    /**
     * PHASE 3 - API #9: TOGGLE FREE ROADMAP
     */
    async toggleFreeRoadmap(roadmapId: string, isFree: boolean) {
        const roadmap = await RoadmapModel.findById(roadmapId);
        if (!roadmap) throw AppError.notFoundError("Roadmap không tồn tại");

        roadmap.is_free = isFree;

        // Auto publish nếu set free
        if (isFree === true && roadmap.is_published === false) {
            roadmap.is_published = true;
        }

        await roadmap.save();

        return {
            _id: roadmap._id.toString(),
            title: roadmap.title,
            is_free: roadmap.is_free,
            is_published: roadmap.is_published
        };
    }

    // Add: GET public roadmaps list for students (pagination + basic filters)
    async getPublicRoadmaps(page: number, limit: number, filters: any) {
        const query: any = { is_published: true };

        // Search by title or description
        if (filters.search) {
            const regex = new RegExp(String(filters.search), "i");
            query.$or = [{ title: regex }, { description: regex }];
        }

        // Filter by skill group (single or array)
        if (filters.skill_group) {
            if (Array.isArray(filters.skill_group)) {
                query.skill_groups = { $in: filters.skill_group };
            } else {
                query.skill_groups = filters.skill_group;
            }
        }

        // Price range filters
        if (filters.min_price !== undefined || filters.max_price !== undefined) {
            query.price = {};
            if (filters.min_price !== undefined) query.price.$gte = Number(filters.min_price);
            if (filters.max_price !== undefined) query.price.$lte = Number(filters.max_price);
        }

        // Filter by is_free
        if (filters.is_free !== undefined) {
            query.is_free = filters.is_free === "true" || filters.is_free === true;
        }

        const [total, roadmaps] = await Promise.all([
            RoadmapModel.countDocuments(query),
            RoadmapModel.find(query)
                .select("_id title description thumbnail skill_groups target_score price discount_percentage is_free total_enrollments")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return {
            total,
            page,
            limit,
            data: roadmaps.map(r => ({
                ...r,
                _id: r._id.toString()
            }))
        };
    }

    /**
     * REORDER COURSES IN ROADMAP
     */
    async reorderCoursesInRoadmap(roadmapId: string, courseOrders: Array<{ course_id: string; order: number }>) {
        const roadmap = await RoadmapModel.findById(roadmapId);
        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        // Validate all course IDs exist in roadmap
        const courseIds = courseOrders.map(co => co.course_id);
        const existingCourseIds = roadmap.courses.map((id: any) => id.toString());
        
        for (const courseId of courseIds) {
            if (!existingCourseIds.includes(courseId)) {
                throw AppError.badRequestError(`Course ${courseId} không thuộc roadmap này`);
            }
        }

        // Sort by order and rebuild courses array
        const sortedOrders = courseOrders.sort((a, b) => a.order - b.order);
        roadmap.courses = sortedOrders.map(co => co.course_id as any);
        
        await roadmap.save();

        return {
            roadmap_id: roadmapId,
            courses: roadmap.courses,
            message: "Đã cập nhật thứ tự courses"
        };
    }
}

export default RoadmapService;
