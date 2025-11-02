import { Expose, Type } from "class-transformer";

// Course info trong roadmap
export class RoadmapCourseResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    thumbnail?: string;

    @Expose()
    skill_groups!: string[];
}

// POST /admin/roadmaps
export class CreateRoadmapResDto {
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
    is_published!: boolean;

    @Expose()
    @Type(() => RoadmapCourseResDto)
    courses!: RoadmapCourseResDto[];
}

// GET /admin/roadmaps (list item)
export class RoadmapListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    target_score!: number;

    @Expose()
    price!: number;

    @Expose()
    discount_percentage!: number;

    @Expose()
    is_published!: boolean;

    @Expose()
    total_enrollments!: number;
}

export class GetRoadmapListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    @Type(() => RoadmapListItemResDto)
    data!: RoadmapListItemResDto[];
}

// GET /admin/roadmaps/:id
export class GetRoadmapDetailResDto extends CreateRoadmapResDto {
    @Expose()
    total_enrollments!: number;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

export class UpdateRoadmapResDto extends CreateRoadmapResDto { }

export class DeleteRoadmapResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;
}

export class PublishRoadmapResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_published!: boolean;
}

export class AddCoursesResDto extends CreateRoadmapResDto { }

export class RemoveCourseResDto extends CreateRoadmapResDto { }
