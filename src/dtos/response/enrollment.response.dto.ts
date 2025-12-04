import { Expose, Type } from "class-transformer";

// Roadmap info trong enrollment
class EnrollmentRoadmapResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    thumbnail?: string;

    @Expose()
    target_level!: string;

    @Expose()
    price!: number;

    @Expose()
    discount_percentage!: number;

    @Expose()
    total_courses!: number;

    @Expose()
    estimated_duration_weeks?: number;
}

// GET /student/enrollments/:id
export class GetEnrollmentDetailResDto {
    @Expose()
    _id!: string;

    @Expose()
    @Type(() => EnrollmentRoadmapResDto)
    roadmap!: EnrollmentRoadmapResDto;

    @Expose()
    enrolled_price!: number;

    @Expose()
    enrollment_date!: Date; // ✅ Frontend dùng enrollment_date

    @Expose()
    completion_percentage!: number;

    @Expose()
    last_accessed!: Date;

    @Expose()
    certificate_id?: string;

    @Expose()
    createdAt!: Date;
}

// GET /student/enrollments (list item)
export class EnrollmentListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    @Type(() => EnrollmentRoadmapResDto)
    roadmap!: EnrollmentRoadmapResDto;

    @Expose()
    enrolled_price!: number;

    @Expose()
    enrollment_date!: Date; // ✅ Frontend dùng enrollment_date

    @Expose()
    completion_percentage!: number;

    @Expose()
    last_accessed!: Date;
}

export class GetEnrollmentListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    data!: EnrollmentListItemResDto[];
}
