import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min, Max } from "class-validator";
import { SkillGroup } from "../../models/course.model";

// POST /admin/roadmaps
export class CreateRoadmapReqDto {
    @IsNotEmpty()
    @IsMongoId()
    certification_id!: string;

    @IsNotEmpty()
    @IsString()
    @Length(1, 200)
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsEnum(SkillGroup, { each: true })
    skill_groups?: SkillGroup[];

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    target_score!: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    price!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    discount_percentage?: number;
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
    @IsArray()
    @IsEnum(SkillGroup, { each: true })
    skill_groups?: SkillGroup[];

    @IsOptional()
    @IsNumber()
    @Min(0)
    target_score?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    discount_percentage?: number;
}

// POST /admin/roadmaps/:id/courses
export class AddCoursesToRoadmapReqDto {
    @IsNotEmpty()
    @IsArray()
    @IsMongoId({ each: true })
    course_ids!: string[];
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
