import { Router } from "express";
import { container } from "tsyringe";
import CourseController from "../../controllers/course.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import {
    CreateCourseReqDto, UpdateCourseReqDto, AssignTeachersReqDto,
    CourseIdParamDto, ToggleFreeCoursesReqDto, CloneCourseReqDto,
    ReorderLessonsReqDto, BulkDeleteCoursesReqDto, RoadmapIdForAvailableCoursesParamDto
} from "../../dtos/request/course.request.dto";
import multer from "multer";

const adminCourseRoutes = Router();
const courseController = container.resolve(CourseController);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

adminCourseRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// ============================================
// ROUTES KHÔNG CÓ :id PHẢI ĐẶT TRƯỚC
// ============================================

// 1. DELETE /admin/courses/bulk
// Mục đích: Xóa nhiều course bằng soft-delete (dùng trong admin batch ops). 
// Ghi chú: Đây là thao tác xóa toàn cục trên Course => CourseService.deleteCourse sẽ remove khỏi tất cả roadmap liên quan.
// Recommendation: Giữ.
adminCourseRoutes.delete("/bulk", validationBody(BulkDeleteCoursesReqDto), courseController.bulkDeleteCourses);

// 2. PATCH /admin/courses/free
// Mục đích: Thiết lập is_free cho nhiều course (batch) và đồng bộ lessons bên trong mỗi course.
// Ghi chú: Không trùng với roadmap-level free; giữ và tách rõ phạm vi (course vs roadmap).
// Recommendation: Giữ.
adminCourseRoutes.patch("/free", validationBody(ToggleFreeCoursesReqDto), courseController.toggleFreeCourses);

// 3. GET /admin/courses/available-for-roadmap/:roadmapId
// Mục đích: Lấy danh sách courses KHÔNG có trong roadmap target (dùng UI để "chọn từ roadmap khác").
// Ghi chú: Đây là API hỗ trợ workflow "reuse existing course" trước khi gọi POST /admin/roadmaps/:id/courses/add.
// Recommendation: Giữ; route phải đặt trước /:id để tránh bị trùng.
adminCourseRoutes.get(
    "/available-for-roadmap/:roadmapId",
    validationParams(RoadmapIdForAvailableCoursesParamDto),
    courseController.getAvailableCoursesForRoadmap
);

// ============================================
// CRUD CƠ BẢN
// ============================================

// 4. POST /admin/courses
// Mục đích: Tạo course mới; DTO bắt buộc có roadmap_id → sau khi tạo CourseService.createCourse sẽ tự add course vào roadmap tương ứng.
// Ghi chú: Đây là nơi duy nhất tạo resource Course (không cần thêm createCourseForRoadmap ở Roadmap API).
// Recommendation: Giữ và chỉ dùng POST /admin/courses để tạo course mới.
adminCourseRoutes.post(
    "/",
    upload.single("thumbnail"),
    validationBody(CreateCourseReqDto),
    courseController.createCourse
);

// 5. GET /admin/courses
// Mục đích: Lấy danh sách course (admin view, filter/paginate).
// Ghi chú: Không trùng với roadmap APIs.
adminCourseRoutes.get("/", courseController.getCourseList);

// 6. GET /admin/courses/:id
// Mục đích: Lấy chi tiết course (admin).
// Ghi chú: Đặt sau các route cụ thể như /available-for-roadmap để tránh collision.
adminCourseRoutes.get("/:id", validationParams(CourseIdParamDto), courseController.getCourseById);

// API #3.1: GET /admin/courses/:id/lessons
adminCourseRoutes.get(
    "/:id/lessons",
    validationParams(CourseIdParamDto),
    courseController.getCourseLessons
);

// 7. PATCH /admin/courses/:id
// Mục đích: Cập nhật course (thumbnail upload hỗ trợ).
// Ghi chú: Chỉ cập nhật dữ liệu Course, không tự động thay đổi roadmap associations (trừ khi explicit).
adminCourseRoutes.patch(
    "/:id",
    validationParams(CourseIdParamDto),
    upload.single("thumbnail"),
    validationBody(UpdateCourseReqDto),
    courseController.updateCourse
);

// 8. DELETE /admin/courses/:id
// Mục đích: Soft-delete course (CourseService.deleteCourse) → sẽ remove course khỏi tất cả roadmap, xóa thumbnail, kiểm tra enrollments.
// Ghi chú: Đây là xóa toàn cục, khác với xóa course chỉ trong roadmap (DELETE /admin/roadmaps/:id/courses/:courseId).
adminCourseRoutes.delete("/:id", validationParams(CourseIdParamDto), courseController.deleteCourse);

// ============================================
// COURSE ACTIONS
// ============================================

// 9. PATCH /admin/courses/:id/publish
// Mục đích: Toggle publish cho 1 course (kèm validation lessons/sections hợp lệ).
// Ghi chú: Course-level publish; RoadmapService.smartPublishRoadmap orchestration có thể reuse validator logic.
// Recommendation: Giữ và tách validator chung nếu cần.
adminCourseRoutes.patch("/:id/publish", validationParams(CourseIdParamDto), courseController.togglePublishCourse);

// 10. PATCH /admin/courses/:id/teachers
// Mục đích: Gán danh sách teacher_ids cho course.
// Ghi chú: Thuộc quản lý Course (assign teachers), không trùng với roadmap APIs.
adminCourseRoutes.patch(
    "/:id/teachers",
    validationParams(CourseIdParamDto),
    validationBody(AssignTeachersReqDto),
    courseController.assignTeachers
);

// 11. GET /admin/courses/:id/statistics
// Mục đích: Lấy thống kê (enrollments, revenue attributed từ roadmaps chứa course).
// Ghi chú: Sử dụng RoadmapModel + EnrollmentModel để tính revenue; không trùng với creation/update APIs.
adminCourseRoutes.get("/:id/statistics", validationParams(CourseIdParamDto), courseController.getCourseStatistics);

// 12. GET /admin/courses/:id/full
// Mục đích: Lấy cấu trúc đầy đủ của course (lessons + sections).
// Ghi chú: Có logic tương tự trong RoadmapService.getRoadmapStructure per-course; cân nhắc tách helper chung.
adminCourseRoutes.get("/:id/full", validationParams(CourseIdParamDto), courseController.getCourseFullStructure);

// 13. PATCH /admin/courses/:id/restore
// Mục đích: Khôi phục course đã soft-delete.
// Ghi chú: Khôi phục chỉ affect Course document (không tự động add lại vào roadmap nếu đã bị remove). Cân nhắc policy rõ ràng.
adminCourseRoutes.patch("/:id/restore", validationParams(CourseIdParamDto), courseController.restoreCourse);

// 14. DELETE /admin/courses/:id/permanent
// Mục đích: Xóa vĩnh viễn course (cần soft-delete trước), xóa lessons/sections và S3 files.
// Ghi chú: Hành động hủy bỏ toàn bộ dữ liệu liên quan; đảm bảo kiểm tra enrollments trước khi xóa.
adminCourseRoutes.delete("/:id/permanent", validationParams(CourseIdParamDto), courseController.permanentDeleteCourse);

// 15. POST /admin/courses/:id/clone
// Mục đích: Nhân bản course (tạo course mới copy metadata, không copy lessons/sections by default).
// Ghi chú: Nếu muốn clone toàn bộ nội dung (lessons/sections), cần mở rộng service.
adminCourseRoutes.post(
    "/:id/clone",
    validationParams(CourseIdParamDto),
    validationBody(CloneCourseReqDto),
    courseController.cloneCourse
);

// 16. PATCH /admin/courses/:id/reorder-lessons
// Mục đích: Cập nhật order của nhiều lessons trong course (batch update).
// Ghi chú: Validate lessons thuộc course trước khi cập nhật order.
adminCourseRoutes.patch(
    "/:id/reorder-lessons",
    validationParams(CourseIdParamDto),
    validationBody(ReorderLessonsReqDto),
    courseController.reorderLessons
);

export default adminCourseRoutes;
