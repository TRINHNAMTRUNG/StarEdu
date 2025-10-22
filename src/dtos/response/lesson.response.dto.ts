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
    duration_minutes!: number;

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
    duration_minutes!: number;

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
export class GetLessonDetailResDto extends CreateLessonResDto {}

// PATCH /admin/lessons/:id
export class UpdateLessonResDto extends CreateLessonResDto {}

// DELETE /admin/lessons/:id
export class DeleteLessonResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;
}
