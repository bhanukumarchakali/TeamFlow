import express from "express";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceOwner,
} from "../middlewares/workspaceMiddleware.js";
import {
  createTask,
  getColumnTasks,
  getTask,
  updateTask,
  deleteTask,
  moveTask,
} from "../controllers/taskController.js";

const taskRouter = express.Router();

taskRouter.post(
  "/workspace/:workspaceId/:projectId/:boardId/:columnId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  createTask,
);
taskRouter.get(
  "/workspace/:workspaceId/:projectId/:boardId/:columnId",
  authMiddlewares,
  requireWorkspaceMember,
  getColumnTasks,
);
taskRouter.get(
  "/workspace/:workspaceId/:projectId/:boardId/:columnId/:taskId",
  authMiddlewares,
  requireWorkspaceMember,
  getTask,
);
taskRouter.patch(
  "/workspace/:workspaceId/:projectId/:boardId/:columnId/:taskId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  updateTask,
);
taskRouter.delete(
  "/workspace/:workspaceId/:projectId/:boardId/:columnId/:taskId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  deleteTask,
);
taskRouter.patch(
  "/workspace/:workspaceId/:projectId/:boardId/:columnId/:taskId/move",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  moveTask,
);

export default taskRouter;
