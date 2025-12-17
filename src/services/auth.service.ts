import { injectable } from "tsyringe";
import { StudentRegisterReqDto } from "../dtos/request/Auth.request.dto";
import UserModel, { UserRole } from "../models/user.model";
import AppError from "../utils/AppError";
// import InfobipService from "./infobip.service";
import { encryptPassword } from "../utils/password.util";
import StudentService from "./student.service";
import TeacherService from "./teacher.service";
import { JwtUserPayload, verifyRefreshToken, generateTokens } from "../utils/token.util";
import RefreshTokenModel from "../models/refreshToken.model";
import mongoose from "mongoose";
import { Level } from "../models/student.model";
import FirebaseAuthService from "./firebase-auth.service"; // <-- new import

@injectable()
class AuthService {
    constructor(
        // private infobipService: InfobipService,
        private studentService: StudentService,
        private teacherService: TeacherService, // Inject TeacherService
        private firebaseAuthService: FirebaseAuthService // Inject Firebase service
    ) { }

    /**
     * --------------
     *  STUDENT APIs
     * --------------
     */

    registerStudentByPhone = async (userInfo: StudentRegisterReqDto) => {
        console.log("Registering student:", userInfo);
        let { phone, password, name, gender } = userInfo;

        // Chuẩn hóa phone về dạng local 0... để lưu DB
        const localPhone = formatToLocal(phone);
        console.log(`📱 Phone normalization: ${phone} → ${localPhone}`);

        // Kiểm tra student đã đăng kí tài khoản chưa
        let hasAccount = await UserModel.findOne({ phone: localPhone });
        if (hasAccount) {
            throw AppError.conflictError("Số điện thoại đã được sử dụng");
        }

        // Đảm bảo có firebaseIdToken
        const firebaseIdToken = (userInfo as any).firebaseIdToken;
        if (!firebaseIdToken) {
            throw AppError.badRequestError("Thiếu firebaseIdToken từ client. FE phải gửi idToken sau khi xác thực OTP bằng Firebase client.");
        }

        // XÁC THỰC idToken với Firebase Admin
        let decoded: any;
        try {
            decoded = await this.firebaseAuthService.verifyIdToken(firebaseIdToken);
        } catch (err) {
            console.error("Firebase token verify failed:", err);
            throw err; // AppError từ service
        }

        // Đảm bảo phone trong token khớp với phone gửi lên (an toàn)
        // Firebase trả về phone dạng E.164 (+84...), ta cần chuẩn hóa để so sánh
        const tokenPhone = decoded.phone_number;
        if (!tokenPhone) {
            throw AppError.unauthorizedError("Firebase token không chứa phone number");
        }
        
        // So sánh phone: Chuẩn hóa cả 2 về E.164 để compare
        const normalizedTokenPhone = formatToE164(tokenPhone);
        const normalizedProvidedPhone = formatToE164(phone);
        if (normalizedTokenPhone !== normalizedProvidedPhone) {
            console.warn("Phone mismatch token vs provided:", normalizedTokenPhone, normalizedProvidedPhone);
            throw AppError.unauthorizedError("Số điện thoại trong Firebase token không khớp với số điện thoại gửi lên");
        }

        // Now create user (only after token verified) - LƯU DẠNG LOCAL 0...
        const encryptedPassword = await encryptPassword(password);
        const account = await UserModel.create({
            name,
            password: encryptedPassword,
            role: UserRole.STUDENT,
            phone: localPhone, // ✅ Lưu dạng 0...
            gender,
            isVerified: true
        });

        // Tạo bản ghi student
        await this.studentService.createStudentWithUserId(account._id.toString(), Level.A1, 0);

        // Trả về user + tokens (ẩn password)
        const userObj: any = account.toObject();
        userObj.password = undefined;
        return { ...userObj, ...generateTokens({ id: account._id.toString(), role: account.role }) };
    }

    login = async (phone: string, password: string, expectedRole?: UserRole) => {
        const user = await UserModel.findOne({ phone }, { createdAt: 0, updatedAt: 0 });

        if (!user) {
            throw AppError.notFoundError("Tài khoản không tồn tại");
        }
        if (!user.isVerified) {
            throw AppError.unauthorizedError("Tài khoản chưa được xác thực");
        }
        if (!user.isActive) {
            throw AppError.forbiddenError("Tài khoản đã bị khóa");
        }

        // ✅ THÊM: Check role match với route
        if (expectedRole && user.role !== expectedRole) {
            throw AppError.forbiddenError(`Tài khoản này không phải là ${expectedRole}`);
        }

        console.log('🔍 DEBUG PASSWORD CHECK:');
        console.log('  - Input password:', password);
        console.log('  - Stored hash:', user.password?.substring(0, 20) + '...');
        console.log('  - Hash type:', user.password?.substring(0, 4));

        const isPasswordMatch = await user.comparePassword(password);
        console.log('  - Match result:', isPasswordMatch);

        if (!isPasswordMatch) {
            throw AppError.unauthorizedError("Mật khẩu không chính xác");
        }

        const tokens = generateTokens({ id: user._id.toString(), role: user.role });

        // Lưu token mới và invalidate session cũ (single device login)
        await UserModel.findByIdAndUpdate(user._id, {
            active_session_token: tokens.access_token,
            last_device_info: `Login at ${new Date().toISOString()}`
        });

        return {
            ...user.toObject(),
            password: undefined,
            ...tokens
        };
    };

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
            token: newTokens.refresh_token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        });

        return newTokens;
    }

    async banUsers(userIds: string[]) {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            throw AppError.badRequestError("Danh sách userIds không hợp lệ");
        }

        const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));

        // Validate: Tìm users tồn tại
        const existingUsers = await UserModel.find(
            { _id: { $in: objectIds } },
            "_id name phone role isActive"
        ).lean();

        const existingIds = existingUsers.map(u => u._id.toString());
        const notFoundIds = userIds.filter(id => !existingIds.includes(id));

        // Phân loại users
        const usersToban = existingUsers.filter(u => u.isActive);
        const alreadyBanned = existingUsers.filter(u => !u.isActive);

        // Cập nhật trạng thái
        let modified = 0;
        if (usersToban.length > 0) {
            const banIds = usersToban.map(u => u._id);
            const result = await UserModel.updateMany(
                { _id: { $in: banIds } },
                { $set: { isActive: false } }
            );
            modified = result.modifiedCount;
        }

        return {
            total: userIds.length,
            modified,
            alreadyBanned: alreadyBanned.length,
            notFound: notFoundIds.length,
            bannedUsers: usersToban.map(u => ({
                _id: u._id.toString(),
                name: u.name,
                phone: u.phone,
                role: u.role
            })),
            notFoundIds
        };
    }

    async unbanUsers(userIds: string[]) {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            throw AppError.badRequestError("Danh sách userIds không hợp lệ");
        }

        const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));

        // Validate: Tìm users tồn tại
        const existingUsers = await UserModel.find(
            { _id: { $in: objectIds } },
            "_id name phone role isActive"
        ).lean();

        const existingIds = existingUsers.map(u => u._id.toString());
        const notFoundIds = userIds.filter(id => !existingIds.includes(id));

        // Phân loại users
        const usersToUnban = existingUsers.filter(u => !u.isActive);
        const alreadyActive = existingUsers.filter(u => u.isActive);

        // Cập nhật trạng thái
        let modified = 0;
        if (usersToUnban.length > 0) {
            const unbanIds = usersToUnban.map(u => u._id);
            const result = await UserModel.updateMany(
                { _id: { $in: unbanIds } },
                { $set: { isActive: true } }
            );
            modified = result.modifiedCount;
        }

        return {
            total: userIds.length,
            modified,
            alreadyActive: alreadyActive.length,
            notFound: notFoundIds.length,
            unbannedUsers: usersToUnban.map(u => ({
                _id: u._id.toString(),
                name: u.name,
                phone: u.phone,
                role: u.role
            })),
            notFoundIds
        };
    }

    /**
     * Cập nhật điểm mục tiêu cho user
     */
    async updateTargetScore(userId: string, targetScore: number) {
        const user = await UserModel.findByIdAndUpdate(
            userId,
            { target_score: targetScore },
            { new: true }
        ).select('_id name phone target_score');

        if (!user) {
            throw AppError.notFoundError("Người dùng không tồn tại");
        }

        return user;
    }

    /**
     * Lấy thông tin profile của user
     */
    async getProfile(userId: string) {
        const user = await UserModel.findById(userId).select('-password');
        
        if (!user) {
            throw AppError.notFoundError("Người dùng không tồn tại");
        }

        return user;
    }

}

/* helper: normalize phone to E.164 for Vietnam */
function formatToE164(phone: string): string {
    if (!phone) return phone;
    const cleaned = phone.trim();
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("0")) return `+84${cleaned.slice(1)}`;
    if (cleaned.startsWith("84")) return `+${cleaned}`;
    // fallback: assume local number
    return `+${cleaned}`;
}

/* helper: normalize phone to local format 0... */
function formatToLocal(phone: string): string {
    if (!phone) return phone;
    const cleaned = phone.trim().replace(/[\s-().]/g, '');
    
    // Nếu bắt đầu bằng +84, chuyển về 0
    if (cleaned.startsWith('+84')) {
        return '0' + cleaned.substring(3);
    }
    
    // Nếu bắt đầu bằng 84, chuyển về 0
    if (cleaned.startsWith('84')) {
        return '0' + cleaned.substring(2);
    }
    
    // Nếu đã là 0, giữ nguyên
    if (cleaned.startsWith('0')) {
        return cleaned;
    }
    
    // Mặc định thêm 0 phía trước
    return '0' + cleaned;
}

export default AuthService;