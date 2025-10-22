import { injectable } from "tsyringe";
import SectionModel from "../models/section.model";
import LessonModel from "../models/lesson.model";
import AppError from "../utils/AppError";
import { CreateSectionReqDto, UpdateSectionReqDto } from "../dtos/request/section.request.dto";

@injectable()
class SectionService {
    createSection = async (dto: CreateSectionReqDto) => {
        const lesson = await LessonModel.findById(dto.lesson_id);
        if (!lesson) {
            throw AppError.notFoundError("Bài học không tồn tại");
        }

        const existingSection = await SectionModel.findOne({
            lesson_id: dto.lesson_id,
            order: dto.order
        });

        if (existingSection) {
            throw AppError.conflictError(`Thứ tự ${dto.order} đã tồn tại trong bài học này`);
        }

        const section = await SectionModel.create(dto);

        await LessonModel.findByIdAndUpdate(
            dto.lesson_id,
            { $inc: { total_sections: 1 } }
        );

        return {
            ...section.toObject(),
            _id: section._id.toString(),
            lesson_id: section.lesson_id.toString(),
            ...(section.test_id && { test_id: section.test_id.toString() })
        };
    };

    getSectionList = async (page: number = 1, limit: number = 10, filters?: any) => {
        const query: any = {};

        if (filters?.lesson_id) {
            query.lesson_id = filters.lesson_id;
        }

        const [total, sections] = await Promise.all([
            SectionModel.countDocuments(query),
            SectionModel.find(query)
                .sort({ lesson_id: 1, order: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        const data = sections.map(section => ({
            ...section,
            _id: section._id.toString(),
            lesson_id: section.lesson_id.toString(),
            ...(section.test_id && { test_id: section.test_id.toString() })
        }));

        return { total, page, limit, data };
    };

    getSectionById = async (id: string) => {
        const section = await SectionModel.findById(id).lean();
        if (!section) {
            throw AppError.notFoundError("Section không tồn tại");
        }

        return {
            ...section,
            _id: section._id.toString(),
            lesson_id: section.lesson_id.toString(),
            ...(section.test_id && { test_id: section.test_id.toString() })
        };
    };

    updateSection = async (id: string, dto: UpdateSectionReqDto) => {
        const section = await SectionModel.findById(id);
        if (!section) {
            throw AppError.notFoundError("Section không tồn tại");
        }

        if (dto.order !== undefined && dto.order !== section.order) {
            const existingSection = await SectionModel.findOne({
                lesson_id: section.lesson_id,
                order: dto.order,
                _id: { $ne: id }
            });

            if (existingSection) {
                throw AppError.conflictError(`Thứ tự ${dto.order} đã tồn tại trong bài học này`);
            }
        }

        Object.assign(section, dto);
        await section.save();

        return {
            ...section.toObject(),
            _id: section._id.toString(),
            lesson_id: section.lesson_id.toString(),
            ...(section.test_id && { test_id: section.test_id.toString() })
        };
    };

    deleteSection = async (id: string) => {
        const section = await SectionModel.findById(id);
        if (!section) {
            throw AppError.notFoundError("Section không tồn tại");
        }

        await SectionModel.findByIdAndDelete(id);

        await LessonModel.findByIdAndUpdate(
            section.lesson_id,
            { $inc: { total_sections: -1 } }
        );

        return {
            message: "Xóa section thành công",
            deletedId: id
        };
    };
}

export default SectionService;
