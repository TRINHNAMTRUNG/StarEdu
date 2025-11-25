import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min, IsBoolean } from "class-validator";

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
    @IsNumber()
    @Min(0)
    order?: number;

    @IsOptional()
    @IsString()
    description?: string;

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
