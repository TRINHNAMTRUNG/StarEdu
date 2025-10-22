import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import CertificationService from "../services/certification.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    CreateCertificationResDto,
    GetCertificationListResDto,
    UpdateCertificationResDto,
    DeleteCertificationResDto
} from "../dtos/response/certification.response.dto";
import { CreateCertificationReqDto, UpdateCertificationReqDto } from "../dtos/request/certification.request.dto";
import ResponseFormat from "../utils/ResponseFormat";

@injectable()
class CertificationController {
    constructor(private readonly certificationService: CertificationService) { }

    // POST /admin/certifications
    createCertification = asyncHandler(async (req: Request<{}, {}, CreateCertificationReqDto>, res: Response) => {
        const certificationInfo: CreateCertificationReqDto = req.body;
        const result = await this.certificationService.createCertification(certificationInfo);

        // Chuẩn hóa đầu ra DTO
        const response = instanceToPlain(
            plainToInstance(CreateCertificationResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo chứng chỉ thành công", 201, req.requestId)
        );
    });

    // GET /admin/certifications
    getCertificationList = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.certificationService.getCertifications();

        const response = instanceToPlain(
            plainToInstance(GetCertificationListResDto, { data: result }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách chứng chỉ thành công", 200, req.requestId)
        );
    });

    // PATCH /admin/certifications/:id
    updateCertification = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const updateData: UpdateCertificationReqDto = req.body;
        const result = await this.certificationService.updateCertification(id, updateData);

        // Chuẩn hóa đầu ra DTO
        const response = instanceToPlain(
            plainToInstance(UpdateCertificationResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật chứng chỉ thành công", 200, req.requestId)
        );
    });

    // DELETE /admin/certifications/:id
    deleteCertification = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await this.certificationService.deleteCertification(id);

        // Chuẩn hóa đầu ra DTO
        const response = instanceToPlain(
            plainToInstance(DeleteCertificationResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa chứng chỉ thành công", 200, req.requestId)
        );
    });
}

export default CertificationController;
