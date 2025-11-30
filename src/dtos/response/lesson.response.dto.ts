import { Expose, Type } from "class-transformer";

export class LessonTeacherResDto {
    @Expose()
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    avatar?: string;
}

// POST /admin/lessons
export class CreateLessonResDto {
    @Expose()
    _id!: string;

    @Expose()
    course_id!: string;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    order!: number;

    @Expose()
    is_published!: boolean;

    @Expose()
    is_free!: boolean;

    @Expose()
    duration!: number;

    @Expose()
    total_sections!: number;

    @Expose()
    @Type(() => LessonTeacherResDto)
    created_by!: LessonTeacherResDto;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

// GET /admin/lessons (list item)
export class LessonListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    course_id!: string;

    @Expose()
    title!: string;

    @Expose()
    order!: number;

    @Expose()
    is_published!: boolean;

    @Expose()
    is_free!: boolean;

    @Expose()
    duration!: number;

    @Expose()
    total_sections!: number;

    @Expose()
    @Type(() => LessonTeacherResDto)
    created_by!: LessonTeacherResDto;
}

export class GetLessonListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    @Type(() => LessonListItemResDto)
    data!: LessonListItemResDto[];
}

// GET /admin/lessons/:id
export class GetLessonDetailResDto extends CreateLessonResDto {
    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

// PATCH /admin/lessons/:id
export class UpdateLessonResDto extends CreateLessonResDto { }

// DELETE /admin/lessons/:id
export class DeleteLessonResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;

    @Expose()
    deletedSections!: number; // ✅ Số sections đã xóa

    @Expose()
    deletedS3Files!: number; // ✅ Số files S3 đã xóa
}

// PATCH /admin/courses/:courseId/lessons/:lessonId/publish
export class TogglePublishLessonResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_published!: boolean;

    @Expose()
    course_published!: boolean;
}

// PATCH /admin/courses/:courseId/lessons/:lessonId/free
export class ToggleFreeLessonResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_free!: boolean;

    @Expose()
    is_published!: boolean;

    @Expose()
    course_free!: boolean; // ✅ THÊM để admin biết course state
}

// PATCH /admin/courses/:courseId/lessons/bulk-publish
export class BulkPublishLessonsResDto {
    @Expose()
    modifiedCount!: number;

    @Expose()
    lessonIds!: string[];

    @Expose()
    course_published!: boolean;
}

// PATCH /admin/courses/:courseId/lessons/bulk-free
export class BulkToggleFreeLessonsResDto {
    @Expose()
    modifiedCount!: number;

    @Expose()
    lessonIds!: string[];

    @Expose()
    is_free!: boolean;

    @Expose()
    course_free!: boolean;
}

// GET /admin/courses/:id/free-lessons
export class FreeLessonItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    order!: number;

    @Expose()
    duration!: number;

    @Expose()
    is_published!: boolean;
}

export class GetFreeLessonsResDto {
    @Expose()
    course_id!: string;

    @Expose()
    course_title!: string;

    @Expose()
    total_free_lessons!: number;

    @Expose()
    @Type(() => FreeLessonItemResDto)
    lessons!: FreeLessonItemResDto[];
}
