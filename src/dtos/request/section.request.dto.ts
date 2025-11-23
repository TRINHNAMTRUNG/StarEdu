import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateSectionReqDto {
    @IsNotEmpty()
    @IsMongoId()
    lesson_id!: string;

    @IsNotEmpty()
    @IsString()
    @Length(1, 200)
    title!: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    order!: number;

    @IsOptional()
    @IsString()
    video_url?: string;

    @IsOptional()
    @IsString()
    mindmap_url?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsMongoId()
    test_id?: string;
}

export class UpdateSectionReqDto {
    @IsOptional()
    @IsString()
    @Length(1, 200)
    title?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    order?: number;

    @IsOptional()
    @IsString()
    video_url?: string;

    @IsOptional()
    @IsString()
    mindmap_url?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    article_content?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    duration_minutes?: number;

    @IsOptional()
    questions?: any[];

    @IsOptional()
    @IsString()
    audioUrl?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    passingScore?: number;
}

export class SectionIdParamDto {
    @IsMongoId()
    id!: string;
}
