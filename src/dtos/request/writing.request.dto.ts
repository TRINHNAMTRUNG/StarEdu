import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, ArrayMaxSize, ArrayMinSize, MaxLength } from "class-validator";

/**
 * ============================================
 * TÍNH NĂNG 1: VIẾT CÂU VỚI 2 TỪ CHO TRƯỚC
 * ============================================
 */

/**
 * POST /api/writing/text-writing/suggest-collocations
 * Gợi ý 5 collocation phù hợp với 2 từ cho trước
 */
export class SuggestTextCollocationsReqDto {
    @IsNotEmpty({ message: "Phải cung cấp đúng 2 từ vựng" })
    @IsArray()
    @ArrayMinSize(2, { message: "Phải có đúng 2 từ vựng" })
    @ArrayMaxSize(2, { message: "Phải có đúng 2 từ vựng" })
    @IsString({ each: true })
    required_words!: string[]; // 2 từ bắt buộc phải sử dụng (VD: ["accept", "so"])
}

/**
 * POST /api/writing/text-writing/check-sentence
 * Chấm bài viết câu (không có ảnh, chỉ dựa vào 2 từ)
 */
export class CheckTextWritingReqDto {
    @IsNotEmpty({ message: "Câu viết không được để trống" })
    @IsString()
    @MaxLength(500, { message: "Câu không được vượt quá 500 ký tự" })
    sentence!: string; // Câu học sinh viết

    @IsNotEmpty({ message: "Phải cung cấp đúng 2 từ vựng" })
    @IsArray()
    @ArrayMinSize(2, { message: "Phải có đúng 2 từ vựng" })
    @ArrayMaxSize(2, { message: "Phải có đúng 2 từ vựng" })
    @IsString({ each: true })
    required_words!: string[]; // 2 từ bắt buộc (VD: ["accept", "so"])
}

/**
 * ============================================
 * TÍNH NĂNG 2: VIẾT CÂU DỰA VÀO HÌNH ẢNH + 2 TỪ
 * ============================================
 */

/**
 * POST /api/writing/image-writing/suggest-collocations
 * Gợi ý 5 collocation phù hợp với ảnh + 2 từ
 */
export class SuggestImageCollocationsReqDto {
    @IsNotEmpty({ message: "URL hình ảnh không được để trống" })
    @IsString()
    @IsUrl({}, { message: "URL hình ảnh không hợp lệ" })
    image_url!: string; // URL ảnh từ S3

    @IsNotEmpty({ message: "Phải cung cấp đúng 2 từ vựng" })
    @IsArray()
    @ArrayMinSize(2, { message: "Phải có đúng 2 từ vựng" })
    @ArrayMaxSize(2, { message: "Phải có đúng 2 từ vựng" })
    @IsString({ each: true })
    required_words!: string[]; // 2 từ bắt buộc (VD: ["backpack", "across"])
}

/**
 * POST /api/writing/image-writing/check-sentence
 * Chấm bài viết câu (dựa vào ảnh + 2 từ)
 */
export class CheckImageWritingReqDto {
    @IsNotEmpty({ message: "Câu viết không được để trống" })
    @IsString()
    @MaxLength(500, { message: "Câu không được vượt quá 500 ký tự" })
    sentence!: string; // Câu học sinh viết

    @IsNotEmpty({ message: "URL hình ảnh không được để trống" })
    @IsString()
    @IsUrl({}, { message: "URL hình ảnh không hợp lệ" })
    image_url!: string; // URL ảnh từ S3

    @IsNotEmpty({ message: "Phải cung cấp đúng 2 từ vựng" })
    @IsArray()
    @ArrayMinSize(2, { message: "Phải có đúng 2 từ vựng" })
    @ArrayMaxSize(2, { message: "Phải có đúng 2 từ vựng" })
    @IsString({ each: true })
    required_words!: string[]; // 2 từ bắt buộc
}



/**
 * ============================================
 * TÍNH NĂNG 3: EMAIL WRITING (TOEIC FORMAT)
 * ============================================
 */

/**
 * POST /api/writing/email-writing/generate-prompt
 * Tạo đề bài email (format TOEIC ETS)
 * Không cần request body - Gemini tự sinh đề ngẫu nhiên
 */
export class GenerateEmailPromptReqDto {
    // Không cần field nào - để trống để Gemini tự sinh đề
}

/**
 * POST /api/writing/email-writing/suggest-keywords
 * Gợi ý 5 từ khóa để viết email phản hồi
 */
export class SuggestEmailKeywordsReqDto {
    @IsNotEmpty({ message: "Nội dung email đề bài không được để trống" })
    @IsString()
    prompt_email!: string; // Email đề bài từ API 3.1 (full email text)
}

/**
 * POST /api/writing/email-writing/check-email
 * Chấm điểm email phản hồi của học sinh
 */
export class CheckEmailWritingReqDto {
    @IsNotEmpty({ message: "Nội dung email đề bài không được để trống" })
    @IsString()
    prompt_email!: string; // Email đề bài gốc

    @IsNotEmpty({ message: "Email phản hồi không được để trống" })
    @IsString()
    @MaxLength(2000, { message: "Email không được vượt quá 2000 ký tự" })
    response_email!: string; // Email học sinh viết
}