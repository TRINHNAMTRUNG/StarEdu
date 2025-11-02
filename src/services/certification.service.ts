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
        return {
            ...certification.toObject(),
            _id: certification._id.toString()
        };
    };

    /**
     * Lấy danh sách chứng chỉ (không phân trang)
     */
    getCertifications = async () => {
        const certifications = await CertificationModel.find().lean();
        return certifications.map(cert => ({
            ...cert,
            _id: cert._id.toString()
        }));
    };

    /**
     * Cập nhật chứng chỉ
     */
    updateCertification = async (id: string, dto: UpdateCertificationReqDto) => {
        if (!mongoose.isValidObjectId(id)) {
            throw AppError.badRequestError("ID chứng chỉ không hợp lệ");
        }

        const updated = await CertificationModel.findByIdAndUpdate(
            id,
            { $set: dto },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) {
            throw AppError.notFoundError("Chứng chỉ không tồn tại");
        }

        return {
            ...updated,
            _id: updated._id.toString()
        };
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
