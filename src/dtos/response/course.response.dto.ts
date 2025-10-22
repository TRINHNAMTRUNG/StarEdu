import { Expose, Type } from "class-transformer";

// Teacher info trong course
export class CourseTeacherResDto {
    @Expose()
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    avatar?: string;

    @Expose()
    experience_years!: number;
}

export class ModificationHistoryItemResDto {
    @Expose()
    modified_by!: string;

    @Expose()
    modified_at!: Date;

    @Expose()
    reason?: string;
}

// POST /admin/courses
export class CreateCourseResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    thumbnail?: string;

    @Expose()
    skill_groups!: string[];

    @Expose()
    is_published!: boolean;

    @Expose()
    isModifiable!: boolean;

    @Expose()
    @Type(() => CourseTeacherResDto)
    assigned_teachers!: CourseTeacherResDto[];
}

// GET /admin/courses (list item)
export class CourseListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    thumbnail?: string;

    @Expose()
    is_published!: boolean;

    @Expose()
    isModifiable!: boolean;

    @Expose()
    total_enrollments!: number;

    @Expose()
    average_rating!: number;

    @Expose()
    @Type(() => CourseTeacherResDto)
    assigned_teachers!: CourseTeacherResDto[];
}

export class GetCourseListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    @Type(() => CourseListItemResDto)
    data!: CourseListItemResDto[];
}

// GET /admin/courses/:id
export class GetCourseDetailResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    thumbnail?: string;

    @Expose()
    skill_groups!: string[];

    @Expose()
    is_published!: boolean;

    @Expose()
    isModifiable!: boolean;

    @Expose()
    total_enrollments!: number;

    @Expose()
    average_rating!: number;

    @Expose()
    total_reviews!: number;

    @Expose()
    @Type(() => CourseTeacherResDto)
    assigned_teachers!: CourseTeacherResDto[];

    @Expose()
    last_modified_at?: Date;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

// PATCH /admin/courses/:id
export class UpdateCourseResDto extends CreateCourseResDto {}

// DELETE /admin/courses/:id
export class DeleteCourseResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;
}

// PATCH /admin/courses/:id/publish
export class PublishCourseResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_published!: boolean;
}

// PATCH /admin/courses/:id/instructors
export class AssignTeachersResDto extends CreateCourseResDto {}

// GET /admin/courses/:id/statistics
export class CourseStatisticsResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    total_enrollments!: number;

    @Expose()
    average_rating!: number;

    @Expose()
    total_reviews!: number;

    @Expose()
    total_revenue!: number;
}

// PATCH /admin/courses/:id/modifiable
export class ToggleModifiableResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    isModifiable!: boolean;

    @Expose()
    last_modified_by?: string;

    @Expose()
    last_modified_at?: Date;
}

// GET /admin/courses/:id/modification-history
export class GetModificationHistoryResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    @Type(() => ModificationHistoryItemResDto)
    modification_history!: ModificationHistoryItemResDto[];
}
