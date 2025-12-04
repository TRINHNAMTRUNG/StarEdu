// Controller cho các endpoint Dashboard (admin).
// Chú ý: các phương thức nhận query params, gọi StatisticsService và chuyển đổi sang DTO response.
import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import StatisticsService from "../services/statistics.service";
import ResponseFormat from "../utils/ResponseFormat";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    RevenueOverviewResDto,
    UserOverviewResDto,
    EnrollmentOverviewResDto,
    TimeSeriesItemDto,
    TopRoadmapsResDto
} from "../dtos/response/statistics.response.dto";
// ✅ IMPORT request DTO types
import { OverviewReqDto, ChartReqDto, EnrollmentsChartReqDto, TopRoadmapsReqDto } from "../dtos/request/statistics.request.dto";
import { PeriodUnit } from "../dtos/request/statistics.request.dto";

@injectable()
class StatisticsController {
    constructor(private readonly statsService: StatisticsService) { }

    // GET /admin/statistics/revenue-overview
    revenueOverview = asyncHandler(async (req: Request, res: Response) => {
        // LẤY QUERY ĐÃ ĐƯỢC VALIDATED (middleware validationQuery gán vào req.validatedQuery)
        const validatedQuery = (req as any).validatedQuery as OverviewReqDto | undefined;

        // BƯỚC 1: Lấy year/month từ validatedQuery; nếu không có thì dùng giá trị mặc định (năm/tháng hiện tại)
        const now = new Date();
        const yearRequested = validatedQuery?.year ?? now.getFullYear();
        const monthRequested = validatedQuery?.month ?? (now.getMonth() + 1);

        // BƯỚC 2: Gọi service (service trả dữ liệu đã normalize)
        const result = await this.statsService.getRevenueOverview({
            year: yearRequested,
            month: monthRequested
        });

        // BƯỚC 3: Transform output bằng DTO (object)
        const response = instanceToPlain(
            plainToInstance(RevenueOverviewResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(ResponseFormat.successResponse(response, "Lấy overview doanh thu", 200, req.requestId));
    });

    // GET /admin/statistics/user-overview
    userOverview = asyncHandler(async (req: Request, res: Response) => {
        const validatedQuery = (req as any).validatedQuery as OverviewReqDto | undefined;
        const now = new Date();
        const yearRequested = validatedQuery?.year ?? now.getFullYear();
        const monthRequested = validatedQuery?.month ?? (now.getMonth() + 1);

        const result = await this.statsService.getUserOverview({
            year: yearRequested,
            month: monthRequested
        });

        const response = instanceToPlain(
            plainToInstance(UserOverviewResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(ResponseFormat.successResponse(response, "Lấy overview người dùng", 200, req.requestId));
    });

    // GET /admin/statistics/enrollment-overview
    enrollmentOverview = asyncHandler(async (req: Request, res: Response) => {
        const validatedQuery = (req as any).validatedQuery as OverviewReqDto | undefined;
        const now = new Date();
        const yearRequested = validatedQuery?.year ?? now.getFullYear();
        const monthRequested = validatedQuery?.month ?? (now.getMonth() + 1);

        const result = await this.statsService.getEnrollmentOverview({
            year: yearRequested,
            month: monthRequested
        });

        const response = instanceToPlain(
            plainToInstance(EnrollmentOverviewResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(ResponseFormat.successResponse(response, "Lấy overview đăng ký roadmap", 200, req.requestId));
    });

    // GET /admin/statistics/revenue-chart
    revenueChart = asyncHandler(async (req: Request, res: Response) => {
        const validatedQuery = (req as any).validatedQuery as ChartReqDto | undefined;
        // chỉ dùng validatedQuery (middleware), fallback dùng default constants nếu undefined
        const periodUnit = validatedQuery?.period ?? PeriodUnit.MONTH;
        const rangeCount = validatedQuery?.range ?? 6;

        const data = await this.statsService.getRevenueChart(periodUnit, rangeCount);

        // Transform mảng: plainToInstance với isArray = true
        const response = instanceToPlain(
            plainToInstance(TimeSeriesItemDto, data as object[], { excludeExtraneousValues: true })
        );

        return res.status(200).json(ResponseFormat.successResponse(response, "Lấy dữ liệu biểu đồ doanh thu", 200, req.requestId));
    });

    // GET /admin/statistics/new-users-chart
    newUsersChart = asyncHandler(async (req: Request, res: Response) => {
        const validatedQuery = (req as any).validatedQuery as ChartReqDto | undefined;
        const periodUnit = validatedQuery?.period ?? PeriodUnit.MONTH;
        const rangeCount = validatedQuery?.range ?? 6;

        const data = await this.statsService.getNewUsersChart(periodUnit, rangeCount);

        const response = instanceToPlain(
            plainToInstance(TimeSeriesItemDto, data as object[], { excludeExtraneousValues: true })
        );

        return res.status(200).json(ResponseFormat.successResponse(response, "Lấy dữ liệu biểu đồ người dùng mới", 200, req.requestId));
    });

    // GET /admin/statistics/enrollments-chart
    enrollmentsChart = asyncHandler(async (req: Request, res: Response) => {
        const validatedQuery = (req as any).validatedQuery as EnrollmentsChartReqDto | undefined;
        const periodUnit = validatedQuery?.period ?? PeriodUnit.MONTH;
        const rangeCount = validatedQuery?.range ?? 6;

        const byValue = validatedQuery?.by;
        const breakdownByRoadmap = byValue === "roadmap";

        const topCount = validatedQuery?.top ?? 5;

        const data = await this.statsService.getEnrollmentsChart(periodUnit, rangeCount, breakdownByRoadmap, topCount);

        const response = instanceToPlain(
            plainToInstance(TimeSeriesItemDto, data as object[], { excludeExtraneousValues: true })
        );

        return res.status(200).json(ResponseFormat.successResponse(response, "Lấy dữ liệu biểu đồ đăng ký", 200, req.requestId));
    });

    // GET /admin/statistics/top-roadmaps
    topRoadmaps = asyncHandler(async (req: Request, res: Response) => {
        const validatedQuery = (req as any).validatedQuery as TopRoadmapsReqDto | undefined;
        const limitCount = validatedQuery?.limit ?? 10;

        const data = await this.statsService.getTopRoadmaps(limitCount);

        const response = instanceToPlain(
            plainToInstance(TopRoadmapsResDto, { data }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(ResponseFormat.successResponse(response, "Lấy danh sách roadmap bán chạy", 200, req.requestId));
    });
}

export default StatisticsController;
