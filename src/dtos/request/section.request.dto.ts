import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min, IsBoolean, IsEnum } from "class-validator";

enum SectionType {
    VIDEO = 'video',
    DOCUMENT = 'document',
    MINDMAP = 'mindmap',
    EXERCISE = 'exercise'
}

export class CreateSectionReqDto {
    @IsNotEmpty()
    @IsMongoId()
    lesson_id!: string;

    @IsNotEmpty()
    @IsString()
    @Length(1, 200)
    title!: string;

    @IsNotEmpty()
    @IsEnum(SectionType)
    type!: 'video' | 'document' | 'mindmap' | 'exercise';

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    order!: number;

    @IsOptional()
    @IsString()
    description?: string;

    // Optional test reference
    @IsOptional()
    @IsMongoId()
    test_id?: string;
}

// PATCH /admin/sections/:id
export class UpdateSectionReqDto {
    @IsOptional()
    @IsString()
    @Length(1, 200)
    title?: string;

    @IsOptional()
    @IsEnum(SectionType)
    type?: 'video' | 'document' | 'mindmap' | 'exercise';

    @IsOptional()
    @IsNumber()
    @Min(0)
    order?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    video_url?: string;

    @IsOptional()
    @IsString()
    article_content?: string;

    @IsOptional()
    @IsString()
    mindmap_url?: string;

    @IsOptional()
    @IsMongoId()
    test_id?: string;

    @IsOptional()
    @IsNumber()
    duration_minutes?: number;

    // Flags to remove existing files
    @IsOptional()
    @IsBoolean()
    removeVideo?: boolean;

    @IsOptional()
    @IsBoolean()
    removeMindmap?: boolean;
}

// Param validation
export class SectionIdParamDto {
    @IsMongoId()
    id!: string;
}
