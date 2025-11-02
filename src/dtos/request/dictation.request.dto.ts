import { IsArray, IsMongoId, IsNotEmpty, IsString, Length, Matches } from "class-validator";

// POST /admin/dictations
export class CreateDictationReqDto {
    @IsNotEmpty({ message: "YouTube Video ID không được để trống" })
    @IsString()
    @Matches(/^[a-zA-Z0-9_-]{11}$/, { 
        message: "YouTube Video ID không hợp lệ (phải là 11 ký tự)" 
    })
    youtubeVideoId!: string;

    @IsNotEmpty({ message: "Tiêu đề không được để trống" })
    @IsString()
    @Length(1, 200, { message: "Tiêu đề phải từ 1-200 ký tự" })
    title!: string;
}

// Param validation
export class DictationIdParamDto {
    @IsMongoId()
    id!: string;
}

// DELETE /admin/dictations (body)
export class DeleteDictationsReqDto {
    @IsArray()
    @IsMongoId({ each: true })
    @IsNotEmpty({ each: true })
    lessonIds!: string[];
}
