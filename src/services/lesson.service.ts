import { injectable } from "tsyringe";
import LessonModel from "../models/lesson.model";
import CourseModel from "../models/course.model";
import RoadmapModel from "../models/roadmap.model";
import EnrollmentModel from "../models/enrollment.model";
import SectionModel from "../models/section.model";
import AppError from "../utils/AppError";
import { CreateLessonReqDto, UpdateLessonReqDto } from "../dtos/request/lesson.request.dto";
import s3Util, { S3Folder } from "../utils/s3.util";

@injectable()
class LessonService {
    /**
     * API #1: CREATE LESSON
     */
    async createLesson(dto: CreateLessonReqDto) {
        // Validate course exists
        const course = await CourseModel.findById(dto.course_id);
        if (!course) {
            throw AppError.notFoundError("Course không tồn tại");
        }

        // Create lesson
        const lesson = await LessonModel.create({
            ...dto,
            is_published: false,
            is_free: false
        });

        return {
            ...lesson.toObject(),
            _id: lesson._id.toString(),
            course_id: lesson.course_id.toString()
        };
    }

    /**
     * API #2: GET LESSON LIST
     */
    async getLessonList(page: number, limit: number, filters: any) {
        const query: any = {};

        if (filters.course_id) {
            query.course_id = filters.course_id;
        }

        if (filters.is_published !== undefined) {
            query.is_published = filters.is_published === "true";
        }

        if (filters.is_free !== undefined) {
            query.is_free = filters.is_free === "true";
        }

        const [total, lessons] = await Promise.all([
            LessonModel.countDocuments(query),
            LessonModel.find(query)
                .sort({ order: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return {
            total,
            page,
            limit,
            data: lessons.map(l => ({
                ...l,
                _id: l._id.toString(),
                course_id: l.course_id.toString()
            }))
        };
    }

    /**
     * API #3: GET LESSON BY ID
     */
    async getLessonById(id: string) {
        const lesson = await LessonModel.findById(id).lean();

        if (!lesson) {
            throw AppError.notFoundError("Lesson không tồn tại");
        }

        return {
            ...lesson,
            _id: lesson._id.toString(),
            course_id: lesson.course_id.toString()
        };
    }

    /**
     * API #4: UPDATE LESSON
     */
    async updateLesson(id: string, dto: UpdateLessonReqDto) {
        const lesson = await LessonModel.findById(id);

        if (!lesson) {
            throw AppError.notFoundError("Lesson không tồn tại");
        }

        Object.assign(lesson, dto);
        await lesson.save();

        return {
            ...lesson.toObject(),
            _id: lesson._id.toString(),
            course_id: lesson.course_id.toString()
        };
    }

    /**
     * API #5: DELETE LESSON (CASCADE + S3 CLEANUP)
     * 
     * Logic đầy đủ:
     * 1. Validate lesson exists
     * 2. Lấy tất cả sections của lesson
     * 3. Xóa files trên S3 (video_url, mindmap_url của từng section)
     * 4. Xóa tất cả sections
     * 5. Xóa lesson
     * 6. Sync course state (nếu không còn lesson published → unpublish course)
     */
    async deleteLesson(id: string) {
        // STEP 1: Validate lesson exists
        const lesson = await LessonModel.findById(id).lean();
        if (!lesson) {
            throw AppError.notFoundError("Lesson không tồn tại");
        }

        // STEP 2: Lấy tất cả sections của lesson
        const sections = await SectionModel.find({ lesson_id: id }).lean();

        // STEP 3: Xóa files trên S3 (nếu có)
        const s3FilesToDelete: string[] = [];

        for (const section of sections) {
            if (section.video_url) s3FilesToDelete.push(section.video_url);
            if (section.mindmap_url) s3FilesToDelete.push(section.mindmap_url);
        }

        // Delete files từ S3 (batch delete)
        if (s3FilesToDelete.length > 0) {
            await s3Util.deleteMultipleFiles(s3FilesToDelete);
        }

        // STEP 4: Xóa tất cả sections
        await SectionModel.deleteMany({ lesson_id: id });

        // STEP 5: Xóa lesson
        await LessonModel.findByIdAndDelete(id);

        // STEP 6: Sync course state
        const course = await CourseModel.findById(lesson.course_id);
        if (course) {
            // Check còn lesson nào published không
            const publishedLessonsCount = await LessonModel.countDocuments({
                course_id: lesson.course_id,
                is_published: true
            });

            // Nếu không còn published lesson → unpublish course
            if (publishedLessonsCount === 0 && course.is_published === true) {
                course.is_published = false;
                await course.save();
            }

            // Check còn free lesson nào không
            const freeLessonsCount = await LessonModel.countDocuments({
                course_id: lesson.course_id,
                is_free: true
            });

            // Nếu không còn free lesson → course không free
            if (freeLessonsCount === 0 && course.is_free === true) {
                course.is_free = false;
                await course.save();
            }
        }

        return {
            message: "Xóa lesson thành công",
            deletedId: id,
            deletedSections: sections.length,
            deletedS3Files: s3FilesToDelete.length
        };
    }

    /**
     * HELPER: Xóa files từ S3
     * @param fileUrls - Mảng URLs hoặc S3 keys
     */
    private async deleteFilesFromS3(fileUrls: string[]): Promise<void> {
        try {
            const { S3Client, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
            const { ENV } = await import("../config/environment");

            const s3Client = new S3Client({
                region: ENV.AWS_S3_REGION,
                credentials: {
                    accessKeyId: ENV.AWS_ACCESS_KEY_ID,
                    secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY
                }
            });

            // Extract S3 keys từ URLs
            const keys = fileUrls.map(url => {
                if (url.startsWith("http")) {
                    // Extract key từ URL: https://bucket.s3.region.amazonaws.com/key
                    const urlObj = new URL(url);
                    return urlObj.pathname.substring(1); // Bỏ dấu '/' đầu
                }
                return url; // Nếu đã là key
            });

            // Batch delete (S3 cho phép delete tối đa 1000 objects/request)
            const batchSize = 1000;
            for (let i = 0; i < keys.length; i += batchSize) {
                const batch = keys.slice(i, i + batchSize);

                const command = new DeleteObjectsCommand({
                    Bucket: ENV.AWS_S3_BUCKET_NAME,
                    Delete: {
                        Objects: batch.map(key => ({ Key: key })),
                        Quiet: true // Không trả về list deleted objects
                    }
                });

                await s3Client.send(command);
            }

            console.log(`✅ Deleted ${keys.length} files from S3`);
        } catch (error) {
            console.error("❌ Error deleting files from S3:", error);
            // KHÔNG throw error - vì đã xóa DB, chỉ log warning
            // Có thể schedule cleanup job sau
        }
    }

    /**
     * PHASE 2 - API #6: TOGGLE PUBLISH LESSON (FIX - CHECK SECTIONS VALIDITY)
     * 
     * Logic cải thiện:
     * 1. Validate lesson có sections hợp lệ (giống course logic)
     * 2. Check enrollments nếu unpublish paid lesson
     * 3. Toggle lesson.is_published
     * 4. KHÔNG tự động publish course (admin quyết định riêng)
     * 5. Nếu tất cả lessons unpublished → auto unpublish course
     */
    async togglePublishLesson(courseId: string, lessonId: string) {
        const [lesson, course] = await Promise.all([
            LessonModel.findById(lessonId),
            CourseModel.findById(courseId)
        ]);

        if (!lesson) throw AppError.notFoundError("Lesson không tồn tại");
        if (!course) throw AppError.notFoundError("Course không tồn tại");
        if (lesson.course_id.toString() !== courseId) {
            throw AppError.badRequestError("Lesson không thuộc course này");
        }

        // ============================================
        // NẾU MUỐN PUBLISH → VALIDATE SECTIONS
        // ============================================
        if (!lesson.is_published) {
            const sections = await SectionModel.find({ lesson_id: lessonId }).lean();

            if (sections.length === 0) {
                throw AppError.badRequestError("Lesson phải có ít nhất 1 section trước khi publish");
            }

            // Validate từng section (giống logic course)
            for (const section of sections) {
                if (!section.lesson_id || !section.title || section.order === undefined) {
                    throw AppError.badRequestError(
                        `Section "${section.title || 'Untitled'}" thiếu thông tin cơ bản`
                    );
                }

                if (!section.video_url && !section.mindmap_url) {
                    throw AppError.badRequestError(
                        `Section "${section.title}" chưa có video hoặc mindmap`
                    );
                }

                if (!section.description || section.description.trim() === "") {
                    throw AppError.badRequestError(
                        `Section "${section.title}" chưa có mô tả`
                    );
                }
            }
        }

        // ============================================
        // NẾU MUỐN UNPUBLISH → CHECK ENROLLMENTS
        // ============================================
        if (lesson.is_published === true && lesson.is_free === false) {
            const roadmaps = await RoadmapModel.find({
                courses: courseId,
                is_published: true
            }).select("_id").lean();

            const enrollmentCount = await EnrollmentModel.countDocuments({
                roadmap: { $in: roadmaps.map(r => r._id) }
            });

            if (enrollmentCount > 0) {
                throw AppError.conflictError(
                    `Không thể unpublish paid lesson vì có ${enrollmentCount} students đang học`
                );
            }
        }

        // ============================================
        // TOGGLE LESSON
        // ============================================
        lesson.is_published = !lesson.is_published;
        await lesson.save();

        // ============================================
        // SYNC COURSE STATE (chỉ unpublish, không auto publish)
        // ============================================
        if (lesson.is_published === false) {
            const publishedCount = await LessonModel.countDocuments({
                course_id: courseId,
                is_published: true
            });

            // Nếu không còn lesson nào published → auto unpublish course
            if (publishedCount === 0 && course.is_published === true) {
                course.is_published = false;
                await course.save();
            }
        }

        return {
            _id: lesson._id.toString(),
            title: lesson.title,
            is_published: lesson.is_published,
            course_published: course.is_published
        };
    }

    /**
     * PHASE 2 - API #7: BULK PUBLISH LESSONS (FIX - VALIDATE SECTIONS)
     */
    async bulkPublishLessons(courseId: string, lessonIds: string[], isPublished: boolean) {
        const course = await CourseModel.findById(courseId);
        if (!course) throw AppError.notFoundError("Course không tồn tại");

        const lessons = await LessonModel.find({
            _id: { $in: lessonIds },
            course_id: courseId
        }).lean();

        if (lessons.length !== lessonIds.length) {
            throw AppError.badRequestError("Một số lessons không thuộc course này");
        }

        // ✅ FIX: Validate sections nếu muốn PUBLISH
        if (isPublished === true) {
            const lessonIdsArray = lessons.map(l => l._id);
            const sections = await SectionModel.find({
                lesson_id: { $in: lessonIdsArray }
            }).lean();

            // Group sections by lesson
            const sectionsByLesson = new Map<string, any[]>();
            sections.forEach(section => {
                const lessonId = section.lesson_id.toString();
                if (!sectionsByLesson.has(lessonId)) {
                    sectionsByLesson.set(lessonId, []);
                }
                sectionsByLesson.get(lessonId)!.push(section);
            });

            // Validate từng lesson
            const invalidLessons: string[] = [];

            for (const lesson of lessons) {
                const lessonSections = sectionsByLesson.get(lesson._id.toString()) || [];

                // Check có sections
                if (lessonSections.length === 0) {
                    invalidLessons.push(`"${lesson.title}": Chưa có section`);
                    continue;
                }

                // Validate từng section
                for (const section of lessonSections) {
                    if (!section.lesson_id || !section.title || section.order === undefined) {
                        invalidLessons.push(`"${lesson.title}": Section "${section.title || 'Untitled'}" thiếu thông tin cơ bản`);
                        break;
                    }

                    if (!section.video_url && !section.mindmap_url) {
                        invalidLessons.push(`"${lesson.title}": Section "${section.title}" chưa có video hoặc mindmap`);
                        break;
                    }

                    if (!section.description || section.description.trim() === "") {
                        invalidLessons.push(`"${lesson.title}": Section "${section.title}" chưa có mô tả`);
                        break;
                    }
                }
            }

            if (invalidLessons.length > 0) {
                throw AppError.badRequestError(
                    `Không thể publish lessons: ${invalidLessons.join("; ")}`
                );
            }
        }

        // Check paid lessons khi unpublish
        if (isPublished === false) {
            const paidLessons = lessons.filter(l => l.is_free === false);

            if (paidLessons.length > 0) {
                const roadmaps = await RoadmapModel.find({
                    courses: courseId,
                    is_published: true
                }).select("_id").lean();

                const enrollmentCount = await EnrollmentModel.countDocuments({
                    roadmap: { $in: roadmaps.map(r => r._id) }
                });

                if (enrollmentCount > 0) {
                    throw AppError.conflictError(
                        `Không thể unpublish paid lessons vì có ${enrollmentCount} students đang học`
                    );
                }
            }
        }

        const updateResult = await LessonModel.updateMany(
            { _id: { $in: lessonIds } },
            { $set: { is_published: isPublished } }
        );

        // Sync course state
        if (isPublished === false) {
            const remainingPublished = await LessonModel.countDocuments({
                course_id: courseId,
                is_published: true
            });

            if (remainingPublished === 0 && course.is_published === true) {
                course.is_published = false;
                await course.save();
            }
        }

        return {
            modifiedCount: updateResult.modifiedCount,
            lessonIds,
            course_published: course.is_published
        };
    }

    /**
     * PHASE 2 - API #8: TOGGLE FREE LESSON (FIX - SYNC COURSE)
     * 
     * Logic cải thiện:
     * 1. Toggle lesson.is_free
     * 2. KHÔNG tự động publish (admin quyết định riêng)
     * 3. Sync course.is_free (nếu không còn free lesson → course không free)
     */
    async toggleFreeLesson(courseId: string, lessonId: string, isFree: boolean) {
        const [lesson, course] = await Promise.all([
            LessonModel.findById(lessonId),
            CourseModel.findById(courseId)
        ]);

        if (!lesson) throw AppError.notFoundError("Lesson không tồn tại");
        if (!course) throw AppError.notFoundError("Course không tồn tại");
        if (lesson.course_id.toString() !== courseId) {
            throw AppError.badRequestError("Lesson không thuộc course này");
        }

        lesson.is_free = isFree;
        await lesson.save();

        // SYNC COURSE.IS_FREE
        const freeLessonsCount = await LessonModel.countDocuments({
            course_id: courseId,
            is_free: true
        });

        if (freeLessonsCount === 0 && course.is_free === true) {
            course.is_free = false;
            await course.save();
        }

        return {
            _id: lesson._id.toString(),
            title: lesson.title,
            is_free: lesson.is_free,
            is_published: lesson.is_published,
            course_free: course.is_free // ✅ Thêm để admin biết course state
        };
    }

    /**
     * PHASE 2 - API #9: GET FREE LESSONS
     */
    async getFreeLessons(courseId: string) {
        const course = await CourseModel.findById(courseId).lean();
        if (!course) throw AppError.notFoundError("Course không tồn tại");

        const lessons = await LessonModel.find({
            course_id: courseId,
            is_free: true
        })
            .select("_id title order duration is_published")
            .sort({ order: 1 })
            .lean();

        return {
            course_id: course._id.toString(),
            course_title: course.title,
            total_free_lessons: lessons.length,
            lessons: lessons.map(l => ({
                _id: l._id.toString(),
                title: l.title,
                order: l.order,
                duration: l.duration,
                is_published: l.is_published
            }))
        };
    }

    /**
     * API MỚI: BULK TOGGLE FREE LESSONS
     * 
     * Logic:
     * 1. Admin chọn nhiều lessons để set free/paid
     * 2. Toggle lessons
     * 3. Sync course.is_free
     */
    async bulkToggleFreeLessons(courseId: string, lessonIds: string[], isFree: boolean) {
        const course = await CourseModel.findById(courseId);
        if (!course) throw AppError.notFoundError("Course không tồn tại");

        const lessons = await LessonModel.find({
            _id: { $in: lessonIds },
            course_id: courseId
        }).lean();

        if (lessons.length !== lessonIds.length) {
            throw AppError.badRequestError("Một số lessons không thuộc course này");
        }

        const updateResult = await LessonModel.updateMany(
            { _id: { $in: lessonIds } },
            { $set: { is_free: isFree } }
        );

        // SYNC COURSE.IS_FREE
        const freeLessonsCount = await LessonModel.countDocuments({
            course_id: courseId,
            is_free: true
        });

        if (freeLessonsCount === 0 && course.is_free === true) {
            course.is_free = false;
            await course.save();
        }

        return {
            modifiedCount: updateResult.modifiedCount,
            lessonIds,
            is_free: isFree,
            course_free: course.is_free
        };
    }

    // Add: trả về danh sách sections cho một lesson (dùng bởi LessonController.getLessonSections)
    async getLessonSections(lessonId: string) {
        // kiểm tra lesson tồn tại (LessonModel import/định nghĩa có thể đã có trong file)
        const lesson = await LessonModel.findById(lessonId).lean();
        if (!lesson) throw AppError.notFoundError("Lesson không tồn tại");

        const sections = await SectionModel.find({ lesson_id: lessonId })
            .sort({ order: 1 })
            .lean();

        return sections.map(s => ({
            _id: s._id.toString(),
            title: s.title,
            order: s.order,
            type: s.type,
            description: s.description || "",
            duration_minutes: s.duration_minutes,
            video_url: s.video_url,
            article_content: s.article_content,
            mindmap_url: s.mindmap_url,
            test_id: s.test_id ? s.test_id.toString() : undefined,
            questions: s.questions || []
        }));
    }
}

export default LessonService;
