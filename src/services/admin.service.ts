import { injectable } from "tsyringe";
import { StudentRegisterReqDto } from "../dtos/request/Auth.request.dto";
import UserModel, { UserRole } from "../models/user.model";
import AppError from "../utils/AppError";
// import InfobipService from "./infobip.service";
import { encryptPassword } from "../utils/password.util";
import StudentService from "./student.service";
import TeacherService from "./teacher.service";
import StudentModel, { Level } from "../models/student.model";
import TeacherModel from "../models/teacher.model";
import EnrollmentModel from "../models/enrollment.model";
import CourseModel from "../models/course.model";

interface GetAllUsersParams {
    role?: string;
    status?: string;
    search?: string;
    page: number;
    limit: number;
}

@injectable()
class AdminService {
    constructor(
        private studentService: StudentService,
        private teacherService: TeacherService
    ) { }

    // Get all users with filters and pagination
    async getAllUsers(params: GetAllUsersParams) {
        const { role, status, search, page, limit } = params;
        const skip = (page - 1) * limit;

        // Build query
        const query: any = {};

        if (role && role !== 'all') {
            query.role = role;
        }

        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Get users
        const users = await UserModel.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await UserModel.countDocuments(query);

        // Get additional info for each user
        const usersWithInfo = await Promise.all(
            users.map(async (user) => {
                let additionalInfo: any = {};

                if (user.role === UserRole.STUDENT) {
                    const student = await StudentModel.findOne({ user: user._id }).lean();
                    const enrollments = await EnrollmentModel.countDocuments({ student: user._id });
                    additionalInfo = {
                        level: student?.level,
                        target_score: student?.target_score,
                        coursesEnrolled: enrollments,
                        enrollment_date: student?.enrollment_date
                    };
                } else if (user.role === UserRole.TEACHER) {
                    const teacher = await TeacherModel.findOne({ user: user._id }).lean();
                    const courses = await CourseModel.countDocuments({ teacher: user._id });
                    additionalInfo = {
                        bio: teacher?.bio,
                        experience_years: teacher?.experience_years,
                        coursesTeaching: courses
                    };
                }

                return {
                    ...user,
                    ...additionalInfo
                };
            })
        );

        return {
            users: usersWithInfo,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Get user by ID with full details
    async getUserById(userId: string) {
        const user = await UserModel.findById(userId).select('-password').lean();

        if (!user) {
            throw AppError.notFoundError('Không tìm thấy người dùng');
        }

        let additionalInfo: any = {};

        if (user.role === UserRole.STUDENT) {
            const student = await StudentModel.findOne({ user: userId }).lean();
            const enrollments = await EnrollmentModel.find({ student: userId })
                .populate('course', 'title thumbnail')
                .lean();

            additionalInfo = {
                studentInfo: student,
                enrollments: enrollments
            };
        } else if (user.role === UserRole.TEACHER) {
            const teacher = await TeacherModel.findOne({ user: userId }).lean();
            const courses = await CourseModel.find({ teacher: userId })
                .select('title thumbnail students_enrolled')
                .lean();

            additionalInfo = {
                teacherInfo: teacher,
                courses: courses
            };
        }

        return {
            ...user,
            ...additionalInfo
        };
    }

    // Update user status (active/inactive)
    async updateUserStatus(userId: string, isActive: boolean) {
        const user = await UserModel.findByIdAndUpdate(
            userId,
            { isActive },
            { new: true }
        ).select('-password');

        if (!user) {
            throw AppError.notFoundError('Không tìm thấy người dùng');
        }

        return user;
    }

    // Update user information
    async updateUser(userId: string, updateData: any) {
        const { name, phone, gender, date_of_birth, address, country, avatar, isActive } = updateData;

        const user = await UserModel.findByIdAndUpdate(
            userId,
            {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(gender && { gender }),
                ...(date_of_birth && { date_of_birth }),
                ...(address && { address }),
                ...(country && { country }),
                ...(avatar && { avatar }),
                ...(isActive !== undefined && { isActive })
            },
            { new: true }
        ).select('-password');

        if (!user) {
            throw AppError.notFoundError('Không tìm thấy người dùng');
        }

        return user;
    }

    // Delete user
    async deleteUser(userId: string) {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw AppError.notFoundError('Không tìm thấy người dùng');
        }

        // Delete related data based on role
        if (user.role === UserRole.STUDENT) {
            await StudentModel.findOneAndDelete({ user: userId });
            await EnrollmentModel.deleteMany({ student: userId });
        } else if (user.role === UserRole.TEACHER) {
            await TeacherModel.findOneAndDelete({ user: userId });
            // Optional: Handle courses when teacher is deleted
            // You might want to reassign or archive courses instead of deleting
        }

        await UserModel.findByIdAndDelete(userId);
    }

    // Get user statistics
    async getUserStats() {
        const totalUsers = await UserModel.countDocuments();
        const totalStudents = await UserModel.countDocuments({ role: UserRole.STUDENT });
        const totalTeachers = await UserModel.countDocuments({ role: UserRole.TEACHER });
        const activeUsers = await UserModel.countDocuments({ isActive: true });
        const inactiveUsers = await UserModel.countDocuments({ isActive: false });
        const pendingUsers = await UserModel.countDocuments({ isVerified: false });

        // Get recent users (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsersThisMonth = await UserModel.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        return {
            total: totalUsers,
            students: totalStudents,
            teachers: totalTeachers,
            active: activeUsers,
            inactive: inactiveUsers,
            pending: pendingUsers,
            newThisMonth: newUsersThisMonth
        };
    }

    // Create new user (admin function)
    async createUser(userData: {
        name: string;
        phone: string;
        password: string;
        role: 'student' | 'teacher';
        gender: 'male' | 'female' | 'other';
        date_of_birth?: Date;
        address?: string;
        country?: string;
    }) {
        // Check if phone already exists
        const existingUser = await UserModel.findOne({ phone: userData.phone });
        if (existingUser) {
            throw AppError.conflictError('Số điện thoại đã được sử dụng');
        }

        // Encrypt password
        const encryptedPassword = await encryptPassword(userData.password);

        // Create user
        const user = await UserModel.create({
            name: userData.name,
            phone: userData.phone,
            password: encryptedPassword,
            role: userData.role,
            gender: userData.gender,
            date_of_birth: userData.date_of_birth,
            address: userData.address,
            country: userData.country,
            isVerified: true, // Admin-created users are pre-verified
            isActive: true
        });

        // Create role-specific record
        if (userData.role === UserRole.STUDENT) {
            await StudentModel.create({
                user: user._id,
                level: Level.A1,
                target_score: 0
            });
        } else if (userData.role === UserRole.TEACHER) {
            await TeacherModel.create({
                user: user._id,
                experience_years: 0
            });
        }

        return user;
    }
}

export default AdminService;