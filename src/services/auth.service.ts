import { injectable } from "tsyringe";
import { StudentRegisterReqDto } from "../dtos/request/Auth.request.dto";
import UserModel, { UserRole } from "../models/user.model";
import AppError from "../utils/AppError";
import InfobipService from "./infobip.service";
import { encryptPassword } from "../utils/password.util";
import StudentService from "./student.service";
import TeacherService from "./teacher.service";
import { JwtUserPayload, verifyRefreshToken, generateTokens } from "../utils/token.util";
import RefreshTokenModel from "../models/refreshToken.model";
import mongoose from "mongoose";

@injectable()
class AuthService {
    constructor(
        private infobipService: InfobipService,
        private studentService: StudentService,
        private teacherService: TeacherService // Inject TeacherService
    ) { }

    /**
     * --------------
     *  STUDENT APIs
     * --------------
     */

    registerStudentByPhone = async (userInfo: StudentRegisterReqDto) => {
        console.log("Registering student:", userInfo);
        let { phone, password } = userInfo;

        // Kiểm tra student đã đăng kí tài khoản chưa
        let hasAccount = await UserModel.findOne({ phone });
        if (hasAccount) {
            throw AppError.conflictError("Số điện thoại đã được sử dụng");
        }

        // Chưa đăng kí, tạo mới account
        let encryptedPassword = await encryptPassword(password);
        const account = await UserModel.create({ ...userInfo, password: encryptedPassword, role: UserRole.STUDENT });

        // Gửi OTP xác thực đến số điện thoại
        let phoneNumberReplace = phone.replace("0", "84");
        console.log("Sending OTP to:", phoneNumberReplace);
        // const smsPinId = await this.infobipService.sendOTP(phoneNumberReplace);
        const smsPinId = await this.infobipService.mockSendOTP(phoneNumberReplace);

        // Lưu pinId trả về từ infobip vào database
        account.pinId = smsPinId;
        await account.save();

        return account.toObject();
    }

    verifyAccountOtp = async (phone: string, code: string) => {
        // Kiểm tra sự tồn tại của tài khoản
        let hasAccount = await UserModel.findOne({ phone }, { password: 0, createdAt: 0, updatedAt: 0, role: 0 });
        if (!hasAccount) {
            throw AppError.conflictError("Số điện thoại chưa được đăng ký");
        }
        if (hasAccount.isVerified) {
            throw AppError.badRequestError("Tài khoản đã được xác thực");
        }

        // Xác minh OTP
        if (!hasAccount.pinId) {
            throw AppError.badRequestError("Tài khoản chưa được gửi mã OTP");
        }
        // const verifyResult: boolean = await this.infobipService.verifyOTP(hasAccount.pinId, code);
        const verifyResult: boolean = await this.infobipService.mockVerifyOTP(hasAccount.pinId, code);
        if (!verifyResult) {
            throw AppError.unauthorizedError("Mã OTP không hợp lệ");
        }

        // Cập nhật trạng thái tài khoản đã xác thực
        hasAccount.isVerified = true;
        hasAccount.pinId = undefined; // Xoá pinId đã sử dụng
        const user = await hasAccount.save();
        this.studentService.createStudentWithUserId(user._id.toString(), "Beginner", 0);
        return { ...user.toObject(), ...generateTokens({ id: user._id.toString(), role: user.role }) };
    }

    login = async (phone: string, password: string) => {
        // Kiểm tra sự tồn tại của tài khoản
        let hasAccount = await UserModel
            .findOne({ phone })
            .select("+password +isActive +isVerified");
        if (!hasAccount) {
            throw AppError.conflictError("Số điện thoại chưa được đăng ký");
        }

        if (!hasAccount.isActive) {
            throw AppError.forbiddenError("Tài khoản đã bị khoá");
        }

        if (!hasAccount.isVerified) {
            throw AppError.unauthorizedError("Tài khoản chưa được xác thực");
        }

        // Kiểm tra mật khẩu
        const isPasswordValid = await hasAccount.comparePassword(password);
        if (!isPasswordValid) {
            throw AppError.unauthorizedError("Mật khẩu không đúng");
        }
        return { ...hasAccount.toObject(), ...generateTokens({ id: hasAccount._id.toString(), role: hasAccount.role }) };
    }

    logout = async (refreshToken: string) => {
        if (!refreshToken) {
            throw AppError.badRequestError("Thiếu refresh token trong yêu cầu");
        }

        // Xác thực refresh token
        let payload: JwtUserPayload;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (err) {
            // verifyRefreshToken đã tự throw lỗi AppError nên chỉ cần bắt lại
            throw err;
        }

        // Kiểm tra xem token có tồn tại trong DB không
        const tokenRecord = await RefreshTokenModel.findOne({
            user: payload.id,
            token: refreshToken
        });

        if (!tokenRecord) {
            throw AppError.notFoundError("Refresh token không tồn tại hoặc đã bị thu hồi");
        }

        if (tokenRecord.isRevoked) {
            throw AppError.unauthorizedError("Refresh token này đã bị thu hồi trước đó");
        }

        // Đánh dấu token đã bị thu hồi
        tokenRecord.isRevoked = true;
        await tokenRecord.save();

        return { message: "Đăng xuất thành công" };
    };


    logoutAllDevices = async (userInfo: JwtUserPayload) => {
        if (!userInfo || !userInfo.id) {
            throw AppError.badRequestError("Thiếu thông tin người dùng");
        }

        // Tìm tất cả refresh token còn hiệu lực của user
        const tokens = await RefreshTokenModel.find({
            user: userInfo.id,
            isRevoked: false
        });

        if (tokens.length === 0) {
            throw AppError.notFoundError("Không có phiên đăng nhập nào để đăng xuất");
        }

        // Đánh dấu tất cả token là đã bị thu hồi
        await RefreshTokenModel.updateMany(
            { user: userInfo.id },
            { $set: { isRevoked: true } }
        );

        return {
            message: "Đăng xuất tất cả thiết bị thành công",
            revokedCount: tokens.length
        };
    };

    refreshToken = async (oldRefreshToken: string) => {
        // Xác thực token (kiểm tra hạn, chữ ký, tính hợp lệ)
        const payload = verifyRefreshToken(oldRefreshToken);

        // Kiểm tra user
        const user = await UserModel.findById(payload.id).select("+isActive +isVerified");
        if (!user) throw AppError.notFoundError("Tài khoản không tồn tại");
        if (!user.isActive) throw AppError.forbiddenError("Tài khoản đã bị đình chỉ");
        if (!user.isVerified) throw AppError.unauthorizedError("Tài khoản chưa được xác thực");

        // Kiểm tra token trong DB
        const storedToken = await RefreshTokenModel.findOne({ token: oldRefreshToken, user: user._id });
        if (!storedToken) {
            throw AppError.unauthorizedError("Refresh token không hợp lệ hoặc đã bị thu hồi");
        }

        // Kiểm tra token có bị thu hồi hoặc hết hạn không
        if (storedToken.isRevoked) {
            throw AppError.unauthorizedError("Refresh token đã bị thu hồi");
        }
        if (storedToken.expiresAt.getTime() < Date.now()) {
            await RefreshTokenModel.deleteOne({ _id: storedToken._id });
            throw AppError.unauthorizedError("Refresh token đã hết hạn, vui lòng đăng nhập lại");
        }

        // Xóa RT cũ để chống reuse attack (token rotation)
        await RefreshTokenModel.deleteOne({ _id: storedToken._id });

        // Sinh cặp token mới
        const newTokens = generateTokens({ id: user._id.toString(), role: user.role });
        // Lưu RT mới vào DB
        await RefreshTokenModel.create({
            user: user._id,
            token: newTokens.refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        });

        return newTokens;
    }

    async banUsers(userIds: string[]): Promise<{ modified: number; bannedUsers: any[] }> {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            throw AppError.badRequestError("Danh sách userIds không hợp lệ");
        }

        const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));

        // Cập nhật trạng thái tài khoản
        const result = await UserModel.updateMany(
            { _id: { $in: objectIds } },
            { $set: { isActive: false } }
        );

        // Lấy danh sách user bị ban (chỉ cần _id, name, phone, role)
        const bannedUsers = await UserModel.find(
            { _id: { $in: objectIds } },
            "_id name phone role"
        ).lean();

        return {
            modified: result.modifiedCount,
            bannedUsers,
        };
    }

}

export default AuthService;