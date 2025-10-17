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

export class FlashCardInputDto {
    @IsString()
    @IsNotEmpty({ message: "term không được để trống" })
    term!: string;

    @IsString()
    @IsNotEmpty({ message: "mainMeaning không được để trống" })
    mainMeaning!: string;
}

export class AddFlashCardsReqDto {
    @IsArray({ message: "cards phải là một mảng" })
    @ValidateNested({ each: true })
    @Type(() => FlashCardInputDto)
    cards!: FlashCardInputDto[];
}