import { injectable } from "tsyringe";
import EnrollmentModel from "../models/enrollment.model";
import StudentModel from "../models/student.model";
import AppError from "../utils/AppError";

@injectable()
class EnrollmentService {
    /**
     * GET ENROLLMENT LIST
     */
    async getEnrollmentList(studentId: string, page: number = 1, limit: number = 10) {
        const student = await StudentModel.findOne({ user: studentId });
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        const [total, enrollments] = await Promise.all([
            EnrollmentModel.countDocuments({ student: student._id }),
            EnrollmentModel.find({ student: student._id })
                .populate("roadmap", "title thumbnail target_level")
                .sort({ enrolled_date: -1 }) // ✅ FIX: enrolled_date (không phải enrollment_date)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec()
        ]);

        const data = enrollments.map((e: any) => ({
            _id: e._id.toString(),
            roadmap: {
                _id: e.roadmap._id.toString(),
                title: e.roadmap.title,
                thumbnail: e.roadmap.thumbnail,
                target_level: e.roadmap.target_level
            },
            enrolled_price: e.enrolled_price, // ✅ Match model
            enrollment_date: e.enrolled_date, // ✅ Map enrolled_date -> enrollment_date (cho frontend)
            completion_percentage: e.completion_percentage || 0, // ✅ Match model
            last_accessed: e.last_accessed // ✅ Match model
        }));

        return { total, page, limit, data };
    }

    /**
     * GET ENROLLMENT BY ID
     */
    async getEnrollmentById(enrollmentId: string, studentId: string) {
        const enrollment = await EnrollmentModel.findById(enrollmentId)
            .populate("roadmap", "title thumbnail target_level")
            .populate("certificate", "_id")
            .lean()
            .exec();

        if (!enrollment) {
            throw AppError.notFoundError("Enrollment không tồn tại");
        }

        const student = await StudentModel.findOne({ user: studentId });
        if ((enrollment.student as any).toString() !== student!._id.toString()) {
            throw AppError.forbiddenError("Bạn không có quyền truy cập enrollment này");
        }

        const roadmap = enrollment.roadmap as any;
        const certificate = enrollment.certificate as any;

        return {
            _id: enrollment._id.toString(),
            roadmap: {
                _id: roadmap._id.toString(),
                title: roadmap.title,
                thumbnail: roadmap.thumbnail,
                target_level: roadmap.target_level
            },
            enrolled_price: enrollment.enrolled_price, // ✅ Match model
            enrollment_date: enrollment.enrolled_date, // ✅ Map enrolled_date -> enrollment_date
            completion_percentage: enrollment.completion_percentage || 0, // ✅ Match model
            last_accessed: enrollment.last_accessed, // ✅ Match model
            certificate_id: certificate?._id?.toString(),
            createdAt: (enrollment as any).createdAt
        };
    }
}

export default EnrollmentService;
