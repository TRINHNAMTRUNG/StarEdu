
import { Router } from "express";
import studentAuthRoutes from "./auth.routes";

const studentRouter = Router();

studentRouter.use("/auth", studentAuthRoutes);


export default studentRouter;