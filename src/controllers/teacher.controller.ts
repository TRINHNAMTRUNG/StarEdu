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
    constructor(private teacherService: TeacherService) { }

    createTeacher = asyncHandler(
        async (req: Request<{}, {}, CreateTeacherReqDto>, res: Response, next: NextFunction) => {
            const teacherInfo: CreateTeacherReqDto = req.body;
            const { user, teacher } = await this.teacherService.createTeacher(teacherInfo);

            // Chuẩn hóa đầu ra dto
            const teacherResDto = instanceToPlain(
                plainToInstance(
                    CreateTeacherResDto,
                    { phone: user.phone, name: user.name, avatar: user.avatar, teacher },
                    { excludeExtraneousValues: true }
                )
            );

            return res.status(201).json(
                ResponseFormat.successResponse(
                    teacherResDto,
                    "Tạo giảng viên thành công",
                    201,
                    req.requestId
                )
            );
        }
    );

    updateTeacherInfoByAdmin = asyncHandler(
        async (req: Request<IdParamDto, {}, UpdateTeacherByAdminReqDto>, res: Response, next: NextFunction) => {
            const { userId } = req.params;
            const updateData: UpdateTeacherByAdminReqDto = req.body;

            const { user, teacher } = await this.teacherService.updateTeacherInfoByAdmin(userId, updateData);

            // Chuẩn hóa đầu ra dto
            const teacherResDto = instanceToPlain(
                plainToInstance(
                    UpdateTeacherResDto,
                    { phone: user.phone, name: user.name, avatar: user.avatar, teacher },
                    { excludeExtraneousValues: true }
                )
            );

            return res.status(200).json(
                ResponseFormat.successResponse(
                    teacherResDto,
                    "Cập nhật thông tin giảng viên thành công",
                    200,
                    req.requestId
                )
            );
        }
    );

    getTeacherList = asyncHandler(
        async (req: Request, res: Response, next: NextFunction) => {
            const teachers = await this.teacherService.getTeacherList();

            // Chuẩn hóa đầu ra dto
            const teacherListResDto = instanceToPlain(
                plainToInstance(
                    GetTeacherListResDto,
                    { data: teachers },
                    { excludeExtraneousValues: true }
                )
            );

            return res.status(200).json(
                ResponseFormat.successResponse(
                    teacherListResDto.data,
                    "Lấy danh sách giảng viên thành công",
                    200,
                    req.requestId
                )
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