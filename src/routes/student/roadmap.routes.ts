import { Router } from "express";
import { container } from "tsyringe";
import RoadmapController from "../../controllers/roadmap.controller";
import { validationParams } from "../../middlewares/validationError.middleware";
import { RoadmapIdParamDto } from "../../dtos/request/roadmap.request.dto";

const studentRoadmapRoutes = Router();
const roadmapController = container.resolve(RoadmapController);

// GET /student/roadmaps/:id/structure (public - không cần auth)
studentRoadmapRoutes.get(
    "/:id/structure",
    validationParams(RoadmapIdParamDto),
    roadmapController.getRoadmapStructure
);

export default studentRoadmapRoutes;
