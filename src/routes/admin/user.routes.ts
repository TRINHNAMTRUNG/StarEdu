import { Router } from "express";
import { container } from "tsyringe";
import { AdminController } from "../../controllers/admin.controller";

const router = Router();
const adminController = container.resolve(AdminController);

// Get all users with filters
router.get("/", adminController.getAllUsers);

// Get user statistics
router.get("/stats", adminController.getUserStats);

// Create new user
router.post("/", adminController.createUser);

// Get user by ID
router.get("/:id", adminController.getUserById);

// Update user status
router.patch("/:id/status", adminController.updateUserStatus);

// Update user information
router.put("/:id", adminController.updateUser);

// Delete user
router.delete("/:id", adminController.deleteUser);

export default router;
