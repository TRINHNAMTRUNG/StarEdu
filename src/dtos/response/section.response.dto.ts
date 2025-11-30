import { Expose } from "class-transformer";

// POST /admin/sections
export class CreateSectionResDto {
    @Expose()
    _id!: string;

    @Expose()
    lesson_id!: string;

    @Expose()
    title!: string;

    @Expose()
    order!: number;

    @Expose()
    description?: string;

    @Expose()
    video_url?: string;

    @Expose()
    mindmap_url?: string;

    @Expose()
    test_id?: string;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

export class SectionListItemResDto {
    @Expose()
    _id!: string;

    @Expose()
    lesson_id!: string;

    @Expose()
    title!: string;

    @Expose()
    order!: number;

    @Expose()
    video_url?: string;

    @Expose()
    mindmap_url?: string;

    @Expose()
    test_id?: string;
}

export class GetSectionListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    data!: SectionListItemResDto[];
}

export class GetSectionDetailResDto extends CreateSectionResDto { }

export class UpdateSectionResDto extends CreateSectionResDto { }

export class DeleteSectionResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;

    @Expose()
    deletedFiles!: number;
}
