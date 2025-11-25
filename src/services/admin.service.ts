import { injectable } from "tsyringe";
import { StudentRegisterReqDto } from "../dtos/request/Auth.request.dto";
import UserModel, { UserRole } from "../models/user.model";
import AppError from "../utils/AppError";
import InfobipService from "./infobip.service";
import { encryptPassword } from "../utils/password.util";
import StudentService from "./student.service";
import TeacherService from "./teacher.service";

@injectable()
class AdminService {
    constructor(
        private studentService: StudentService,
        private teacherService: TeacherService // Inject TeacherService
    ) { }


}

export default AdminService;