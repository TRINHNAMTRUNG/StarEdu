import { Expose, Type } from "class-transformer";

export class WordResDto {
    @Expose()
    word!: string;

    @Expose()
    meaning!: string;
}

export class DictationBreakResDto {
    @Expose()
    breakNumber!: number;

    @Expose()
    startTime!: number;

    @Expose()
    endTime!: number;

    @Expose()
    originalText!: string;

    @Expose()
    textTranslation!: string;

    @Expose()
    @Type(() => WordResDto)
    words!: WordResDto[];
}

// Admin: Get all dictations (list)
export class DictationListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    lessonTranslation!: string;

    @Expose()
    youtubeVideoId!: string;
}

export class GetDictationListResDto {
    @Expose()
    total!: number;

    @Expose()
    @Type(() => DictationListItemResDto)
    data!: DictationListItemResDto[];
}

// Student: Get dictations with lock status
export class StudentDictationListItemResDto extends DictationListItemResDto {
    @Expose()
    is_locked!: boolean;
}

export class GetStudentDictationListResDto {
    @Expose()
    total!: number;

    @Expose()
    @Type(() => StudentDictationListItemResDto)
    data!: StudentDictationListItemResDto[];
}

// Get dictation detail (with breaks)
export class DictationDetailResDto {
    @Expose()
    _id!: string;

    @Expose()
    title!: string;

    @Expose()
    youtubeVideoId!: string;

    @Expose()
    lessonTranslation!: string;

    @Expose()
    @Type(() => DictationBreakResDto)
    breaks!: DictationBreakResDto[];

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

// Create dictation response
export class CreateDictationResDto extends DictationDetailResDto {}

// DELETE /admin/dictations
export class DeleteDictationsResDto {
    @Expose()
    deletedCount!: number;

    @Expose()
    deletedIds!: string[];

    @Expose()
    message!: string;
}
