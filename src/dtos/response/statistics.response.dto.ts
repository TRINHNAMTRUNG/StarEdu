import { Expose, Type } from "class-transformer";

export class RevenueOverviewResDto {
    @Expose() totalRevenueThisMonth!: number;
    @Expose() pctChangeFromPrevMonth!: number;
    @Expose() totalRevenueYTD!: number;
    @Expose() ordersCount!: number;
    @Expose() aov!: number;
}

export class UserOverviewResDto {
    @Expose() totalUsers!: number;
    @Expose() newUsersThisMonth!: number;
    @Expose() growthPct!: number;
}

export class TopRoadmapMiniDto {
    @Expose() roadmapId!: string;
    @Expose() title?: string;
    @Expose() enrollments!: number;
}

export class EnrollmentOverviewResDto {
    @Expose() enrollmentsThisMonth!: number;
    @Expose() pctChange!: number;
    @Expose() topRoadmap?: TopRoadmapMiniDto | null;
}

export class TimeSeriesBreakdownItemDto {
    @Expose() roadmapId!: string;
    @Expose() title!: string;
    @Expose() enrollments!: number;
}

export class TimeSeriesItemDto {
    @Expose() periodStart!: Date;
    @Expose() revenue?: number;
    @Expose() orders?: number;
    @Expose() newUsers?: number;
    @Expose() enrollments?: number;
    @Expose()
    @Type(() => TimeSeriesBreakdownItemDto)
    breakdown?: TimeSeriesBreakdownItemDto[]; // breakdown rõ kiểu
}

export class TopRoadmapItemDto {
    @Expose() roadmapId!: string;
    @Expose() title!: string;
    @Expose() enrollments!: number;
    @Expose() revenue!: number;
    @Expose() average_rating!: number;
}

export class TopRoadmapsResDto {
    @Expose()
    @Type(() => TopRoadmapItemDto)
    data!: TopRoadmapItemDto[];
}
