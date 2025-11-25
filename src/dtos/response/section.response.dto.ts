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

// GET /admin/sections/:id
export class GetSectionDetailResDto extends CreateSectionResDto {}

// PATCH /admin/sections/:id
export class UpdateSectionResDto extends CreateSectionResDto {}

// DELETE /admin/sections/:id
export class DeleteSectionResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;

    @Expose()
    deletedFiles!: number;
}
