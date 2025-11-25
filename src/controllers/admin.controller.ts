import { injectable } from "tsyringe";
import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import ResponseFormat from "../utils/ResponseFormat";
import { instanceToPlain, plainToInstance } from "class-transformer";
import AdminService from "../services/admin.service";
import { CreateTeacherReqDto } from "../dtos/request/Teacher.request.dto";


@injectable()
export class AdminController {
    constructor(
        private adminService: AdminService
    ) { }


}
