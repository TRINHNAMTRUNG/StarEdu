import { injectable } from "tsyringe";
import { NextFunction, Request, Response } from "express";
import TeacherService from "../services/teacher.service";
import ResponseFormat from "../utils/ResponseFormat";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { CreateTeacherReqDto, IdParamDto, SetTeacherStatusReqDto, UpdateTeacherByAdminReqDto } from "../dtos/request/Teacher.request.dto";
import { CreateTeacherResDto, UpdateTeacherResDto, GetTeacherListResDto, SetTeacherStatusResDto } from "../dtos/response/Teacher.response.dto";

@injectable()
class TeacherController {
    constructor(private readonly teacherService: TeacherService) {}

    createTeacher = asyncHandler(async (req: Request, res: Response) => {
        const dto: CreateTeacherReqDto = req.body;
        const result = await this.teacherService.createTeacher(dto);

        const response = instanceToPlain(
            plainToInstance(CreateTeacherResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo giảng viên thành công", 201, req.requestId)
        );
    });

    updateTeacherInfoByAdmin = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const dto: UpdateTeacherByAdminReqDto = req.body;
        const result = await this.teacherService.updateTeacherInfoByAdmin(userId, dto);

        const response = instanceToPlain(
            plainToInstance(UpdateTeacherResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Cập nhật thông tin giảng viên thành công", 200, req.requestId)
        );
    });

    getTeacherList = asyncHandler(
        async (req: Request, res: Response) => {
            const result = await this.teacherService.getTeacherList();

            const response = instanceToPlain(
                plainToInstance(GetTeacherListResDto, { data: result }, { excludeExtraneousValues: true })
            );

            return res.status(200).json(
                ResponseFormat.successResponse(response, "Lấy danh sách giảng viên thành công", 200, req.requestId)
            );
        }
    );
    setTeacherStatus = asyncHandler(
        async (req: Request<{}, {}, SetTeacherStatusReqDto>, res: Response, next: NextFunction) => {
            const { teacherIds, status } = req.body;
            const result = await this.teacherService.setTeacherStatus(teacherIds, status);

            const response = instanceToPlain(
                plainToInstance(SetTeacherStatusResDto, result, { excludeExtraneousValues: true })
            );

            return res.status(200).json(
                ResponseFormat.successResponse(
                    response,
                    "Cập nhật trạng thái giảng viên thành công",
                    200,
                    req.requestId
                )
            );
        }
    );
}

export default TeacherController;