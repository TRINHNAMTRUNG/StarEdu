import { Router } from "express";
import { container } from "tsyringe";
import RoadmapController from "../../controllers/roadmap.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { UserRole } from "../../models/user.model";
import {
    CreateRoadmapReqDto,
    UpdateRoadmapReqDto,
    AddCoursesToRoadmapReqDto,
    RoadmapIdParamDto,
    RoadmapCourseParamDto,
    SmartPublishRoadmapReqDto,
    ToggleFreeRoadmapReqDto
} from "../../dtos/request/roadmap.request.dto";
import multer from "multer";
import { CreateCourseReqDto } from "../../dtos/request/course.request.dto";

const adminRoadmapRoutes = Router();
const roadmapController = container.resolve(RoadmapController);

adminRoadmapRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// Multer config (nếu cần upload thumbnail trực tiếp trong routes này)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ============================================
// CRUD CƠ BẢN VỀ ROADMAP
// ============================================

// 1. POST /admin/roadmaps
// Mục đích: Tạo roadmap mới (Admin).
// Ghi chú: Không trùng với API của Course. Giữ lại.
adminRoadmapRoutes.post(
    "/",
    upload.single("thumbnail"),
    validationBody(CreateRoadmapReqDto),
    roadmapController.createRoadmap
);

// 2. GET /admin/roadmaps
// Mục đích: Lấy danh sách roadmap (phân trang, lọc).
// Ghi chú: Không trùng với Course. Giữ lại.
adminRoadmapRoutes.get("/", roadmapController.getRoadmapList);

// 3. GET /admin/roadmaps/:id
// Mục đích: Lấy chi tiết roadmap (kèm tóm tắt courses).
// Ghi chú: Chi tiết roadmap, không thay thế chức năng tạo/ xóa course. Giữ lại.
adminRoadmapRoutes.get("/:id", validationParams(RoadmapIdParamDto), roadmapController.getRoadmapById);

// 4. PATCH /admin/roadmaps/:id
// Mục đích: Cập nhật metadata roadmap (thumbnail, giá, thời lượng...).
adminRoadmapRoutes.patch(
    "/:id",
    validationParams(RoadmapIdParamDto),
    upload.single("thumbnail"),
    validationBody(UpdateRoadmapReqDto),
    roadmapController.updateRoadmap
);

// 5. DELETE /admin/roadmaps/:id
// Mục đích: Xóa roadmap (kiểm tra enrollments, dọn thumbnail).
// Ghi chú: Lifecycle roadmap riêng, không xóa Course. Giữ lại.
adminRoadmapRoutes.delete("/:id", validationParams(RoadmapIdParamDto), roadmapController.deleteRoadmap);

// ============================================
// XUẤT BẢN (PUBLISH)
// ============================================

// 6. PATCH /admin/roadmaps/:id/publish
// Mục đích: Chuyển trạng thái publish/unpublish cho roadmap.
// Ghi chú: Khác với publish của Course (CourseService.togglePublishCourse). Giữ lại.
adminRoadmapRoutes.patch("/:id/publish", validationParams(RoadmapIdParamDto), roadmapController.togglePublishRoadmap);

// ============================================
// QUẢN LÝ COURSES TRONG ROADMAP
// ============================================

// 7. POST /admin/roadmaps/:id/courses/add
// Mục đích: Thêm course có sẵn vào roadmap.
// Ghi chú: Nếu có route duplicate, chỉ giữ một canonical route.
// Đề xuất: Giữ "/:id/courses/add".
adminRoadmapRoutes.post("/:id/courses/add", validationParams(RoadmapIdParamDto), validationBody(AddCoursesToRoadmapReqDto), roadmapController.addCoursesToRoadmap);

// 8. DELETE /admin/roadmaps/:id/courses/:courseId
// Mục đích: Gỡ 1 course khỏi roadmap (không xóa Course).
// Ghi chú: CourseService.deleteCourse khi xóa toàn cục sẽ remove course khỏi tất cả roadmap; hành vi khác nhau nên giữ cả 2.
// Đề xuất: Tách helper xóa khỏi roadmap để tránh viết logic $pull trùng lặp.
adminRoadmapRoutes.delete("/:id/courses/:courseId", validationParams(RoadmapCourseParamDto), roadmapController.removeCourseFromRoadmap);

// ============================================
// STRUCTURE & PREVIEW (Phase 1)
// ============================================

// 9. GET /admin/roadmaps/:id/structure
// Mục đích: Trả cấu trúc roadmap -> courses -> lessons -> sections theo context (public/admin).
// Ghi chú: Logic per-course tương tự CourseService.getCourseFullStructure — cân nhắc refactor helper chung.
adminRoadmapRoutes.get("/:id/structure", validationParams(RoadmapIdParamDto), roadmapController.getRoadmapStructure);

// 10. GET /admin/roadmaps/:id/publish-preview
// Mục đích: Tổng quan readiness trước khi publish (số lesson, lesson đã publish, free lessons...).
// Ghi chú: Dùng để UI hiển thị trạng thái chuẩn bị trước khi publish.
adminRoadmapRoutes.get("/:id/publish-preview", validationParams(RoadmapIdParamDto), roadmapController.getPublishPreview);

// ============================================
// SMART PUBLISH & FREE CONTROL (Phase 3)
// ============================================

// 11. POST /admin/roadmaps/:id/smart-publish
// Mục đích: Thực hiện publish theo chế độ (none, perCourseCount, explicit).
// Ghi chú: Dùng chung validator với Course publish; tách rules validate để tránh trùng.
adminRoadmapRoutes.post(
    "/:id/smart-publish",
    validationParams(RoadmapIdParamDto),
    validationBody(SmartPublishRoadmapReqDto),
    roadmapController.smartPublishRoadmap
);

// 12. PATCH /admin/roadmaps/:id/free
// Mục đích: Toggle roadmap.is_free (nếu set free có thể auto-publish roadmap).
// Ghi chú: Per-course free management nằm ở CourseService.toggleFreeCourses; giữ cả hai ở phạm vi khác nhau.
adminRoadmapRoutes.patch(
    "/:id/free",
    validationParams(RoadmapIdParamDto),
    validationBody(ToggleFreeRoadmapReqDto),
    roadmapController.toggleFreeRoadmap
);

export default adminRoadmapRoutes;
