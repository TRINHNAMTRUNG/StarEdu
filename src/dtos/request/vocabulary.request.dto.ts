import { Type } from "class-transformer";
import { IsString, IsNumber, IsArray, IsOptional, IsEnum, ValidateNested, IsNotEmpty, IsMongoId, ArrayMaxSize, ArrayMinSize, IsBoolean, Min, Length } from "class-validator";
import { PartOfSpeech } from "../../models/vocabulary.model";

export class CollocationDto {
    @IsNotEmpty()
    @IsString()
    phrase!: string;

    @IsNotEmpty()
    @IsString()
    meaning!: string;
}

export class FlashCardDto {
    @IsNotEmpty()
    @IsString()
    term!: string;

    @IsNotEmpty()
    @IsString()
    main_meaning!: string;  // ✅ Đổi từ mainMeaning

    @IsOptional()
    @IsString()
    example?: string;

    @IsOptional()
    @IsString()
    ipa?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CollocationDto)
    collocations?: CollocationDto[];

    @IsOptional()
    @IsString()
    audio_us_url?: string;  // ✅ Đổi từ audioUS_url

    @IsOptional()
    @IsString()
    audio_uk_url?: string;  // ✅ Đổi từ audioUK_url
}

export class CreateSetReqDto {
    @IsNotEmpty()
    @IsEnum(PartOfSpeech)
    part_of_speech!: PartOfSpeech;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    day_number!: number;

    @IsNotEmpty()
    @IsString()
    @Length(1, 200)
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_free?: boolean;
}

export class AddFlashCardsReqDto {
    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })  // ✅ THÊM
    @Type(() => FlashCardDto)
    cards!: FlashCardDto[];
}

export class SetIdParamDto {
    @IsMongoId()
    setId!: string;
}