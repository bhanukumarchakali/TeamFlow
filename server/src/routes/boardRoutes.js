import express from "express";

import {
  createBoard,
  getProjectBoards,
  getBoard,
  updateBoard,
  deleteBoard,
} from "../controllers/boardController.js";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceOwner,
} from "../middlewares/workspaceMiddleware.js";
const boardRouter = express.Router();

boardRouter.post(
  "/workspace/:workspaceId/:projectId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  createBoard,
);

boardRouter.get(
  "/workspace/:workspaceId/:projectId",
  authMiddlewares,
  requireWorkspaceMember,
  getProjectBoards,
);
boardRouter.get(
  "/workspace/:workspaceId/:projectId/:boardId",
  authMiddlewares,
  requireWorkspaceMember,
  getBoard,
);

boardRouter.patch(
  "/workspace/:workspaceId/:projectId/:boardId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  updateBoard,
);

boardRouter.delete(
  "/workspace/:workspaceId/:projectId/:boardId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  deleteBoard,
);

export default boardRouter;
