import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum, ValidateNested, IsMongoId } from "class-validator";
import { Type } from "class-transformer";

// ========== TEST DTOs ==========

export class CreateTestReqDto {
    @IsString()
    title!: string;

    @IsOptional()
    @IsNumber()
    year?: number;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsString()
    audioUrl?: string;

    @IsOptional()
    @IsNumber()
    time_limit?: number;

    @IsOptional()
    @IsNumber()
    passing_score?: number;

    @IsOptional()
    @IsArray()
    parts?: Array<{
        partNumber: number;
        questionIds: string[];
    }>;
}

export class UpdateTestReqDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsNumber()
    year?: number;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsString()
    audioUrl?: string;

    @IsOptional()
    @IsNumber()
    time_limit?: number;

    @IsOptional()
    @IsNumber()
    passing_score?: number;

    @IsOptional()
    @IsBoolean()
    is_published?: boolean;

    @IsOptional()
    @IsArray()
    parts?: Array<{
        partNumber: number;
        questionIds: string[];
    }>;
}

export class PublishTestReqDto {
    @IsBoolean()
    is_published!: boolean;
}

// ========== TEST ATTEMPT DTOs ==========

export class StartTestReqDto {
    @IsMongoId()
    test_id!: string;
}

export class SubmitAnswerReqDto {
    @IsMongoId()
    attempt_id!: string;

    @IsMongoId()
    question_id!: string;

    @IsString()
    selected_answer!: string;

    @IsOptional()
    @IsNumber()
    time_spent?: number;
}

export class UpdateCurrentPartReqDto {
    @IsMongoId()
    attempt_id!: string;

    @IsNumber()
    part_number!: number;
}

export class CompleteTestReqDto {
    @IsMongoId()
    attempt_id!: string;

    @IsOptional()
    @IsNumber()
    time_used?: number;
}

// ========== QUERY DTOs ==========

export class GetTestsQueryDto {
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    limit?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    year?: number;

    @IsOptional()
    @IsString()
    source?: string;
}

export class GetTestWithQuestionsQueryDto {
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    part?: number;
}

// ========== QUESTION DTOs ==========

export class CreateQuestionReqDto {
    @IsNumber()
    part!: number;

    @IsNumber()
    questionNumber!: number;

    @IsString()
    questionText!: string;

    @IsOptional()
    @IsString()
    audio?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsString()
    contextHtml?: string;

    @IsOptional()
    @IsString()
    transcript?: string;

    @IsOptional()
    options?: {
        A?: string;
        B?: string;
        C?: string;
        D?: string;
    };

    @IsString()
    answer!: string;

    @IsOptional()
    @IsString()
    explanation?: string;
}

export class UpdateQuestionReqDto {
    @IsOptional()
    @IsString()
    questionText?: string;

    @IsOptional()
    @IsString()
    audio?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsString()
    contextHtml?: string;

    @IsOptional()
    @IsString()
    transcript?: string;

    @IsOptional()
    options?: {
        A?: string;
        B?: string;
        C?: string;
        D?: string;
    };

    @IsOptional()
    @IsString()
    answer?: string;

    @IsOptional()
    @IsString()
    explanation?: string;
}
