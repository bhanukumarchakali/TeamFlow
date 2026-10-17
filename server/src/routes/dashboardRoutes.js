import express from "express";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import {
  getDashboardStats,
  getMyAssignedTasks,
} from "../controllers/dashboardController.js";

const dashboardRouter = express.Router();

dashboardRouter.get(
  "/workspace/:workspaceId/stats",
  authMiddlewares,
  requireWorkspaceMember,
  getDashboardStats,
);

dashboardRouter.get(
  "/workspace/:workspaceId/my-tasks",
  authMiddlewares,
  requireWorkspaceMember,
  getMyAssignedTasks,
);

export default dashboardRouter;
