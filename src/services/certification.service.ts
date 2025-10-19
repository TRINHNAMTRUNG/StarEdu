import { injectable } from "tsyringe";
import CertificationModel from "../models/certification.model";
import { CreateCertificationReqDto, UpdateCertificationReqDto } from "../dtos/request/certification.request.dto";
import AppError from "../utils/AppError";
import mongoose from "mongoose";

@injectable()
class CertificationService {
    /**
     * Tạo mới chứng chỉ
     */
    createCertification = async (dto: CreateCertificationReqDto) => {
        const certification = await CertificationModel.create(dto);
        return certification.toObject();
    };

    /**
     * Lấy danh sách chứng chỉ (có phân trang)
     */
    getCertificationList = async (page: number = 1, limit: number = 10) => {
        const [total, certifications] = await Promise.all([
            CertificationModel.countDocuments(),
            CertificationModel.find()
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return { total, page, limit, data: certifications };
    };

    /**
     * Cập nhật chứng chỉ
     */
    updateCertification = async (id: string, dto: UpdateCertificationReqDto) => {
        if (!mongoose.isValidObjectId(id)) {
            throw AppError.badRequestError("ID chứng chỉ không hợp lệ");
        }

        const certification = await CertificationModel.findByIdAndUpdate(
            id,
            { $set: dto },
            { new: true }
        ).lean();

        if (!certification) {
            throw AppError.notFoundError("Chứng chỉ không tồn tại");
        }

        return certification;
    };

    /**
     * Xóa chứng chỉ
     */
    deleteCertification = async (id: string) => {
        if (!mongoose.isValidObjectId(id)) {
            throw AppError.badRequestError("ID chứng chỉ không hợp lệ");
        }

        const result = await CertificationModel.findByIdAndDelete(id);

        if (!result) {
            throw AppError.notFoundError("Chứng chỉ không tồn tại");
        }

        return { message: "Xóa chứng chỉ thành công", deletedId: id };
    };
}

export default CertificationService;
