import { Router } from "express";
import { container } from "tsyringe";
import AdminTestController from "../../controllers/admin-test.controller";
import { authenticateToken, authorizeRoles } from "../../middlewares/auth.middleware";
import { validationBody, validationQuery } from "../../middlewares/validationError.middleware";
import { CreateTestReqDto, UpdateTestReqDto, PublishTestReqDto, GetTestsQueryDto } from "../../dtos/request/test.request.dto";
import { UserRole } from "../../models/user.model";

const router = Router();
const controller = container.resolve(AdminTestController);

// Tất cả routes yêu cầu authentication và role ADMIN
router.use(authenticateToken);
router.use(authorizeRoles(UserRole.ADMIN));

/**
 * @route GET /api/admin/tests
 * @desc Lấy tất cả đề thi (bao gồm chưa publish)
 */
router.get("/", validationQuery(GetTestsQueryDto), controller.getAllTests);

/**
 * @route POST /api/admin/tests
 * @desc Tạo đề thi mới
 */
router.post("/", validationBody(CreateTestReqDto), controller.createTest);

/**
 * @route PUT /api/admin/tests/:id
 * @desc Cập nhật đề thi
 */
router.put("/:id", validationBody(UpdateTestReqDto), controller.updateTest);

/**
 * @route PUT /api/admin/tests/:id/publish
 * @desc Xuất bản/ẩn đề thi
 */
router.put("/:id/publish", validationBody(PublishTestReqDto), controller.publishTest);

/**
 * @route DELETE /api/admin/tests/:id
 * @desc Xóa đề thi
 */
router.delete("/:id", controller.deleteTest);

export default router;
