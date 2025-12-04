import { Expose, Type } from "class-transformer";

/**
 * Response after uploading image to S3
 */
export class UploadImageResDto {
    @Expose()
    image_url!: string;

    @Expose()
    file_name!: string;

    @Expose()
    file_size!: number;
}

/**
 * Response after AI analyzes image
 */
export class AnalyzeImageResDto {
    @Expose()
    image_url!: string;

    @Expose()
    image_description!: string;

    @Expose()
    suggested_category?: string;

    @Expose()
    suggested_words?: string[];
}

/**
 * Response after creating Image Writing Question
 */
export class CreateImageQuestionResDto {
    @Expose()
    question_id!: string;

    @Expose()
    image_url!: string;

    @Expose()
    image_description!: string;

    @Expose()
    required_words!: string[];

    @Expose()
    difficulty!: string;

    @Expose()
    category!: string;

    @Expose()
    hint?: string;

    @Expose()
    sample_answer?: string;

    @Expose()
    @Type(() => Date)
    createdAt!: Date;
}

/**
 * Response for getting Image Writing Question
 */
export class GetImageQuestionResDto {
    @Expose()
    question_id!: string;

    @Expose()
    image_url!: string;

    @Expose()
    image_description!: string;

    @Expose()
    required_words!: string[];

    @Expose()
    difficulty!: string;

    @Expose()
    category!: string;

    @Expose()
    hint?: string;

    // Không trả về sample_answer cho student
}

/**
 * Response for listing Image Writing Questions (Admin)
 */
export class ListImageQuestionsResDto {
    @Expose()
    questions!: CreateImageQuestionResDto[];

    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;
}
