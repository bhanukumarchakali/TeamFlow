import express from "express";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceOwner,
} from "../middlewares/workspaceMiddleware.js";

import {
  createComment,
  getTaskComments,
  deleteComment,
} from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter.post(
  "/workspace/:workspaceId/:projectId/:boardId/:taskId",
  authMiddlewares,
  requireWorkspaceMember,
  createComment,
);

commentRouter.get(
  "/workspace/:workspaceId/:projectId/:boardId/:taskId",
  authMiddlewares,
  requireWorkspaceMember,
  getTaskComments,
);
commentRouter.delete(
  "/workspace/:workspaceId/:projectId/:boardId/:taskId/:commentId",
  authMiddlewares,
  requireWorkspaceMember,
  deleteComment,
);
export default commentRouter;
