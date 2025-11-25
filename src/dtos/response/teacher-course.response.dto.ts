import { Expose, Type } from "class-transformer";

export class TeacherCourseTeacherResDto {
    @Expose()
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    avatar?: string;

    @Expose()
    experience_years!: number;
}

// GET /teacher/courses (list item)
export class TeacherCourseListItemResDto {
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
    @Type(() => TeacherCourseTeacherResDto)
    assigned_teachers!: TeacherCourseTeacherResDto[];
}

export class GetTeacherCourseListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    @Type(() => TeacherCourseListItemResDto)
    data!: TeacherCourseListItemResDto[];
}

// GET /teacher/courses/:id
export class GetTeacherCourseDetailResDto {
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
    @Type(() => TeacherCourseTeacherResDto)
    assigned_teachers!: TeacherCourseTeacherResDto[];

    @Expose()
    last_modified_at?: Date;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

export class UpdateTeacherCourseResDto extends GetTeacherCourseDetailResDto {}

// GET /teacher/courses/:id/lessons
export class TeacherCourseLessonResDto {
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
}

export class GetTeacherCourseLessonsResDto {
    @Expose()
    @Type(() => TeacherCourseLessonResDto)
    data!: TeacherCourseLessonResDto[];
}

// GET /teacher/courses/:id/statistics
export class TeacherCourseStatisticsResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    total_lessons!: number;

    @Expose()
    total_sections!: number;

    @Expose()
    total_enrollments!: number;

    @Expose()
    average_rating!: number;

    @Expose()
    total_revenue!: number;
}

// GET /teacher/dashboard/courses
export class TeacherDashboardCourseItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_published!: boolean;

    @Expose()
    isModifiable!: boolean;

    @Expose()
    total_enrollments!: number;

    @Expose()
    average_rating!: number;
}

export class GetTeacherDashboardResDto {
    @Expose()
    total_courses!: number;

    @Expose()
    published_courses!: number;

    @Expose()
    draft_courses!: number;

    @Expose()
    modifiable_courses!: number;

    @Expose()
    @Type(() => TeacherDashboardCourseItemResDto)
    courses!: TeacherDashboardCourseItemResDto[];
}
