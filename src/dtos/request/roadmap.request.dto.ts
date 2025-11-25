import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";
import { Level } from "../../models/student.model";

// POST /admin/roadmaps
export class CreateRoadmapReqDto {
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

    @IsNotEmpty()
    @IsEnum(Level)
    target_level!: Level;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    duration_weeks!: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    price!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discount_price?: number;
}

// PATCH /admin/roadmaps/:id
export class UpdateRoadmapReqDto {
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
    @IsEnum(Level)
    target_level?: Level;

    @IsOptional()
    @IsNumber()
    @Min(1)
    duration_weeks?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discount_price?: number;
}

// POST /admin/roadmaps/:id/courses
export class AddCoursesToRoadmapReqDto {
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    course_ids!: string[];
}

// POST /admin/roadmaps/:id/smart-publish
export enum SmartPublishMode {
    NONE = "none",
    PER_COURSE_COUNT = "perCourseCount",
    EXPLICIT = "explicit"
}

export class SmartPublishRoadmapReqDto {
    @IsOptional()
    @IsEnum(SmartPublishMode)
    mode?: SmartPublishMode;

    @IsOptional()
    @IsNumber()
    @Min(0)
    freeLessonsPerCourse?: number;

    @IsOptional()
    explicitFreeLessons?: { [courseId: string]: string[] };
}

// PATCH /admin/roadmaps/:id/free
export class ToggleFreeRoadmapReqDto {
    @IsNotEmpty()
    @IsBoolean()
    is_free!: boolean;
}

// Param validation
export class RoadmapIdParamDto {
    @IsMongoId()
    id!: string;
}

export class RoadmapCourseParamDto {
    @IsMongoId()
    id!: string;

    @IsMongoId()
    courseId!: string;
}

// GET /public/roadmaps/:id/structure
export enum StructureContext {
    PUBLIC = "public",
    ENROLLED = "enrolled",
    ADMIN = "admin"
}

export class GetStructureQueryDto {
    @IsOptional()
    @IsEnum(StructureContext)
    context?: StructureContext;
}
