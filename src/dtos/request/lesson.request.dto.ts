import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";

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

    @IsNotEmpty()
    @IsMongoId()
    created_by!: string;

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
