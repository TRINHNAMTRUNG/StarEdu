import { injectable } from "tsyringe";
import CourseModel from "../models/course.model";
import TeacherModel from "../models/teacher.model";
import EnrollmentModel from "../models/enrollment.model";
import LessonModel from "../models/lesson.model";
import SectionModel from "../models/section.model";
import RoadmapModel from "../models/roadmap.model";
import AppError from "../utils/AppError";
import s3Util, { S3Folder } from "../utils/s3.util";
import {
    CreateCourseReqDto,
    UpdateCourseReqDto,
    AssignTeachersReqDto
} from "../dtos/request/course.request.dto";

@injectable()
class CourseService {
    /**
     * Helper: Populate và transform course data
     */
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

    /**
     * Helper: Transform course data (convert ObjectId to string)
     */
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

    /**
     * API #1: CREATE COURSE (with thumbnail upload) + AUTO ADD TO ROADMAP
     */
    createCourse = async (dto: CreateCourseReqDto, thumbnailFile?: Express.Multer.File) => {
        let thumbnail_url: string | undefined;

        // ✅ BƯỚC 1: Validate roadmap exists
        const roadmap = await RoadmapModel.findById(dto.roadmap_id);
        if (!roadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        // Upload thumbnail nếu có
        if (thumbnailFile) {
            const validImageTypes = [".jpg", ".jpeg", ".png", ".webp"];
            if (!s3Util.validateFileType(thumbnailFile.originalname, validImageTypes)) {
                throw AppError.badRequestError("Thumbnail phải là định dạng JPG, PNG hoặc WEBP");
            }

            if (!s3Util.validateFileSize(thumbnailFile.size, 5)) { // Max 5MB
                throw AppError.badRequestError("Thumbnail không được vượt quá 5MB");
            }

            thumbnail_url = await s3Util.uploadFile(
                thumbnailFile.buffer,
                S3Folder.IMAGES,
                `course-${Date.now()}-${thumbnailFile.originalname}`,
                thumbnailFile.mimetype
            );
        }

        // compute order inside roadmap (append to end)
        const nextOrder = (roadmap.courses && roadmap.courses.length) ? roadmap.courses.length + 1 : 1;

        // Create course WITHOUT storing roadmap_id inside course document (model does not have roadmap ref)
        const { roadmap_id, ...courseData } = dto as any;
        const course = await CourseModel.create({
            ...courseData,
            thumbnail: thumbnail_url || dto.thumbnail,
            order: nextOrder,
            assigned_teachers: [],
            is_published: false,
            is_free: false,
            is_deleted: false,
            total_enrollments: 0,
            average_rating: 0,
            total_reviews: 0
        });

        // Add course._id into roadmap.courses (use $addToSet to avoid duplicates)
        await RoadmapModel.findByIdAndUpdate(
            dto.roadmap_id,
            { $addToSet: { courses: course._id } }
        );

        const result = await this.populateAndTransformCourse(course._id.toString());
        if (!result) {
            throw AppError.internalServerError("Tạo khóa học thất bại");
        }

        // include roadmap_id in response for client convenience
        return {
            ...result,
            roadmap_id: dto.roadmap_id
        };
    };

    /**
     * API #2: GET COURSE LIST
     */
    getCourseList = async (page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {};

        if (filters?.is_published !== undefined) {
            query.is_published = filters.is_published === "true";
        }

        if (filters?.is_free !== undefined) {
            query.is_free = filters.is_free === "true";
        }

        if (filters?.is_deleted !== undefined) {
            query.is_deleted = filters.is_deleted === "true";
        } else {
            query.is_deleted = false;
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

    /**
     * API #3: GET COURSE BY ID
     */
    getCourseById = async (id: string) => {
        const course = await this.populateAndTransformCourse(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        return course;
    };

    /**
     * API #4: UPDATE COURSE (with thumbnail upload)
     */
    updateCourse = async (
        id: string,
        dto: UpdateCourseReqDto,
        thumbnailFile?: Express.Multer.File,
        removeThumbnail?: boolean
    ) => {
        const course = await CourseModel.findById(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        const oldThumbnail = course.thumbnail;

        // Upload thumbnail mới nếu có
        if (thumbnailFile) {
            const validImageTypes = [".jpg", ".jpeg", ".png", ".webp"];
            if (!s3Util.validateFileType(thumbnailFile.originalname, validImageTypes)) {
                throw AppError.badRequestError("Thumbnail phải là định dạng JPG, PNG hoặc WEBP");
            }

            dto.thumbnail = await s3Util.uploadFile(
                thumbnailFile.buffer,
                S3Folder.IMAGES,
                `course-${Date.now()}-${thumbnailFile.originalname}`,
                thumbnailFile.mimetype
            );

            // Xóa thumbnail cũ
            if (oldThumbnail) {
                await s3Util.deleteFile(oldThumbnail);
            }
        }

        // Remove thumbnail nếu requested
        if (removeThumbnail && course.thumbnail) {
            await s3Util.deleteFile(course.thumbnail);
            dto.thumbnail = undefined;
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

    /**
     * API #5: SOFT DELETE COURSE + REMOVE FROM ALL ROADMAPS
     */
    deleteCourse = async (id: string) => {
        const course = await CourseModel.findById(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        // ✅ BƯỚC 1: Tìm roadmaps chứa course này
        const roadmapsWithCourse = await RoadmapModel.find({
            courses: id
        }).select("_id title").lean();

        if (roadmapsWithCourse.length > 0) {
            const roadmapIds = roadmapsWithCourse.map(r => r._id);
            const enrollmentCount = await EnrollmentModel.countDocuments({
                roadmap: { $in: roadmapIds }
            });

            if (enrollmentCount > 0) {
                throw AppError.conflictError(
                    `Không thể xóa khóa học vì có ${enrollmentCount} học viên đang học qua roadmaps: ${roadmapsWithCourse.map(r => r.title).join(", ")}`
                );
            }
        }

        // ✅ BƯỚC 2: XÓA course khỏi TẤT CẢ roadmaps
        await RoadmapModel.updateMany(
            { courses: id },
            { $pull: { courses: id } }
        );

        // ✅ BƯỚC 3: Kiểm tra roadmaps bị ảnh hưởng (trở thành empty)
        const emptyRoadmaps = await RoadmapModel.find({
            _id: { $in: roadmapsWithCourse.map(r => r._id) },
            courses: { $size: 0 },
            is_published: true
        }).select("_id title").lean();

        // Tự động unpublish roadmaps trống
        if (emptyRoadmaps.length > 0) {
            await RoadmapModel.updateMany(
                { _id: { $in: emptyRoadmaps.map(r => r._id) } },
                { $set: { is_published: false } }
            );

            console.warn(`Auto unpublished ${emptyRoadmaps.length} empty roadmaps:`,
                emptyRoadmaps.map(r => r.title));
        }

        // ✅ DELETE THUMBNAIL from S3
        if (course.thumbnail) {
            await s3Util.deleteFile(course.thumbnail);
        }

        // Soft delete course
        await CourseModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    is_published: false,
                    thumbnail: undefined
                }
            }
        );

        return {
            message: "Xóa khóa học thành công",
            deletedId: id,
            removedFromRoadmaps: roadmapsWithCourse.length,
            unpublishedRoadmaps: emptyRoadmaps.length
        };
    };

    /**
     * API #6: TOGGLE PUBLISH COURSE (with smart lesson validation)
     */
    togglePublishCourse = async (id: string) => {
        const course = await CourseModel.findById(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        if (!course.is_published) {
            // 1. Check course metadata
            if (!course.thumbnail) {
                throw AppError.badRequestError("Khóa học phải có thumbnail trước khi xuất bản");
            }
            if (!course.description) {
                throw AppError.badRequestError("Khóa học phải có mô tả trước khi xuất bản");
            }

            // 2. Get ALL lessons của course
            const lessons = await LessonModel.find({ course_id: id }).lean();

            if (lessons.length === 0) {
                throw AppError.badRequestError("Khóa học phải có ít nhất 1 bài học trước khi xuất bản");
            }

            // 3. Lấy ALL sections của course
            const lessonIds = lessons.map(l => l._id);
            const sections = await SectionModel.find({
                lesson_id: { $in: lessonIds }
            }).lean();

            // 4. VALIDATE từng lesson: chỉ publish lessons có sections hợp lệ
            const validLessonIds: string[] = [];
            const invalidLessons: Array<{ title: string; reason: string }> = [];

            for (const lesson of lessons) {
                // 4.1. Get sections của lesson này
                const lessonSections = sections.filter(s =>
                    s.lesson_id.toString() === lesson._id.toString()
                );

                // 4.2. Nếu lesson không có section nào → INVALID
                if (lessonSections.length === 0) {
                    invalidLessons.push({
                        title: lesson.title,
                        reason: "Chưa có section nào"
                    });
                    continue;
                }

                // 4.3. Validate TỪNG section có đầy đủ thông tin
                let hasInvalidSection = false;
                let invalidReason = "";

                for (const section of lessonSections) {
                    // Check required fields: lesson_id, title, order
                    if (!section.lesson_id || !section.title || section.order === undefined) {
                        hasInvalidSection = true;
                        invalidReason = `Section "${section.title || 'Untitled'}" thiếu thông tin cơ bản`;
                        break;
                    }

                    // Check phải có video_url HOẶC mindmap_url (ít nhất 1)
                    if (!section.video_url && !section.mindmap_url) {
                        hasInvalidSection = true;
                        invalidReason = `Section "${section.title}" chưa có video hoặc mindmap`;
                        break;
                    }

                    // Check description
                    if (!section.description || section.description.trim() === "") {
                        hasInvalidSection = true;
                        invalidReason = `Section "${section.title}" chưa có mô tả`;
                        break;
                    }
                }

                // 4.4. Nếu lesson có section invalid → SKIP
                if (hasInvalidSection) {
                    invalidLessons.push({
                        title: lesson.title,
                        reason: invalidReason
                    });
                    continue;
                }

                // 4.5. Lesson VALID → Thêm vào danh sách publish
                validLessonIds.push(lesson._id.toString());
            }

            // 5. Check phải có ít nhất 1 lesson valid để publish course
            if (validLessonIds.length === 0) {
                throw AppError.badRequestError(
                    `Không thể publish khóa học vì không có lesson nào đủ điều kiện. ` +
                    `Chi tiết: ${invalidLessons.map(l => `"${l.title}": ${l.reason}`).join("; ")}`
                );
            }

            // 6. AUTO PUBLISH các lessons VALID (chỉ publish lessons đủ điều kiện)
            await LessonModel.updateMany(
                { _id: { $in: validLessonIds } },
                { $set: { is_published: true } }
            );

            // 7. Set course publish = true
            course.is_published = true;
            await course.save();

            return {
                _id: course._id.toString(),
                title: course.title,
                is_published: course.is_published,
                published_lessons: validLessonIds.length,
                skipped_lessons: invalidLessons.length > 0 ? invalidLessons : undefined
            };
        }

        // ============================================
        // NẾU MUỐN UNPUBLISH COURSE → Check enrollments
        // ============================================
        if (course.is_published === true) {
            const roadmaps = await RoadmapModel.find({
                courses: id,
                is_published: true
            }).select("_id title").lean();

            const enrollmentCount = await EnrollmentModel.countDocuments({
                roadmap: { $in: roadmaps.map(r => r._id) }
            });

            if (enrollmentCount > 0) {
                throw AppError.conflictError(
                    `Không thể unpublish course vì có ${enrollmentCount} students đang học`
                );
            }

            // Auto unpublish TẤT CẢ lessons
            await LessonModel.updateMany(
                { course_id: id },
                { $set: { is_published: false } }
            );

            course.is_published = false;
            await course.save();

            return {
                _id: course._id.toString(),
                title: course.title,
                is_published: course.is_published
            };
        }

        // Không thay đổi gì (edge case)
        return {
            _id: course._id.toString(),
            title: course.title,
            is_published: course.is_published
        };
    };

    /**
     * API #7: ASSIGN TEACHERS TO COURSE
     */
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

    /**
     * API #8: GET COURSE STATISTICS
     * 
     * Logic đúng:
     * 1. Course KHÔNG được bán trực tiếp
     * 2. Course nằm trong Roadmap
     * 3. Student mua Roadmap (không mua Course)
     * 4. Doanh thu của Course = Tổng doanh thu của các Roadmaps chứa Course đó
     * 
     * Ví dụ:
     * - Course "IELTS Reading" nằm trong 3 roadmaps:
     *   + Roadmap A: 10 enrollments x 500k = 5,000k
     *   + Roadmap B: 5 enrollments x 800k = 4,000k
     *   + Roadmap C: 3 enrollments x 300k = 900k
     * → Total revenue của "IELTS Reading" = 9,900k
     *  
     * LƯU Ý: Doanh thu này là "attributed revenue" (doanh thu được gán),
     *           không phải doanh thu thực tế của course (vì course không bán).
     *           Nếu 1 roadmap có 3 courses, mỗi course sẽ được "gán" toàn bộ
     *           doanh thu của roadmap đó (không chia đều).
     */
    getCourseStatistics = async (id: string) => {
        // STEP 1: Get course info
        const course = await CourseModel.findById(id).lean();
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        // STEP 2: Tìm TẤT CẢ roadmaps chứa course này
        const roadmapsWithCourse = await RoadmapModel.find({
            courses: id
        }).select("_id").lean();

        const roadmapIds = roadmapsWithCourse.map(r => r._id);

        // STEP 3: Tính tổng doanh thu từ enrollments của các roadmaps đó
        const revenueResult = await EnrollmentModel.aggregate([
            {
                $match: {
                    roadmap: { $in: roadmapIds }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$enrolled_price" }
                }
            }
        ]);

        const total_revenue = revenueResult[0]?.total || 0;

        // STEP 4: Return statistics
        return {
            _id: course._id.toString(),
            title: course.title,
            total_enrollments: course.total_enrollments, // Từ Course document (counter)
            average_rating: course.average_rating,       // Từ Course document
            total_reviews: course.total_reviews,         // Từ Course document
            total_revenue,                               // Tính từ Enrollments của Roadmaps

            // ✅ OPTIONAL: Thêm metadata để Admin hiểu rõ
            _metadata: {
                total_roadmaps: roadmapsWithCourse.length,
                note: "Doanh thu này là tổng doanh thu của các roadmaps chứa course này"
            }
        };
    };

    /**
     * PHASE 3 - API #11: TOGGLE FREE COURSES (BATCH + SYNC LESSONS)
     * 
     * Logic đúng:
     * 1. Admin chọn 1 hoặc nhiều courses để set free/paid
     * 2. Update courses: set is_free
     * 3. ĐỒNG BỘ: set is_free cho TẤT CẢ lessons trong courses đó
     * 4. KHÔNG tự động publish (admin tự quyết định publish riêng)
     * 
     * Ví dụ:
     * - Admin chọn 3 courses để set free
     * - Hệ thống:
     *   + Set 3 courses.is_free = true
     *   + Set TẤT CẢ lessons trong 3 courses đó is_free = true
     *   + Không thay đổi is_published
     */
    async toggleFreeCourses(courseIds: string[], isFree: boolean) {
        // STEP 1: Validate courses exist
        const courses = await CourseModel.find({
            _id: { $in: courseIds }
        }).lean();

        if (courses.length !== courseIds.length) {
            throw AppError.notFoundError(
                `Một số courses không tồn tại. Found: ${courses.length}, Requested: ${courseIds.length}`
            );
        }

        // STEP 2: Update courses.is_free (KHÔNG update is_published)
        await CourseModel.updateMany(
            { _id: { $in: courseIds } },
            { $set: { is_free: isFree } }
        );

        // STEP 3: ĐỒNG BỘ: Update is_free cho TẤT CẢ lessons trong các courses
        const lessonUpdateResult = await LessonModel.updateMany(
            { course_id: { $in: courseIds } },
            { $set: { is_free: isFree } }
        );

        // STEP 4: Lấy thông tin chi tiết từng course (để response)
        const courseDetails = await Promise.all(
            courses.map(async (course) => {
                const lessonsCount = await LessonModel.countDocuments({
                    course_id: course._id
                });

                return {
                    _id: course._id.toString(),
                    title: course.title,
                    is_free: isFree,
                    lessons_synced: lessonsCount
                };
            })
        );

        return {
            modifiedCount: courses.length,
            course_ids: courseIds,
            is_free: isFree,
            total_lessons_synced: lessonUpdateResult.modifiedCount,
            courses: courseDetails
        };
    }

    /**
     * PHASE 3 - API #12: GET COURSE FULL
     */
    async getCourseFullStructure(id: string) {
        const course = await CourseModel.findById(id)
            .populate({
                path: "assigned_teachers",
                select: "user experience_years",
                populate: { path: "user", select: "name avatar" }
            })
            .lean();

        if (!course) throw AppError.notFoundError("Course không tồn tại");

        const lessons = await LessonModel.find({ course_id: id })
            .select("_id title order is_published is_free")
            .sort({ order: 1 })
            .lean();

        const lessonIds = lessons.map(l => l._id);

        const sections = await SectionModel.find({ lesson_id: { $in: lessonIds } })
            .select("_id lesson_id title order description")
            .sort({ order: 1 })
            .lean();

        const lessonsWithSections = lessons.map(lesson => ({
            _id: lesson._id.toString(),
            title: lesson.title,
            order: lesson.order,
            is_published: lesson.is_published,
            is_free: lesson.is_free,
            sections: sections
                .filter(s => s.lesson_id.toString() === lesson._id.toString())
                .map(s => ({
                    _id: s._id.toString(),
                    title: s.title,
                    order: s.order,
                    description: s.description || ""
                }))
        }));

        return {
            course: {
                ...course,
                _id: course._id.toString(),
                assigned_teachers: course.assigned_teachers.map((t: any) => ({
                    _id: t._id.toString(),
                    name: t.user?.name || "",
                    avatar: t.user?.avatar,
                    experience_years: t.experience_years
                }))
            },
            lessons: lessonsWithSections
        };
    }

    /**
     * API BỔ SUNG #1: RESTORE COURSE
     */
    restoreCourse = async (id: string) => {
        const course = await CourseModel.findById(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        if (!course.is_deleted) {
            throw AppError.badRequestError("Khóa học chưa bị xóa");
        }

        course.is_deleted = false;
        course.deleted_at = undefined;
        await course.save();

        return {
            _id: course._id.toString(),
            title: course.title,
            is_deleted: false,
            message: "Khôi phục khóa học thành công"
        };
    };

    /**
     * API BỔ SUNG #2: PERMANENT DELETE COURSE
     */
    permanentDeleteCourse = async (id: string) => {
        const course = await CourseModel.findById(id);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        if (!course.is_deleted) {
            throw AppError.badRequestError("Phải soft delete trước khi xóa vĩnh viễn");
        }

        // Check enrollments
        const roadmapsWithCourse = await RoadmapModel.find({ courses: id }).select("_id").lean();
        if (roadmapsWithCourse.length > 0) {
            const enrollmentCount = await EnrollmentModel.countDocuments({
                roadmap: { $in: roadmapsWithCourse.map(r => r._id) }
            });

            if (enrollmentCount > 0) {
                throw AppError.conflictError("Không thể xóa vĩnh viễn vì có học viên đã enroll");
            }
        }

        // Delete all lessons (cascade delete sections + S3)
        const lessons = await LessonModel.find({ course_id: id }).lean();
        let totalSections = 0;
        let totalS3Files = 0;

        for (const lesson of lessons) {
            const sections = await SectionModel.find({ lesson_id: lesson._id }).lean();
            totalSections += sections.length;

            // Collect S3 files
            const s3Files: string[] = [];
            for (const section of sections) {
                if (section.video_url) s3Files.push(section.video_url);
                if (section.mindmap_url) s3Files.push(section.mindmap_url);
            }

            if (s3Files.length > 0) {
                await s3Util.deleteMultipleFiles(s3Files);
                totalS3Files += s3Files.length;
            }

            await SectionModel.deleteMany({ lesson_id: lesson._id });
        }

        await LessonModel.deleteMany({ course_id: id });

        // Delete course thumbnail
        if (course.thumbnail) {
            await s3Util.deleteFile(course.thumbnail);
            totalS3Files++;
        }

        // Delete course
        await CourseModel.findByIdAndDelete(id);

        return {
            message: "Xóa vĩnh viễn khóa học thành công",
            deletedId: id,
            deletedLessons: lessons.length,
            deletedSections: totalSections,
            deletedS3Files: totalS3Files
        };
    };

    /**
     * API BỔ SUNG #3: CLONE COURSE
     */
    cloneCourse = async (id: string, newTitle: string) => {
        const originalCourse = await CourseModel.findById(id).lean();
        if (!originalCourse) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        // Create cloned course
        const clonedCourse = await CourseModel.create({
            title: newTitle,
            description: originalCourse.description,
            thumbnail: originalCourse.thumbnail,
            skill_groups: originalCourse.skill_groups,
            assigned_teachers: [],
            is_published: false,
            is_free: false,
            is_deleted: false,
            total_enrollments: 0,
            average_rating: 0,
            total_reviews: 0
        });

        const result = await this.populateAndTransformCourse(clonedCourse._id.toString());
        if (!result) {
            throw AppError.internalServerError("Nhân bản khóa học thất bại");
        }

        return result;
    };

    /**
     * API BỔ SUNG #4: REORDER LESSONS
     */
    reorderLessons = async (courseId: string, lessonOrders: { lesson_id: string; order: number }[]) => {
        const course = await CourseModel.findById(courseId);
        if (!course) {
            throw AppError.notFoundError("Khóa học không tồn tại");
        }

        // Validate all lessons belong to this course
        const lessonIds = lessonOrders.map(lo => lo.lesson_id);
        const lessons = await LessonModel.find({
            _id: { $in: lessonIds },
            course_id: courseId
        }).lean();

        if (lessons.length !== lessonIds.length) {
            throw AppError.badRequestError("Một số lessons không thuộc course này");
        }

        // Update lesson orders
        let updatedCount = 0;
        for (const { lesson_id, order } of lessonOrders) {
            const result = await LessonModel.findByIdAndUpdate(
                lesson_id,
                { $set: { order } },
                { new: true }
            );
            if (result) updatedCount++;
        }

        return {
            message: "Sắp xếp lại lessons thành công",
            courseId: courseId,
            updatedCount
        };
    };

    /**
     * API BỔ SUNG #5: BULK DELETE COURSES
     */
    bulkDeleteCourses = async (courseIds: string[]) => {
        const deletedIds: string[] = [];
        const failedIds: string[] = [];

        for (const id of courseIds) {
            try {
                await this.deleteCourse(id); // Dùng soft delete
                deletedIds.push(id);
            } catch (error) {
                failedIds.push(id);
                console.error(`Failed to delete course ${id}:`, error);
            }
        }

        return {
            message: "Xóa hàng loạt khóa học hoàn tất",
            totalRequested: courseIds.length,
            deletedCount: deletedIds.length,
            failedCount: failedIds.length,
            deletedIds,
            failedIds
        };
    };

    /**
     * MỚI: GET AVAILABLE COURSES FOR ROADMAP (courses chưa có trong roadmap target)
     */
    async getAvailableCoursesForRoadmap(
        targetRoadmapId: string,
        page: number = 1,
        limit: number = 20,
        search?: string
    ) {
        // Validate target roadmap exists
        const targetRoadmap = await RoadmapModel.findById(targetRoadmapId).lean();
        if (!targetRoadmap) {
            throw AppError.notFoundError("Roadmap không tồn tại");
        }

        // Existing course ids in target roadmap
        const existingCourseIds = (targetRoadmap.courses || []).map((c: any) => c.toString());

        // Build query: exclude courses already in target roadmap, exclude deleted
        const query: any = { is_deleted: false };
        if (existingCourseIds.length > 0) {
            query._id = { $nin: existingCourseIds };
        }

        if (search && typeof search === "string" && search.trim().length > 0) {
            query.title = { $regex: search.trim(), $options: "i" };
        }

        const [total, courses] = await Promise.all([
            CourseModel.countDocuments(query),
            CourseModel.find(query)
                .select("_id title thumbnail skill_groups is_published is_free")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        // For each course, gather roadmaps that currently contain it (title only)
        const coursesWithRoadmaps = await Promise.all(
            courses.map(async (course: any) => {
                const roadmapsContainingCourse = await RoadmapModel.find(
                    { courses: course._id },
                    "title"
                ).lean();

                return {
                    _id: course._id.toString(),
                    title: course.title,
                    thumbnail: course.thumbnail,
                    skill_groups: course.skill_groups || [],
                    is_published: course.is_published,
                    is_free: course.is_free,
                    current_roadmaps: roadmapsContainingCourse.map((r: any) => r.title)
                };
            })
        );

        return {
            total,
            page,
            limit,
            target_roadmap_id: targetRoadmapId,
            courses: coursesWithRoadmaps
        };
    }
}

export default CourseService;