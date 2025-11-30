import { Expose, Type } from "class-transformer";

/**
 * ============================================
 * STRUCTURE DTOs (cho API structure)
 * ============================================
 */

// Section info trong structure
export class SectionStructureResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    order!: number;

    @Expose()
    description!: string;  // ✅ FIX: Section model không có type
}

// Lesson trong structure
export class LessonStructureResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    order!: number;

    @Expose()
    is_published!: boolean;

    @Expose()
    is_free!: boolean;

    @Expose()
    @Type(() => SectionStructureResDto)
    sections!: SectionStructureResDto[];
}

// Course trong structure
export class CourseStructureResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    order!: number;

    @Expose()
    is_published!: boolean;

    @Expose()
    is_free!: boolean;

    @Expose()
    total_lessons!: number;

    @Expose()
    free_lessons_count!: number;

    @Expose()
    @Type(() => LessonStructureResDto)
    lessons!: LessonStructureResDto[];
}

// GET /public/roadmaps/:id/structure
export class GetRoadmapStructureResDto {
    @Expose()
    roadmap!: {
        _id: string;
        title: string;
        description?: string;
        is_published: boolean;
        is_free: boolean;
    };

    @Expose()
    @Type(() => CourseStructureResDto)
    courses!: CourseStructureResDto[];
}

/**
 * ============================================
 * PREVIEW DTOs (cho API publish-preview)
 * ============================================
 */

export class CoursePreviewItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    total_lessons!: number;

    @Expose()
    published_lessons!: number;

    @Expose()
    free_lessons!: number;

    @Expose()
    ready_to_publish!: boolean;
}

export class GetPublishPreviewResDto {
    @Expose()
    roadmap!: {
        _id: string;
        title: string;
        is_published: boolean;
    };

    @Expose()
    @Type(() => CoursePreviewItemResDto)
    courses!: CoursePreviewItemResDto[];

    @Expose()
    summary!: {
        total_courses: number;
        total_lessons: number;
        published_lessons: number;
        free_lessons: number;
        ready_to_publish: boolean;
    };
}

/**
 * ============================================
 * STANDARD CRUD DTOs
 * ============================================
 */

// Course info cơ bản trong roadmap
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

// Base roadmap response
export class RoadmapBaseResDto {
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
    target_score!: number;

    @Expose()
    price!: number;

    @Expose()
    discount_percentage!: number;

    @Expose()
    is_published!: boolean;

    @Expose()
    is_free!: boolean;

    @Expose()
    @Type(() => RoadmapCourseResDto)
    courses!: RoadmapCourseResDto[];
}

// POST /admin/roadmaps
export class CreateRoadmapResDto extends RoadmapBaseResDto { }

// PATCH /admin/roadmaps/:id
export class UpdateRoadmapResDto extends RoadmapBaseResDto { }

// GET /admin/roadmaps (list item)
export class RoadmapListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

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
    is_free!: boolean;

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
export class GetRoadmapDetailResDto extends RoadmapBaseResDto {
    @Expose()
    total_enrollments!: number;

    @Expose()
    average_rating!: number;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

// DELETE /admin/roadmaps/:id
export class DeleteRoadmapResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;
}

// PATCH /admin/roadmaps/:id/publish
export class PublishRoadmapResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_published!: boolean;
}

// POST /admin/roadmaps/:id/courses
export class AddCoursesResDto extends RoadmapBaseResDto { }

// DELETE /admin/roadmaps/:id/courses/:courseId
export class RemoveCourseResDto extends RoadmapBaseResDto { }

// POST /admin/roadmaps/:id/smart-publish
export class SmartPublishCourseItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    total_lessons!: number;

    @Expose()
    free_lessons!: number;
}

export class SmartPublishRoadmapResDto {
    @Expose()
    roadmap!: {
        _id: string;
        title: string;
        is_published: boolean;
    };

    @Expose()
    summary!: {
        total_courses: number;
        published_courses: number;
        total_lessons: number;
        published_lessons: number;
        free_lessons: number;
    };

    @Expose()
    @Type(() => SmartPublishCourseItemResDto)
    courses!: SmartPublishCourseItemResDto[];
}

// PATCH /admin/roadmaps/:id/free
export class ToggleFreeRoadmapResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_free!: boolean;

    @Expose()
    is_published!: boolean;
}
