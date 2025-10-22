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
    RoadmapCourseParamDto
} from "../../dtos/request/roadmap.request.dto";

const adminRoadmapRoutes = Router();
const roadmapController = container.resolve(RoadmapController);

// Tat ca admin routes can auth va role check
adminRoadmapRoutes.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// API #1: POST /admin/roadmaps
adminRoadmapRoutes.post(
    "/",
    validationBody(CreateRoadmapReqDto),
    roadmapController.createRoadmap
);

// API #2: GET /admin/roadmaps
adminRoadmapRoutes.get("/", roadmapController.getRoadmapList);

// API #3: GET /admin/roadmaps/:id
adminRoadmapRoutes.get(
    "/:id",
    validationParams(RoadmapIdParamDto),
    roadmapController.getRoadmapById
);

// API #4: PATCH /admin/roadmaps/:id
adminRoadmapRoutes.patch(
    "/:id",
    validationParams(RoadmapIdParamDto),
    validationBody(UpdateRoadmapReqDto),
    roadmapController.updateRoadmap
);

// API #5: DELETE /admin/roadmaps/:id
adminRoadmapRoutes.delete(
    "/:id",
    validationParams(RoadmapIdParamDto),
    roadmapController.deleteRoadmap
);

// API #6: PATCH /admin/roadmaps/:id/publish
adminRoadmapRoutes.patch(
    "/:id/publish",
    validationParams(RoadmapIdParamDto),
    roadmapController.togglePublishRoadmap
);

// API #7: POST /admin/roadmaps/:id/courses
adminRoadmapRoutes.post(
    "/:id/courses",
    validationParams(RoadmapIdParamDto),
    validationBody(AddCoursesToRoadmapReqDto),
    roadmapController.addCourses
);

// API #8: DELETE /admin/roadmaps/:id/courses/:courseId
adminRoadmapRoutes.delete(
    "/:id/courses/:courseId",
    validationParams(RoadmapCourseParamDto),
    roadmapController.removeCourse
);

export default adminRoadmapRoutes;
