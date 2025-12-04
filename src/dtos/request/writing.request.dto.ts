import { IsNotEmpty, IsMongoId, IsString, MaxLength, IsArray, ArrayMinSize, ArrayMaxSize, IsOptional, IsEnum, IsUrl, IsBoolean, IsNumber, Min, Max } from "class-validator";
import { WritingPromptType } from "../../models/writingPrompt.model";

/**
 * ============================================
 * EXISTING: student request DTOs for writing features (prompt_id based)
 * ============================================
 */
export class SuggestTextCollocationsReqDto {
    @IsNotEmpty()
    @IsMongoId()
    prompt_id!: string;
}

export class CheckTextWritingReqDto {
    @IsNotEmpty()
    @IsMongoId()
    prompt_id!: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(500)
    sentence!: string;
}

export class SuggestImageCollocationsReqDto {
    @IsNotEmpty()
    @IsMongoId()
    prompt_id!: string;
}

export class CheckImageWritingReqDto {
    @IsNotEmpty()
    @IsMongoId()
    prompt_id!: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(500)
    sentence!: string;
}

/**
 * Email DTOs unchanged
 */
export class GenerateEmailPromptReqDto { }
export class SuggestEmailKeywordsReqDto {
    @IsNotEmpty()
    @IsString()
    prompt_email!: string;
}
export class CheckEmailWritingReqDto {
    @IsNotEmpty()
    @IsString()
    prompt_email!: string;
    @IsNotEmpty()
    @IsString()
    @MaxLength(2000)
    response_email!: string;
}

/**
 * ============================================
 * NEW: Admin / prompt management DTOs (minimal)
 * - Thêm để các import hiện tại hợp lệ (Create/Update/Param/GetRandom)
 * ============================================
 */

/**
 * POST /admin/writing-prompts
 * Minimal create DTO (type + required_words). Image file is expected via multipart "image".
 */
export class CreateWritingPromptReqDto {
    @IsNotEmpty()
    @IsEnum(WritingPromptType)
    type!: WritingPromptType; // "text" | "image"

    @IsNotEmpty()
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsString({ each: true })
    required_words!: string[];

    @IsOptional()
    @IsString()
    image_description?: string;

    // optional when admin wants to provide direct URL instead of upload
    @IsOptional()
    @IsUrl()
    image_url?: string;
}

/**
 * PATCH /admin/writing-prompts/:id
 */
export class UpdateWritingPromptReqDto {
    @IsOptional()
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsString({ each: true })
    required_words?: string[];

    @IsOptional()
    @IsString()
    image_description?: string;

    @IsOptional()
    @IsBoolean()
    remove_image?: boolean;

    // allow changing type (rare)
    @IsOptional()
    @IsEnum(WritingPromptType)
    type?: WritingPromptType;
}

/**
 * Params DTO
 */
export class WritingPromptIdParamDto {
    @IsMongoId()
    id!: string;
}

/**
 * GET random prompt (query)
 * Example: GET /api/writing/text-writing/random?type=text
 */
export class GetRandomPromptReqDto {
    @IsNotEmpty()
    @IsEnum(WritingPromptType)
    type!: WritingPromptType;
}