import { IsNotEmpty, IsString, IsArray, ArrayMinSize, ArrayMaxSize, IsEnum, IsOptional, IsUrl } from "class-validator";
import { ImageWritingDifficulty, ImageWritingCategory } from "../../models/ImageWritingQuestion.model";

/**
 * DTO for uploading image (multipart/form-data)
 * Admin uploads image file → Get S3 URL
 */
export class UploadImageReqDto {
    // File will be handled by multer middleware
    // No validation here
}

/**
 * DTO for analyzing image with AI
 * Admin sends image_url → AI generates description
 */
export class AnalyzeImageReqDto {
    @IsNotEmpty({ message: "image_url là bắt buộc" })
    @IsUrl({}, { message: "image_url phải là URL hợp lệ" })
    image_url!: string;
}

/**
 * DTO for creating Image Writing Question
 * Admin creates complete question with image + words
 */
export class CreateImageQuestionReqDto {
    @IsNotEmpty({ message: "image_url là bắt buộc" })
    @IsUrl({}, { message: "image_url phải là URL hợp lệ" })
    image_url!: string;

    @IsNotEmpty({ message: "image_description là bắt buộc" })
    @IsString({ message: "image_description phải là string" })
    image_description!: string;

    @IsNotEmpty({ message: "required_words là bắt buộc" })
    @IsArray({ message: "required_words phải là mảng" })
    @ArrayMinSize(2, { message: "required_words phải có đúng 2 từ" })
    @ArrayMaxSize(2, { message: "required_words phải có đúng 2 từ" })
    @IsString({ each: true, message: "Mỗi từ phải là string" })
    required_words!: string[];

    @IsOptional()
    @IsEnum(ImageWritingDifficulty, { message: "difficulty không hợp lệ" })
    difficulty?: ImageWritingDifficulty;

    @IsOptional()
    @IsEnum(ImageWritingCategory, { message: "category không hợp lệ" })
    category?: ImageWritingCategory;

    @IsOptional()
    @IsString({ message: "hint phải là string" })
    hint?: string;

    @IsOptional()
    @IsString({ message: "sample_answer phải là string" })
    sample_answer?: string;
}

/**
 * DTO for getting random Image Writing Question
 * Student gets question by difficulty/category
 */
export class GetImageQuestionReqDto {
    @IsOptional()
    @IsEnum(ImageWritingDifficulty, { message: "difficulty không hợp lệ" })
    difficulty?: ImageWritingDifficulty;

    @IsOptional()
    @IsEnum(ImageWritingCategory, { message: "category không hợp lệ" })
    category?: ImageWritingCategory;
}

/**
 * DTO for updating Image Writing Question
 */
export class UpdateImageQuestionReqDto {
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
    @IsEnum(ImageWritingDifficulty)
    difficulty?: ImageWritingDifficulty;

    @IsOptional()
    @IsEnum(ImageWritingCategory)
    category?: ImageWritingCategory;

    @IsOptional()
    @IsString()
    hint?: string;

    @IsOptional()
    @IsString()
    sample_answer?: string;

    @IsOptional()
    isActive?: boolean;
}
