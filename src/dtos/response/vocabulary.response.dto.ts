import { Expose, Transform, Type } from "class-transformer";
import { Schema } from "mongoose";

export class FlashCardResDto {
    @Expose()
    _id!: string; // Đã convert trong service

    @Expose()
    term!: string;

    @Expose()
    mainMeaning!: string;

    @Expose()
    ipa!: string;

    @Expose()
    collocations!: { phrase: string; meaning: string }[];

    @Expose()
    examples!: string[];
}

export class AddFlashCardsResDto {
    @Expose()
    set_id!: string; // Đã convert sang string trong service

    @Expose()
    addedCount!: number;

    @Expose()
    @Type(() => FlashCardResDto)
    newCards!: FlashCardResDto[];

    @Expose()
    totalCards!: number;
}

export class VocabularySetResDto {
    @Expose()
    _id!: string; // Đã convert trong service

    @Expose()
    course_id!: string; // Đã convert trong service

    @Expose()
    part_of_speech!: string;

    @Expose()
    day_number!: number;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    @Type(() => FlashCardResDto)
    cards!: FlashCardResDto[];
}

export class VocabularySetListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    @Type(() => VocabularySetResDto)
    data!: VocabularySetResDto[];
}
