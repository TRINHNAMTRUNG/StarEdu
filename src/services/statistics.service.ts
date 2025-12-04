import { injectable } from "tsyringe";
import PaymentModel from "../models/payment.model";
import EnrollmentModel from "../models/enrollment.model";
import UserModel from "../models/user.model";
import RoadmapModel from "../models/roadmap.model";
import AppError from "../utils/AppError";
import mongoose from "mongoose";

/**
 * StatisticsService
 * - Trả về dữ liệu đã được chuẩn hóa (convert ObjectId -> string, dates là Date)
 * - Mỗi method có comment tiếng Việt từng bước để dễ hiểu
 */
@injectable()
class StatisticsService {
    /**
     * BƯỚC 1: getRevenueOverview
     * Mục tiêu: trả về tổng doanh thu tháng hiện tại, so sánh với tháng trước, tổng YTD, số đơn, AOV
     */
    async getRevenueOverview(opts: { year?: number; month?: number }): Promise<IRevenueOverview> {
        try {
            // BƯỚC 1: xác định khoảng thời gian (monthStart, monthEnd, prevMonth, ytd)
            const year = opts.year ?? new Date().getFullYear();
            const month = opts.month ?? (new Date().getMonth() + 1); // 1-12

            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 1); // exclusive

            const prevMonthStart = new Date(year, month - 2, 1);
            const prevMonthEnd = monthStart;

            const yearStart = new Date(year, 0, 1);
            const nextYearStart = new Date(year + 1, 0, 1);

            // BƯỚC 2: aggregate trên collection payments
            const [thisMonthAgg, prevMonthAgg, ytdAgg] = await Promise.all([
                PaymentModel.aggregate([
                    { $match: { status: "success", payment_date: { $gte: monthStart, $lt: monthEnd } } },
                    { $group: { _id: null, total: { $sum: "$amount" }, orders: { $sum: 1 } } }
                ]),
                PaymentModel.aggregate([
                    { $match: { status: "success", payment_date: { $gte: prevMonthStart, $lt: prevMonthEnd } } },
                    { $group: { _id: null, total: { $sum: "$amount" }, orders: { $sum: 1 } } }
                ]),
                PaymentModel.aggregate([
                    { $match: { status: "success", payment_date: { $gte: yearStart, $lt: nextYearStart } } },
                    { $group: { _id: null, total: { $sum: "$amount" }, orders: { $sum: 1 } } }
                ])
            ]);

            const totalThisMonth = (thisMonthAgg[0]?.total as number) ?? 0;
            const ordersThisMonth = (thisMonthAgg[0]?.orders as number) ?? 0;
            const totalPrevMonth = (prevMonthAgg[0]?.total as number) ?? 0;
            const totalYTD = (ytdAgg[0]?.total as number) ?? 0;

            // BƯỚC 3: tính phần trăm thay đổi (so với tháng trước)
            const pctChangeFromPrevMonth = totalPrevMonth === 0 ? (totalThisMonth === 0 ? 0 : 100) : ((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 100;

            // BƯỚC 4: tính AOV (average order value)
            const aov = ordersThisMonth === 0 ? 0 : Math.round((totalThisMonth / ordersThisMonth) * 100) / 100;

            // BƯỚC 5: trả về object đã normalize (số, không chứa ObjectId)
            return {
                totalRevenueThisMonth: totalThisMonth,
                pctChangeFromPrevMonth: Math.round(pctChangeFromPrevMonth * 100) / 100,
                totalRevenueYTD: totalYTD,
                ordersCount: ordersThisMonth,
                aov
            };
        } catch (err: any) {
            throw AppError.internalServerError("Lỗi khi lấy overview doanh thu", err?.message);
        }
    }

    /**
     * BƯỚC 2: getUserOverview
     * Mục tiêu: tổng users, new users tháng, growth%
     */
    async getUserOverview(opts: { year?: number; month?: number }): Promise<IUserOverview> {
        try {
            const year = opts.year ?? new Date().getFullYear();
            const month = opts.month ?? (new Date().getMonth() + 1);

            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 1);

            const prevMonthStart = new Date(year, month - 2, 1);
            const prevMonthEnd = monthStart;

            const [totalUsers, newThisMonth, newPrevMonth] = await Promise.all([
                UserModel.countDocuments({}),
                UserModel.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
                UserModel.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: prevMonthEnd } })
            ]);

            const growthPct = newPrevMonth === 0 ? (newThisMonth === 0 ? 0 : 100) : ((newThisMonth - newPrevMonth) / newPrevMonth) * 100;

            return {
                totalUsers,
                newUsersThisMonth: newThisMonth,
                growthPct: Math.round(growthPct * 100) / 100
            };
        } catch (err: any) {
            throw AppError.internalServerError("Lỗi khi lấy overview người dùng", err?.message);
        }
    }

    /**
     * BƯỚC 3: getEnrollmentOverview
     * Mục tiêu: enrollmentsThisMonth, pctChange, topRoadmap (mini)
     */
    async getEnrollmentOverview(opts: { year?: number; month?: number }): Promise<IEnrollmentOverview> {
        try {
            const year = opts.year ?? new Date().getFullYear();
            const month = opts.month ?? (new Date().getMonth() + 1);

            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 1);
            const prevMonthStart = new Date(year, month - 2, 1);
            const prevMonthEnd = monthStart;

            const [thisMonthAgg, prevMonthAgg, topRoadmapAgg] = await Promise.all([
                EnrollmentModel.aggregate([
                    { $match: { enrolled_date: { $gte: monthStart, $lt: monthEnd } } },
                    { $group: { _id: null, total: { $sum: 1 } } }
                ]),
                EnrollmentModel.aggregate([
                    { $match: { enrolled_date: { $gte: prevMonthStart, $lt: prevMonthEnd } } },
                    { $group: { _id: null, total: { $sum: 1 } } }
                ]),
                EnrollmentModel.aggregate([
                    { $match: {} },
                    { $group: { _id: "$roadmap", enrollments: { $sum: 1 } } },
                    { $sort: { enrollments: -1 } },
                    { $limit: 1 },
                    {
                        $lookup: {
                            from: "roadmaps",
                            localField: "_id",
                            foreignField: "_id",
                            as: "roadmap"
                        }
                    },
                    { $unwind: { path: "$roadmap", preserveNullAndEmptyArrays: true } },
                    { $project: { roadmapId: { $toString: "$_id" }, title: "$roadmap.title", enrollments: 1 } }
                ])
            ]);

            const enrollmentsThisMonth = (thisMonthAgg[0]?.total as number) ?? 0;
            const enrollmentsPrevMonth = (prevMonthAgg[0]?.total as number) ?? 0;
            const pctChange = enrollmentsPrevMonth === 0 ? (enrollmentsThisMonth === 0 ? 0 : 100) : ((enrollmentsThisMonth - enrollmentsPrevMonth) / enrollmentsPrevMonth) * 100;

            const topRoadmap = topRoadmapAgg[0] ? {
                roadmapId: topRoadmapAgg[0].roadmapId,
                title: topRoadmapAgg[0].title,
                enrollments: topRoadmapAgg[0].enrollments
            } : null;

            return {
                enrollmentsThisMonth,
                pctChange: Math.round(pctChange * 100) / 100,
                topRoadmap
            };
        } catch (err: any) {
            throw AppError.internalServerError("Lỗi khi lấy overview đăng ký", err?.message);
        }
    }

    /**
     * BƯỚC 4: getRevenueChart
     * Trả về mảng time series: [{ periodStart: Date, revenue: number, orders: number }]
     * - Chỉ implement period = 'month' và 'day' đơn giản (đủ cho dashboard)
     */
    async getRevenueChart(period: string, range: number): Promise<ITimeSeriesItem[]> {
        try {
            const now = new Date();
            const items: Array<{ periodStart: Date; revenue: number; orders: number }> = [];

            if (period === "month") {
                for (let i = range - 1; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const start = new Date(d.getFullYear(), d.getMonth(), 1);
                    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

                    const agg = await PaymentModel.aggregate([
                        { $match: { status: "success", payment_date: { $gte: start, $lt: end } } },
                        { $group: { _id: null, total: { $sum: "$amount" }, orders: { $sum: 1 } } }
                    ]);
                    items.push({
                        periodStart: start,
                        revenue: (agg[0]?.total as number) ?? 0,
                        orders: (agg[0]?.orders as number) ?? 0
                    });
                }
            } else if (period === "day") {
                for (let i = range - 1; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

                    const agg = await PaymentModel.aggregate([
                        { $match: { status: "success", payment_date: { $gte: start, $lt: end } } },
                        { $group: { _id: null, total: { $sum: "$amount" }, orders: { $sum: 1 } } }
                    ]);
                    items.push({
                        periodStart: start,
                        revenue: (agg[0]?.total as number) ?? 0,
                        orders: (agg[0]?.orders as number) ?? 0
                    });
                }
            } else {
                // fallback: month
                return this.getRevenueChart("month", range);
            }

            return items;
        } catch (err: any) {
            throw AppError.internalServerError("Lỗi khi tạo dữ liệu biểu đồ doanh thu", err?.message);
        }
    }

    /**
     * BƯỚC 5: getNewUsersChart
     * Trả về mảng time series: [{ periodStart: Date, newUsers: number }]
     */
    async getNewUsersChart(period: string, range: number): Promise<ITimeSeriesItem[]> {
        try {
            const now = new Date();
            const items: Array<{ periodStart: Date; newUsers: number }> = [];

            if (period === "month") {
                for (let i = range - 1; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const start = new Date(d.getFullYear(), d.getMonth(), 1);
                    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

                    const count = await UserModel.countDocuments({ createdAt: { $gte: start, $lt: end } });
                    items.push({ periodStart: start, newUsers: count });
                }
            } else if (period === "day") {
                for (let i = range - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

                    const count = await UserModel.countDocuments({ createdAt: { $gte: start, $lt: end } });
                    items.push({ periodStart: start, newUsers: count });
                }
            } else {
                return this.getNewUsersChart("month", range);
            }

            return items;
        } catch (err: any) {
            throw AppError.internalServerError("Lỗi khi tạo dữ liệu biểu đồ người dùng mới", err?.message);
        }
    }

    /**
     * BƯỚC 6: getEnrollmentsChart
     * - Nếu breakdown=false: trả [{ periodStart, enrollments }]
     * - Nếu breakdown=true: trả [{ periodStart, breakdown: [{ roadmapId, title, enrollments }] }]
     */
    async getEnrollmentsChart(period: string, range: number, breakdownByRoadmap: boolean, topN: number): Promise<ITimeSeriesItem[]> {
        try {
            const now = new Date();
            const items: any[] = [];

            if (!breakdownByRoadmap) {
                // đơn giản giống revenue chart nhưng count enrollments
                if (period === "month") {
                    for (let i = range - 1; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const start = new Date(d.getFullYear(), d.getMonth(), 1);
                        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

                        const agg = await EnrollmentModel.aggregate([
                            { $match: { enrolled_date: { $gte: start, $lt: end } } },
                            { $group: { _id: null, total: { $sum: 1 } } }
                        ]);

                        items.push({ periodStart: start, enrollments: (agg[0]?.total as number) ?? 0 });
                    }
                } else {
                    // fallback to month
                    return this.getEnrollmentsChart("month", range, false, topN);
                }
            } else {
                // breakdown by roadmap: for each period, compute top N roadmap enrollments
                if (period === "month") {
                    for (let i = range - 1; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const start = new Date(d.getFullYear(), d.getMonth(), 1);
                        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

                        const agg = await EnrollmentModel.aggregate([
                            { $match: { enrolled_date: { $gte: start, $lt: end } } },
                            { $group: { _id: "$roadmap", enrollments: { $sum: 1 } } },
                            { $sort: { enrollments: -1 } },
                            { $limit: topN },
                            {
                                $lookup: {
                                    from: "roadmaps",
                                    localField: "_id",
                                    foreignField: "_id",
                                    as: "roadmap"
                                }
                            },
                            { $unwind: { path: "$roadmap", preserveNullAndEmptyArrays: true } },
                            { $project: { roadmapId: { $toString: "$_id" }, title: "$roadmap.title", enrollments: 1 } }
                        ]);

                        items.push({ periodStart: start, breakdown: agg.map(a => ({ roadmapId: a.roadmapId, title: a.title, enrollments: a.enrollments })) });
                    }
                } else {
                    return this.getEnrollmentsChart("month", range, true, topN);
                }
            }

            return items;
        } catch (err: any) {
            throw AppError.internalServerError("Lỗi khi tạo dữ liệu biểu đồ đăng ký", err?.message);
        }
    }

    /**
     * BƯỚC 7: getTopRoadmaps
     * Trả về top N roadmap: { roadmapId, title, enrollments, revenue, average_rating }
     */
    async getTopRoadmaps(limit: number = 10): Promise<ITopRoadmapItem[]> {
        try {
            // B1: enrollments per roadmap
            const enrollAgg = await EnrollmentModel.aggregate([
                { $group: { _id: "$roadmap", enrollments: { $sum: 1 } } },
                { $sort: { enrollments: -1 } },
                { $limit: limit }
            ]);

            const roadmapIds = enrollAgg.map(e => e._id);

            // B2: lookup roadmap details and revenue (payments)
            const paymentsAgg = await PaymentModel.aggregate([
                { $match: { status: "success", roadmap: { $in: roadmapIds } } },
                { $group: { _id: "$roadmap", revenue: { $sum: "$amount" } } }
            ]);

            const roadmapDocs = await RoadmapModel.find({ _id: { $in: roadmapIds } }).lean();

            // build map for quick lookup
            const enrollMap = new Map<string, number>();
            enrollAgg.forEach(e => enrollMap.set(String(e._id), e.enrollments));
            const revenueMap = new Map<string, number>();
            paymentsAgg.forEach(p => revenueMap.set(String(p._id), p.revenue));
            const roadmapMap = new Map<string, any>();
            roadmapDocs.forEach(r => roadmapMap.set(String(r._id), r));

            const items = roadmapIds.map((rid: any) => {
                const idStr = String(rid);
                const doc = roadmapMap.get(idStr);
                return {
                    roadmapId: idStr,
                    title: doc?.title ?? "Unknown",
                    enrollments: enrollMap.get(idStr) ?? 0,
                    revenue: revenueMap.get(idStr) ?? 0,
                    average_rating: doc?.average_rating ?? 0
                };
            });

            return items;
        } catch (err: any) {
            throw AppError.internalServerError("Lỗi khi lấy danh sách top roadmap", err?.message);
        }
    }
}

// --- Thêm interface cho kết quả (tăng typesafety)
export interface IRevenueOverview {
    totalRevenueThisMonth: number;
    pctChangeFromPrevMonth: number;
    totalRevenueYTD: number;
    ordersCount: number;
    aov: number;
}
export interface IUserOverview {
    totalUsers: number;
    newUsersThisMonth: number;
    growthPct: number;
}
export interface ITopRoadmapMini {
    roadmapId: string;
    title?: string;
    enrollments: number;
}
export interface IEnrollmentOverview {
    enrollmentsThisMonth: number;
    pctChange: number;
    topRoadmap?: ITopRoadmapMini | null;
}
export interface ITimeSeriesBreakdownItem {
    roadmapId: string;
    title: string;
    enrollments: number;
}
export interface ITimeSeriesItem {
    periodStart: Date;
    revenue?: number;
    orders?: number;
    newUsers?: number;
    enrollments?: number;
    breakdown?: ITimeSeriesBreakdownItem[];
}
export interface ITopRoadmapItem {
    roadmapId: string;
    title: string;
    enrollments: number;
    revenue: number;
    average_rating: number;
}

export default StatisticsService;
