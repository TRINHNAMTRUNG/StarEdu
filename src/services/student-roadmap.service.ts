import { injectable } from "tsyringe";
import RoadmapModel from "../models/roadmap.model";
import AppError from "../utils/AppError";

@injectable()
class StudentRoadmapService {
    // API #4: Lay roadmaps cong khai
    getPublicRoadmaps = async (page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {
            is_published: true
        };

        // Filter by target_score
        if (filters?.min_target_score) {
            query.target_score = { $gte: Number(filters.min_target_score) };
        }
        if (filters?.max_target_score) {
            query.target_score = { ...query.target_score, $lte: Number(filters.max_target_score) };
        }

        // Filter by price
        if (filters?.min_price) {
            query.price = { $gte: Number(filters.min_price) };
        }
        if (filters?.max_price) {
            query.price = { ...query.price, $lte: Number(filters.max_price) };
        }

        // Filter by skill_groups
        if (filters?.skill_groups) {
            const skillGroups = Array.isArray(filters.skill_groups)
                ? filters.skill_groups
                : [filters.skill_groups];
            query.skill_groups = { $in: skillGroups };
        }

        // Sort
        let sort: any = { createdAt: -1 };
        if (filters?.sortBy === 'cheapest') {
            sort = { price: 1 };
        } else if (filters?.sortBy === 'popular') {
            sort = { total_enrollments: -1 };
        }

        const [total, roadmaps] = await Promise.all([
            RoadmapModel.countDocuments(query),
            RoadmapModel.find(query)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        const data = roadmaps.map(roadmap => {
            const final_price = roadmap.price * (1 - roadmap.discount_percentage / 100);
            return {
                _id: roadmap._id.toString(),
                title: roadmap.title,
                description: roadmap.description,
                skill_groups: roadmap.skill_groups,
                target_score: roadmap.target_score,
                price: roadmap.price,
                discount_percentage: roadmap.discount_percentage,
                final_price: Math.round(final_price),
                total_courses: roadmap.courses.length,
                total_enrollments: roadmap.total_enrollments
            };
        });

        return { total, page, limit, data };
    };

    // API #5: Lay chi tiet roadmap cong khai
    getRoadmapById = async (roadmapId: string) => {
        const roadmap = await RoadmapModel.findById(roadmapId)
            .populate({
                path: "courses",
                select: "title thumbnail skill_groups assigned_teachers",
                populate: {
                    path: "assigned_teachers",
                    select: "user experience_years",
                    populate: {
                        path: "user",
                        select: "name avatar"
                    }
                }
            })
            .lean();

        if (!roadmap) {
            throw AppError.notFoundError("Lộ trình không tồn tại");
        }

        if (!roadmap.is_published) {
            throw AppError.forbiddenError("Lộ trình chưa được xuất bản");
        }

        const final_price = roadmap.price * (1 - roadmap.discount_percentage / 100);

        // Type guard va transform courses
        const courses = (roadmap.courses as any[]).map((course: any) => ({
            _id: course._id.toString(),
            title: course.title,
            thumbnail: course.thumbnail,
            skill_groups: course.skill_groups,
            assigned_teachers: course.assigned_teachers?.map((teacher: any) => ({
                _id: teacher._id.toString(),
                name: teacher.user?.name || "",
                avatar: teacher.user?.avatar || null,
                experience_years: teacher.experience_years || 0
            })) || []
        }));

        return {
            _id: roadmap._id.toString(),
            title: roadmap.title,
            description: roadmap.description,
            skill_groups: roadmap.skill_groups,
            target_score: roadmap.target_score,
            price: roadmap.price,
            discount_percentage: roadmap.discount_percentage,
            final_price: Math.round(final_price),
            total_courses: courses.length,
            courses,
            total_enrollments: roadmap.total_enrollments
        };
    };
}

export default StudentRoadmapService;
