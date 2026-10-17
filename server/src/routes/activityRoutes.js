import express from "express";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import {
  getProjectActivities,
  getTaskActivities,
} from "../controllers/activityController.js";

const activityRouter = express.Router();

activityRouter.get(
  "/workspace/:workspaceId/:projectId",
  authMiddlewares,
  requireWorkspaceMember,
  getProjectActivities,
);
activityRouter.get(
  "/workspace/:workspaceId/:projectId/task/:taskId",
  authMiddlewares,
  requireWorkspaceMember,
  getTaskActivities,
);

export default activityRouter;
