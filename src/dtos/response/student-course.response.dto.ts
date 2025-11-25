import { Expose, Type } from "class-transformer";

export class StudentCourseTeacherResDto {
    @Expose()
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    avatar?: string;

    @Expose()
    experience_years!: number;
}

// GET /student/courses (list item)
export class StudentCourseListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    thumbnail?: string;

    @Expose()
    skill_groups!: string[];

    @Expose()
    average_rating!: number;

    @Expose()
    total_enrollments!: number;

    @Expose()
    @Type(() => StudentCourseTeacherResDto)
    assigned_teachers!: StudentCourseTeacherResDto[];
}

export class GetStudentCourseListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    @Type(() => StudentCourseListItemResDto)
    data!: StudentCourseListItemResDto[];
}

// GET /student/courses/:id
export class GetStudentCourseDetailResDto {
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
    average_rating!: number;

    @Expose()
    total_enrollments!: number;

    @Expose()
    total_reviews!: number;

    @Expose()
    total_lessons!: number;

    @Expose()
    total_sections!: number;

    @Expose()
    @Type(() => StudentCourseTeacherResDto)
    assigned_teachers!: StudentCourseTeacherResDto[];
}

// GET /student/courses/enrolled
export class EnrolledRoadmapInfoResDto {
    @Expose()
    roadmap_id!: string;

    @Expose()
    roadmap_title!: string;
}

export class StudentEnrolledCourseResDto extends StudentCourseListItemResDto {
    @Expose()
    @Type(() => EnrolledRoadmapInfoResDto)
    enrolled_via_roadmaps!: EnrolledRoadmapInfoResDto[];
}

export class GetStudentEnrolledCoursesResDto {
    @Expose()
    @Type(() => StudentEnrolledCourseResDto)
    data!: StudentEnrolledCourseResDto[];
}
