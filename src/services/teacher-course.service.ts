// ❌ COMMENTED - Teacher role suspended, toàn bộ service này sẽ không được dùng
// @injectable()
// class TeacherCourseService {
//     // Helper: Kiem tra teacher co duoc assign vao course khong
//     private async checkTeacherAssignment(courseId: string, teacherId: string): Promise<boolean> {
//         const course = await CourseModel.findById(courseId).lean();
//         if (!course) {
//             throw AppError.notFoundError("Khóa học không tồn tại");
//         }
//
//         return course.assigned_teachers.some(
//             (id: any) => id.toString() === teacherId
//         );
//     }
//
//     // Helper: Populate va transform course
//     private async populateAndTransformCourse(courseId: string) {
//         const course = await CourseModel.findById(courseId)
//             .populate({
//                 path: "assigned_teachers",
//                 select: "user experience_years",
//                 populate: {
//                     path: "user",
//                     select: "name avatar"
//                 }
//             })
//             .lean();
//
//         if (!course) return null;
//
//         return {
//             ...course,
//             _id: course._id.toString(),
