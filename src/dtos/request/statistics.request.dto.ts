import { IsEnum, IsOptional, IsNumber, Min, Max, IsIn, IsString } from "class-validator";

export enum PeriodUnit {
    DAY = "day",
    WEEK = "week",
    MONTH = "month",
    QUARTER = "quarter"
}

/**
 * GET /admin/statistics/* overview endpoints
 * Common: year, month (1-12), tz optional
 */
export class OverviewReqDto {
    @IsOptional()
    @IsNumber()
    @Min(1900)
    year?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(12)
    month?: number;

    @IsOptional()
    @IsString()
    tz?: string;
}

/**
 * GET /admin/statistics/revenue-chart
 * GET /admin/statistics/new-users-chart
 * GET /admin/statistics/enrollments-chart (base)
 */
export class ChartReqDto {
    @IsOptional()
    @IsEnum(PeriodUnit)
    period?: PeriodUnit = PeriodUnit.MONTH;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(52)
    range?: number = 6;

    @IsOptional()
    @IsString()
    tz?: string;
}

/**
 * GET /admin/statistics/enrollments-chart with breakdown
 * by: "roadmap" supported; top = top N roadmaps when breakdown requested
 */
export class EnrollmentsChartReqDto extends ChartReqDto {
    @IsOptional()
    @IsIn(["roadmap"])
    by?: "roadmap";

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(50)
    top?: number = 5;
}

/**
 * GET /admin/statistics/top-roadmaps
 */
export class TopRoadmapsReqDto {
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsIn(["enrollments", "revenue"])
    metric?: "enrollments" | "revenue" = "enrollments";
}
