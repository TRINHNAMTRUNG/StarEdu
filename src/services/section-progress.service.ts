import { injectable } from "tsyringe";
import SectionProgressModel from "../models/sectionProgress.model";
import SectionModel from "../models/section.model";
import LessonModel from "../models/lesson.model";
import StudentModel from "../models/student.model";
import LearningSchedule from "../models/learningSchedule.model";
import AppError from "../utils/AppError";
import mongoose from "mongoose";

const PASSING_SCORE = 70; // Điểm đạt để mở khóa chương tiếp theo

@injectable()
class SectionProgressService {
    /**
     * Submit kết quả làm bài tập của section
     */
    async submitExercise(
        userId: string,
        sectionId: string,
        answers: Array<{ question_id: string; selected_answer: number }>
    ) {
        // Lấy student từ user id
        const student = await StudentModel.findOne({ user: userId }).lean();
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        // Lấy section và kiểm tra
        const section = await SectionModel.findById(sectionId).lean();
        if (!section) {
            throw AppError.notFoundError("Section không tồn tại");
        }

        if (section.type !== "exercise" && section.type !== "quiz") {
            throw AppError.badRequestError("Section này không phải bài tập");
        }

        // Lấy lesson để có course_id
        const lesson = await LessonModel.findById(section.lesson_id).lean();
        if (!lesson) {
            throw AppError.notFoundError("Lesson không tồn tại");
        }

        // Chấm điểm
        const questions = section.questions || [];
        const totalQuestions = questions.length;
        let correctAnswers = 0;

        const gradedAnswers = answers.map(ans => {
            const question = questions.find((q: any) => q.id === ans.question_id);
            const isCorrect = question && question.correctAnswer === ans.selected_answer;
            if (isCorrect) correctAnswers++;
            
            return {
                question_id: ans.question_id,
                selected_answer: ans.selected_answer,
                is_correct: isCorrect || false
            };
        });

        const scorePercentage = totalQuestions > 0 
            ? Math.round((correctAnswers / totalQuestions) * 100) 
            : 0;

        const isCompleted = scorePercentage >= PASSING_SCORE;

        // Cập nhật hoặc tạo mới progress
        const progress = await SectionProgressModel.findOneAndUpdate(
            { 
                student: student._id, 
                section_id: sectionId 
            },
            {
                $set: {
                    lesson_id: section.lesson_id,
                    course_id: lesson.course_id,
                    section_type: section.type,
                    total_questions: totalQuestions,
                    correct_answers: correctAnswers,
                    score_percentage: scorePercentage,
                    is_completed: isCompleted,
                    completed_at: isCompleted ? new Date() : undefined,
                    answers: gradedAnswers
                },
                $inc: { attempts: 1 }
            },
            { upsert: true, new: true }
        );

        // Cập nhật learning schedule nếu hoàn thành
        if (isCompleted) {
            console.log(`📚 Section ${sectionId} completed by user ${userId}, updating schedule...`);
            await this.updateScheduleCompletion(userId, sectionId);
        } else {
            console.log(`📝 Section ${sectionId} attempted but not completed (${scorePercentage}% < ${PASSING_SCORE}%)`);
        }

        return {
            section_id: sectionId,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            score_percentage: scorePercentage,
            is_completed: isCompleted,
            passing_score: PASSING_SCORE,
            attempts: progress.attempts,
            message: isCompleted 
                ? "Chúc mừng! Bạn đã hoàn thành bài tập và có thể mở khóa chương tiếp theo."
                : `Bạn cần đạt tối thiểu ${PASSING_SCORE}% để mở khóa chương tiếp theo. Hãy thử lại!`,
            answers: gradedAnswers
        };
    }

    /**
     * Đánh dấu đã xem video/mindmap
     */
    async markAsViewed(userId: string, sectionId: string) {
        const student = await StudentModel.findOne({ user: userId }).lean();
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        const section = await SectionModel.findById(sectionId).lean();
        if (!section) {
            throw AppError.notFoundError("Section không tồn tại");
        }

        if (section.type !== "video" && section.type !== "mindmap") {
            throw AppError.badRequestError("Section này không phải video hoặc mindmap");
        }

        const lesson = await LessonModel.findById(section.lesson_id).lean();
        if (!lesson) {
            throw AppError.notFoundError("Lesson không tồn tại");
        }

        const progress = await SectionProgressModel.findOneAndUpdate(
            { 
                student: student._id, 
                section_id: sectionId 
            },
            {
                $set: {
                    lesson_id: section.lesson_id,
                    course_id: lesson.course_id,
                    section_type: section.type,
                    is_viewed: true,
                    viewed_at: new Date(),
                    is_completed: true,
                    completed_at: new Date()
                }
            },
            { upsert: true, new: true }
        );

        // Cập nhật learning schedule
        console.log(`🎬 Video/mindmap ${sectionId} viewed by user ${userId}, updating schedule...`);
        await this.updateScheduleCompletion(userId, sectionId);

        return {
            section_id: sectionId,
            is_viewed: true,
            is_completed: true
        };
    }

    /**
     * Lấy tiến độ của student cho một course
     */
    async getCourseProgress(userId: string, courseId: string) {
        const student = await StudentModel.findOne({ user: userId }).lean();
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        const progresses = await SectionProgressModel.find({
            student: student._id,
            course_id: courseId
        }).lean();

        // Group by lesson
        const lessonProgressMap: Record<string, any[]> = {};
        progresses.forEach(p => {
            const lessonId = p.lesson_id.toString();
            if (!lessonProgressMap[lessonId]) {
                lessonProgressMap[lessonId] = [];
            }
            lessonProgressMap[lessonId].push(p);
        });

        return {
            course_id: courseId,
            total_sections_completed: progresses.filter(p => p.is_completed).length,
            total_sections_attempted: progresses.length,
            lessons: lessonProgressMap
        };
    }

    /**
     * Lấy tiến độ của một section cụ thể
     */
    async getSectionProgress(userId: string, sectionId: string) {
        const student = await StudentModel.findOne({ user: userId }).lean();
        if (!student) {
            throw AppError.notFoundError("Student không tồn tại");
        }

        const progress = await SectionProgressModel.findOne({
            student: student._id,
            section_id: sectionId
        }).lean();

        return progress || null;
    }

    /**
     * Cập nhật learning schedule khi section được hoàn thành
     */
    private async updateScheduleCompletion(userId: string, sectionId: string) {
        try {
            console.log(`🔄 Attempting to update schedule for user ${userId}, section ${sectionId}`);
            
            const schedule = await LearningSchedule.findOne({ 
                user_id: new mongoose.Types.ObjectId(userId),
                'scheduled_lessons.section_id': new mongoose.Types.ObjectId(sectionId),
                'scheduled_lessons.completed': false
            });

            if (!schedule) {
                console.log(`⚠️ No schedule found for user ${userId} with incomplete section ${sectionId}`);
                return;
            }

            console.log(`📋 Found schedule ${schedule._id}`);

            const lessonIndex = schedule.scheduled_lessons.findIndex(
                (lesson: any) => 
                    lesson.section_id.toString() === sectionId && 
                    !lesson.completed
            );

            if (lessonIndex !== -1) {
                schedule.scheduled_lessons[lessonIndex].completed = true;
                schedule.scheduled_lessons[lessonIndex].completed_at = new Date();
                await schedule.save();
                console.log(`✅ Updated schedule: Section ${sectionId} marked as completed`);
            } else {
                console.log(`⚠️ Section ${sectionId} not found in scheduled_lessons or already completed`);
            }
        } catch (error) {
            console.error('❌ Error updating schedule completion:', error);
            // Không throw error để không ảnh hưởng đến flow chính
        }
    }
}

export default SectionProgressService;
