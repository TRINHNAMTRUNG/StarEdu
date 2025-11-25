import { injectable } from "tsyringe";
import AppError from "../utils/AppError";
import StudentModel from "../models/student.model";

@injectable()
class StudentService {
    constructor() { }

    /**
     * Tạo mới student dựa trên userId
     * @param userId 
     * @param level 
     * @param targetScore 
     * @returns 
     */
    createStudentWithUserId = async (userId: string, level: string, targetScore: number) => {
        // Kiểm tra xem student đã tồn tại chưa
        const existingStudent = await StudentModel.findOne({ user: userId });
        if (existingStudent) {
            throw AppError.conflictError("Student đã tồn tại");
        }

        // Tạo mới student
        const student = await StudentModel.create({
            user: userId,
            level,
            target_score: targetScore,
        });

        return student.toObject();
    }
}

export default StudentService;