
import { injectable } from "tsyringe";
import TeacherModel, { EmploymentStatus } from "../models/teacher.model";
import AppError from "../utils/AppError";
import { CreateTeacherReqDto, UpdateTeacherByAdminReqDto } from "../dtos/request/Teacher.request.dto";
import UserModel, { UserRole } from "../models/user.model";
import { encryptPassword } from "../utils/password.util";
import mongoose from "mongoose";

@injectable()
class TeacherService {
    createTeacher = async (teacherInfo: CreateTeacherReqDto) => {
        const { phone, password, name, gender, avatar, experienceYears, qualifications } = teacherInfo;

        // Kiểm tra xem tài khoản đã tồn tại chưa
        const existingUser = await UserModel.findOne({ phone });
        if (existingUser) {
            throw AppError.conflictError("Số điện thoại đã được sử dụng");
        }

        // Tạo tài khoản người dùng
        const encryptedPassword = await encryptPassword(password);
        const user = await UserModel.create({
            phone,
            password: encryptedPassword,
            name,
            gender,
            avatar,
            role: UserRole.TEACHER,
            isVerified: true
        });

        // Tạo Teacher mới
        const teacher = await TeacherModel.create({
            user: user._id.toString(),
            experienceYears: experienceYears || 0,
            qualifications: qualifications || [],
        });

        return { user: user.toObject(), teacher: teacher.toObject() };
    };

    updateTeacherInfoByAdmin = async (userId: string, updateData: UpdateTeacherByAdminReqDto) => {
        // Kiểm tra xem giảng viên có tồn tại không
        // Kiểm tra xem user có tồn tại không
        const [teacherExists, userExists] = await Promise.all([
            TeacherModel.findOne({ user: userId }),
            UserModel.findById(userId)
        ]);
        if (!teacherExists) {
            throw AppError.notFoundError("Giảng viên không tồn tại");
        }
        if (!userExists) {
            throw AppError.notFoundError("Người dùng không tồn tại");
        }

        // Cập nhật thông tin User nếu có
        const { name, phone, avatar, gender, ...teacherUpdateData } = updateData;

        if (name || phone || avatar || gender) {
            // Nếu phone thay đổi, kiểm tra xem số điện thoại mới có tồn tại không
            if (phone && phone !== userExists.phone) {
                const phoneExists = await UserModel.exists({ phone });
                if (phoneExists) throw AppError.conflictError("Số điện thoại đã được sử dụng");
            }

            Object.assign(userExists, {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(avatar && { avatar }),
                ...(gender && { gender })
            });
            await userExists.save();
        }

        // Cập nhật thông tin Teacher
        if (Object.keys(teacherUpdateData).length) {
            Object.assign(teacherExists, teacherUpdateData);
            await teacherExists.save();
        }

        return { user: userExists, teacher: teacherExists };
    };

    getTeacherList = async () => {
        // Lấy danh sách giảng viên
        const teachers = await TeacherModel.find()
            .populate("user", "name phone avatar gender")
            .lean();

        return teachers.map((teacher) => ({
            ...teacher,
            user: teacher.user
        }));
    };

    getTeacherById = async (userId: string) => {
        // Lấy giảng viên theo id
        const teacher = await TeacherModel.findOne({ user: userId })
            .populate("user", "name phone avatar gender");

        if (!teacher) {
            throw AppError.notFoundError("Giảng viên không tồn tại");
        }

        return teacher.toObject();
    };

    async setTeacherStatus(
        teacherIds: string[],
        status: EmploymentStatus
    ): Promise<{ modifiedCount: number; updatedTeachers: any[] }> {

        if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
            throw AppError.badRequestError("Danh sách teacherIds không hợp lệ");
        }

        const objectIds = teacherIds.map(id => new mongoose.Types.ObjectId(id));

        // Cập nhật
        const result = await TeacherModel.updateMany(
            { _id: { $in: objectIds } },
            { $set: { employment_status: status } }
        );

        // Lấy danh sách giảng viên sau khi update
        const updatedTeachers = await TeacherModel.find(
            { _id: { $in: objectIds } },
            "_id user employment_status"
        ).lean();

        return {
            modifiedCount: result.modifiedCount,
            updatedTeachers
        };
    }
}

export default TeacherService;