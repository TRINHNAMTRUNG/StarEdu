import { Type } from "class-transformer";
import { IsString, IsNumber, IsArray, IsOptional, IsEnum, ValidateNested, IsNotEmpty, IsMongoId } from "class-validator";
import { PartOfSpeech } from "../../models/vocabulary.model";

export class CreateSetReqDto {
    @IsNotEmpty()
    @IsMongoId()
    course_id!: string;

    @IsNotEmpty()
    @IsEnum(PartOfSpeech)
    part_of_speech!: PartOfSpeech;

    @IsNotEmpty()
    @IsNumber()
    day_number!: number;

    @IsNotEmpty()
    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;
}

// /admin/vocabulary/sets/:setId/cards
export class SetIdParamDto {
    @IsNotEmpty()
    @IsMongoId()
    setId!: string;
}

export class FlashCardItemDto {
    @IsNotEmpty()
    @IsString()
    term!: string;

    @IsNotEmpty()
    @IsString()
    mainMeaning!: string;
}

export class AddFlashCardsReqDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FlashCardItemDto)
    cards!: FlashCardItemDto[];
}