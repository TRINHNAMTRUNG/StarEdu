import { Expose, Type } from "class-transformer";

// GET /student/roadmaps (list item)
export class StudentRoadmapListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    skill_groups!: string[];

    @Expose()
    target_score!: number;

    @Expose()
    price!: number;

    @Expose()
    discount_percentage!: number;

    @Expose()
    final_price!: number;

    @Expose()
    total_courses!: number;

    @Expose()
    total_enrollments!: number;
}

export class GetStudentRoadmapListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    @Type(() => StudentRoadmapListItemResDto)
    data!: StudentRoadmapListItemResDto[];
}

// GET /student/roadmaps/:id
export class CertificationInfoResDto {
    @Expose()
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    type!: string;
}

export class StudentRoadmapTeacherResDto {
    @Expose()
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    avatar?: string;

    @Expose()
    experience_years!: number;
}

export class StudentRoadmapCourseResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    thumbnail?: string;

    @Expose()
    skill_groups!: string[];

    @Expose()
    @Type(() => StudentRoadmapTeacherResDto)
    assigned_teachers!: StudentRoadmapTeacherResDto[];
}

export class GetStudentRoadmapDetailResDto {
    @Expose()
    _id!: string;

    @Expose()
    @Type(() => CertificationInfoResDto)
    certification!: CertificationInfoResDto;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    skill_groups!: string[];

    @Expose()
    target_score!: number;

    @Expose()
    price!: number;

    @Expose()
    discount_percentage!: number;

    @Expose()
    final_price!: number;

    @Expose()
    total_courses!: number;

    @Expose()
    @Type(() => StudentRoadmapCourseResDto)
    courses!: StudentRoadmapCourseResDto[];

    @Expose()
    total_enrollments!: number;
}
