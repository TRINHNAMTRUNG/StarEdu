import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";
import { SkillGroup } from "../../models/course.model";

// POST /admin/courses
export class CreateCourseReqDto {
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
export class ToggleModifiableReqDto {
    @IsNotEmpty()
    @IsBoolean()
    isModifiable!: boolean;

    @IsOptional()
    @IsString()
    reason?: string;
}

// Param validation
export class CourseIdParamDto {
    @IsMongoId()
    id!: string;
}
