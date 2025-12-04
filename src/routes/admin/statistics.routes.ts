import { Router } from "express";
import { container } from "tsyringe";
import StatisticsController from "../../controllers/statistics.controller";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";

import { validationQuery } from "../../middlewares/validationError.middleware"
import { OverviewReqDto, ChartReqDto, EnrollmentsChartReqDto, TopRoadmapsReqDto } from "../../dtos/request/statistics.request.dto";

const adminStatsRoutes = Router();
const statsController = container.resolve(StatisticsController);

adminStatsRoutes.use(
    authenticateToken,
    authorizeRoles(UserRole.ADMIN)
);


/**
 * 2. GET /admin/statistics/user-overview
 * Mục đích: Tổng quan người dùng (card)
 * Input (query): year?, month?
 * Output: { totalUsers, newUsersThisMonth, growthPct }
 */
adminStatsRoutes.get(
    "/user-overview",
    validationQuery(OverviewReqDto),
    statsController.userOverview
);

/**
 * 3. GET /admin/statistics/enrollment-overview
 * Mục đích: Tổng quan đăng ký roadmap (card)
 * Input (query): year?, month?
 * Output: { enrollmentsThisMonth, pctChange, topRoadmap }
 */
adminStatsRoutes.get(
    "/enrollment-overview",
    validationQuery(OverviewReqDto),
    statsController.enrollmentOverview
);

/**
 * 4. GET /admin/statistics/revenue-chart
 * Mục đích: Time-series doanh thu
 * Input (query): period=day|week|month|quarter, range=number
 * Output: [{ periodStart, revenue, orders }, ...]
 */
adminStatsRoutes.get(
    "/revenue-chart",
    validationQuery(ChartReqDto),
    statsController.revenueChart
);

/**
 * 5. GET /admin/statistics/new-users-chart
 * Mục đích: Time-series người dùng mới
 * Input (query): period=day|week|month, range=number
 * Output: [{ periodStart, newUsers }, ...]
 */
adminStatsRoutes.get(
    "/new-users-chart",
    validationQuery(ChartReqDto),
    statsController.newUsersChart
);

/**
 * 6. GET /admin/statistics/enrollments-chart
 * Mục đích: Time-series enrollments (optionally breakdown by roadmap)
 * Input (query): period=day|week|month, range=number, by=roadmap (optional), top=number (top N when by=roadmap)
 * Output:
 *   - by undefined: [{ periodStart, enrollments }]
 *   - by=roadmap: [{ periodStart, breakdown: [{ roadmapId, title, enrollments }] }]
 */
adminStatsRoutes.get(
    "/enrollments-chart",
    validationQuery(EnrollmentsChartReqDto),
    statsController.enrollmentsChart
);

/**
 * 7. GET /admin/statistics/top-roadmaps
 * Mục đích: Top selling roadmaps
 * Input (query): limit=10, metric optional (default by enrollments)
 * Output: [{ roadmapId, title, enrollments, revenue, average_rating }, ...]
 */
adminStatsRoutes.get(
    "/top-roadmaps",
    validationQuery(TopRoadmapsReqDto),
    statsController.topRoadmaps
);

export default adminStatsRoutes;
