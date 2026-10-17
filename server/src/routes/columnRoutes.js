import express from "express";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import {
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  requireWorkspaceOwner,
} from "../middlewares/workspaceMiddleware.js";
import {
  createcolumn,
  getBoardColumns,
  updateColumn,
  deleteColumn,
} from "../controllers/columnController.js";
const columnRouter = express.Router();

columnRouter.post(
  "/workspace/:workspaceId/:projectId/:boardId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  createcolumn,
);
columnRouter.get(
  "/workspace/:workspaceId/:projectId/:boardId",
  authMiddlewares,
  requireWorkspaceMember,
  getBoardColumns,
);
columnRouter.patch(
  "/workspace/:workspaceId/:projectId/:boardId/:columnId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  updateColumn,
);
columnRouter.delete(
  "/workspace/:workspaceId/:projectId/:boardId/:columnId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  deleteColumn,
);

export default columnRouter;
