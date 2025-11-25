import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min, ValidateNested } from "class-validator";
import { SkillGroup } from "../../models/course.model";
import { Type } from "class-transformer"; // ✅ THÊM

// POST /admin/courses
export class CreateCourseReqDto {
    @IsNotEmpty()
    @IsMongoId()
    roadmap_id!: string; // ✅ BẮT BUỘC - Course phải thuộc 1 Roadmap

    @IsNotEmpty()
    @IsString()
    @Length(1, 200)
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    thumbnail?: string;

    @IsOptional()
    @IsArray()
    @IsEnum(SkillGroup, { each: true })
    skill_groups?: SkillGroup[];
}

// PATCH /admin/courses/:id
export class UpdateCourseReqDto {
    @IsOptional()
    @IsString()
    @Length(1, 200)
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    thumbnail?: string;

    @IsOptional()
    @IsArray()
    @IsEnum(SkillGroup, { each: true })
    skill_groups?: SkillGroup[];
}

// PATCH /admin/courses/:id/teachers
export class AssignTeachersReqDto {
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    teacher_ids!: string[];
}

// PATCH /admin/courses/:id/modifiable
// ❌ COMMENTED - Teacher role suspended, Admin không cần toggle modifiable nữa
// export class ToggleModifiableReqDto {
//     @IsNotEmpty()
//     @IsBoolean()
//     is_modifiable!: boolean;
//
//     @IsOptional()
//     @IsString()
//     reason?: string;
// }

// PATCH /admin/courses/:id/free
export class ToggleFreeCourseReqDto {
    @IsNotEmpty()
    @IsBoolean()
    is_free!: boolean;
}

// PATCH /admin/courses/free (BATCH)
export class ToggleFreeCoursesReqDto {
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    course_ids!: string[];

    @IsNotEmpty()
    @IsBoolean()
    is_free!: boolean;
}

// POST /admin/courses/:id/clone
export class CloneCourseReqDto {
    @IsNotEmpty()
    @IsString()
    @Length(1, 200)
    new_title!: string;
}

// PATCH /admin/courses/:id/reorder-lessons
export class ReorderLessonsReqDto {
    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LessonOrderDto)
    lesson_orders!: LessonOrderDto[];
}

export class LessonOrderDto {
    @IsNotEmpty()
    @IsMongoId()
    lesson_id!: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    order!: number;
}

// DELETE /admin/courses/bulk
export class BulkDeleteCoursesReqDto {
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    course_ids!: string[];
}

// Param validation
export class CourseIdParamDto {
    @IsMongoId()
    id!: string;
}

// MỚI: Param validation cho available courses endpoint
export class RoadmapIdForAvailableCoursesParamDto {
    @IsMongoId()
    roadmapId!: string;
}
