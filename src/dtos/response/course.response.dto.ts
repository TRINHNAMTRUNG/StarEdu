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

// ❌ COMMENTED - Teacher role suspended
// export class ModificationHistoryItemResDto {
//     @Expose()
//     modified_by!: string;
//
//     @Expose()
//     modified_at!: Date;
//
//     @Expose()
//     reason?: string;
// }

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

    // ❌ COMMENTED - Teacher role suspended, Admin có full quyền
    // @Expose()
    // is_modifiable!: boolean;

    @Expose()
    @Type(() => CourseTeacherResDto)
    assigned_teachers!: CourseTeacherResDto[];

    // ❌ COMMENTED - Teacher role suspended
    // @Expose()
    // last_modified_at?: Date;
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

    // ❌ COMMENTED - Teacher role suspended
    // @Expose()
    // isModifiable!: boolean;

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

    // ❌ COMMENTED - Teacher role suspended
    // @Expose()
    // isModifiable!: boolean;

    @Expose()
    total_enrollments!: number;

    @Expose()
    average_rating!: number;

    @Expose()
    total_reviews!: number;

    @Expose()
    @Type(() => CourseTeacherResDto)
    assigned_teachers!: CourseTeacherResDto[];

    // ❌ COMMENTED - Teacher role suspended
    // @Expose()
    // last_modified_at?: Date;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

// PATCH /admin/courses/:id
export class UpdateCourseResDto extends CreateCourseResDto { }

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

    @Expose()
    published_lessons?: number; // ✅ Số lessons đã publish

    @Expose()
    skipped_lessons?: Array<{ title: string; reason: string }>; // ✅ Lessons bị skip vì invalid
}

// PATCH /admin/courses/:id/instructors
export class AssignTeachersResDto extends CreateCourseResDto { }

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

    // ✅ THÊM: Metadata giúp Admin hiểu rõ
    @Expose()
    _metadata?: {
        total_roadmaps: number;
        note: string;
    };
}

// ❌ COMMENTED - Teacher role suspended, không cần toggle modifiable
// export class ToggleModifiableResDto {
//     @Expose()
//     _id!: string;
//
//     @Expose()
//     title!: string;
//
//     @Expose()
//     is_modifiable!: boolean;
//
//     @Expose()
//     last_modified_by?: string;
//
//     @Expose()
//     last_modified_at?: Date;
// }

// ❌ COMMENTED - Teacher role suspended
// export class GetModificationHistoryResDto {
//     @Expose()
//     _id!: string;
//
//     @Expose()
//     title!: string;
//
//     @Expose()
//     @Type(() => ModificationHistoryItemResDto)
//     modification_history!: ModificationHistoryItemResDto[];
// }

// PATCH /admin/courses/:id/free
export class ToggleFreeCourseResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_free!: boolean;

    @Expose()
    is_published!: boolean;
}

// PATCH /admin/courses/free
export class ToggleFreeCoursesResDto {
    @Expose()
    modifiedCount!: number;

    @Expose()
    course_ids!: string[];

    @Expose()
    is_free!: boolean;

    @Expose()
    total_lessons_synced!: number; // ✅ Tổng lessons đã sync

    @Expose()
    courses!: Array<{
        _id: string;
        title: string;
        is_free: boolean;
        lessons_synced: number; // ✅ Số lessons sync trong course này
    }>;
}

// GET /admin/courses/:id/full
export class CourseLessonItemResDto {
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

// Section trong course full structure
export class SectionStructureResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    order!: number;

    @Expose()
    description!: string;  // ✅ FIX: Dùng description thay vì type
}

export class GetCourseFullResDto {
    @Expose()
    course!: GetCourseDetailResDto;

    @Expose()
    @Type(() => CourseLessonItemResDto)
    lessons!: CourseLessonItemResDto[];
}

// PATCH /admin/courses/:id/restore
export class RestoreCourseResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    is_deleted!: boolean;

    @Expose()
    message!: string;
}

// DELETE /admin/courses/:id/permanent
export class PermanentDeleteCourseResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;

    @Expose()
    deletedLessons!: number;

    @Expose()
    deletedSections!: number;

    @Expose()
    deletedS3Files!: number;
}

// POST /admin/courses/:id/clone
export class CloneCourseResDto extends CreateCourseResDto { }

// PATCH /admin/courses/:id/reorder-lessons
export class ReorderLessonsResDto {
    @Expose()
    message!: string;

    @Expose()
    courseId!: string;

    @Expose()
    updatedCount!: number;
}

// DELETE /admin/courses/bulk
export class BulkDeleteCoursesResDto {
    @Expose()
    message!: string;

    @Expose()
    totalRequested!: number;

    @Expose()
    deletedCount!: number;

    @Expose()
    failedCount!: number;

    @Expose()
    deletedIds!: string[];

    @Expose()
    failedIds!: string[];
}

// GET /admin/courses/available-for-roadmap/:roadmapId
export class AvailableCourseForRoadmapResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    thumbnail?: string;

    @Expose()
    skill_groups!: string[];

    @Expose()
    is_published!: boolean;

    @Expose()
    current_roadmaps!: string[]; // Roadmaps hiện chứa course này
}

export class GetAvailableCoursesForRoadmapResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    target_roadmap_id!: string;

    @Expose()
    @Type(() => AvailableCourseForRoadmapResDto)
    courses!: AvailableCourseForRoadmapResDto[];
}
