import { Expose, Type, Transform } from "class-transformer";

// List sets (không có cards)
export class StudentVocabularySetListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    part_of_speech!: string;

    @Expose()
    day_number!: number;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    total_cards!: number;

    @Expose()
    is_free!: boolean;

    @Expose()
    is_locked!: boolean;
}

export class GetStudentVocabularySetsResDto {
    @Expose()
    total!: number;

    @Expose()
    @Type(() => StudentVocabularySetListItemResDto)
    data!: StudentVocabularySetListItemResDto[];
}

// Chi tiet 1 set (co day du cards)
export class StudentFlashCardResDto {
    @Expose()
    _id!: string;

    @Expose()
    term!: string;

    @Expose()
    mainMeaning!: string;

    @Expose()
    example?: string;

    @Expose()
    ipa?: string;

    @Expose()
    @Transform(({ value }) => {
        if (!Array.isArray(value)) return [];
        return value.map((col: any) => ({
            phrase: col.phrase || "",
            meaning: col.meaning || ""
        }));
    })
    collocations!: { phrase: string; meaning: string }[];

    @Expose()
    audioUS_url?: string;

    @Expose()
    audioUK_url?: string;
}

export class GetStudentVocabularySetDetailResDto {
    @Expose()
    _id!: string;

    @Expose()
    course_id!: string;

    @Expose()
    part_of_speech!: string;

    @Expose()
    day_number!: number;

    @Expose()
    title!: string;

    @Expose()
    description?: string;

    @Expose()
    is_free!: boolean;

    @Expose()
    is_locked!: boolean;

    @Expose()
    @Type(() => StudentFlashCardResDto)
    cards!: StudentFlashCardResDto[];
}
