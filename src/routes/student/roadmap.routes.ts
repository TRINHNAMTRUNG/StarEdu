import { Router } from "express";
import { container } from "tsyringe";
import StudentRoadmapController from "../../controllers/student-roadmap.controller";
import { validationParams } from "../../middlewares/validationError.middleware";
import { RoadmapIdParamDto } from "../../dtos/request/roadmap.request.dto";

const studentRoadmapRoutes = Router();
const studentRoadmapController = container.resolve(StudentRoadmapController);

// API #4: GET /student/roadmaps (public - KHONG can auth)
studentRoadmapRoutes.get("/", studentRoadmapController.getRoadmaps);

// API #5: GET /student/roadmaps/:id (public - KHONG can auth)
studentRoadmapRoutes.get(
    "/:id",
    validationParams(RoadmapIdParamDto),
    studentRoadmapController.getRoadmapById
);

// GET /student/roadmaps/:id/structure (public - không cần auth)
studentRoadmapRoutes.get(
    "/:id/structure",
    validationParams(RoadmapIdParamDto),
    studentRoadmapController.getRoadmapStructure
);

export default studentRoadmapRoutes;
