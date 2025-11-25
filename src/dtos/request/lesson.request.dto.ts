import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min, IsBoolean, IsArray } from "class-validator";

// POST /admin/lessons
export class CreateLessonReqDto {
    @IsNotEmpty()
    @IsMongoId()
    course_id!: string;

    @IsNotEmpty()
    @IsString()
    @Length(1, 200)
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    order!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    duration_minutes?: number;
}

// PATCH /admin/lessons/:id
export class UpdateLessonReqDto {
    @IsOptional()
    @IsString()
    @Length(1, 200)
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    order?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    duration_minutes?: number;
}

// Param validation
export class LessonIdParamDto {
    @IsMongoId()
    id!: string;
}

// PATCH /admin/courses/:courseId/lessons/:lessonId/publish
export class LessonPublishParamDto {
    @IsMongoId()
    courseId!: string;

    @IsMongoId()
    lessonId!: string;
}

// PATCH /admin/courses/:courseId/lessons/:lessonId/free
export class ToggleFreeLessonReqDto {
    @IsNotEmpty()
    @IsBoolean()
    is_free!: boolean;
}

// PATCH /admin/courses/:courseId/lessons/bulk-publish
export class BulkPublishLessonsReqDto {
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    lessonIds!: string[];

    @IsNotEmpty()
    @IsBoolean()
    is_published!: boolean;
}

// PATCH /admin/lessons/bulk-free (MỚI)
export class BulkToggleFreeLessonsReqDto {
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    lessonIds!: string[];

    @IsNotEmpty()
    @IsBoolean()
    is_free!: boolean;
}

// GET /admin/courses/:id/free-lessons
export class CourseIdForLessonsParamDto {
    @IsMongoId()
    id!: string;
}

// PATCH /admin/lessons/courses/:courseId/lessons/bulk-publish (chỉ cần courseId)
export class CourseIdParamDto {
    @IsMongoId()
    courseId!: string;
}
