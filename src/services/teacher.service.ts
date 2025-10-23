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
        const { phone, password, name, gender, avatar, experience_years, qualifications } = teacherInfo;

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
            experience_years: experience_years || 0,  // ✅ Không cần transform
            qualifications: qualifications || [],
        });

        // Populate user để trả về cùng structure với getTeacherList
        const populatedTeacher = await TeacherModel.findById(teacher._id)
            .populate("user", "name phone avatar gender _id")
            .lean();

        return {
            ...populatedTeacher,
            _id: populatedTeacher!._id.toString(),
            user: {
                ...populatedTeacher!.user,
                _id: populatedTeacher!.user._id.toString()
            }
        };
    };

    updateTeacherInfoByAdmin = async (userId: string, updateData: UpdateTeacherByAdminReqDto) => {
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

        // Populate user để trả về cùng structure
        const populatedTeacher = await TeacherModel.findById(teacherExists._id)
            .populate("user", "name phone avatar gender _id")
            .lean();

        return {
            ...populatedTeacher,
            _id: populatedTeacher!._id.toString(),
            user: {
                ...populatedTeacher!.user,
                _id: populatedTeacher!.user._id.toString()
            }
        };
    };

    getTeacherList = async () => {
        const teachers = await TeacherModel.find()
            .populate("user", "name phone avatar gender _id")
            .lean();

        return teachers.map((teacher) => ({
            ...teacher,
            _id: teacher._id.toString(),
            user: {
                ...teacher.user,
                _id: teacher.user._id.toString()
            }
        }));
    };

    getTeacherById = async (userId: string) => {
        const teacher = await TeacherModel.findOne({ user: userId })
            .populate("user", "name phone avatar gender");

        if (!teacher) {
            throw AppError.notFoundError("Giảng viên không tồn tại");
        }

        return {
            ...teacher.toObject(),
            _id: teacher._id.toString()
        };
    };

    async setTeacherStatus(teacherIds: string[], status: EmploymentStatus) {
        if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
            throw AppError.badRequestError("Danh sách teacherIds không hợp lệ");
        }

        const objectIds = teacherIds.map(id => new mongoose.Types.ObjectId(id));

        // Lấy danh sách teachers để lấy user IDs
        const teachers = await TeacherModel.find({ _id: { $in: objectIds } }).select("user").lean();
        const userIds = teachers.map(t => t.user);

        // Cập nhật Teacher employment_status
        const resultTeacher = await TeacherModel.updateMany(
            { _id: { $in: objectIds } },
            { $set: { employment_status: status } }
        );

        // Cập nhật User isActive (active = true, inactive = false)
        const isActive = status === EmploymentStatus.ACTIVE;
        await UserModel.updateMany(
            { _id: { $in: userIds } },
            { $set: { isActive } }
        );

        // Lấy danh sách giảng viên sau khi update
        const updatedTeachers = await TeacherModel.find(
            { _id: { $in: objectIds } },
            "_id user employment_status"
        ).lean();

        return {
            modifiedCount: resultTeacher.modifiedCount,
            updatedTeachers: updatedTeachers.map(t => ({
                ...t,
                _id: t._id.toString(),
                user: t.user.toString()
            }))
        };
    }
}

export default TeacherService;