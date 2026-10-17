import express from "express";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import {
  requireWorkspaceAdmin,
  requireActiveWorkspace,
} from "../middlewares/workspaceMiddleware.js";
import { requireWorkspaceOwner } from "../middlewares/workspaceMiddleware.js";
import { createProject } from "../controllers/projectController.js";
import { getWorkspaceProjects } from "../controllers/projectController.js";
import { getProject } from "../controllers/projectController.js";
import { updateProject } from "../controllers/projectController.js";
import { deleteProject } from "../controllers/projectController.js";

const prorouter = express.Router();

prorouter.post(
  "/workspace/:workspaceId",
  authMiddlewares,
  requireActiveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  createProject,
);

prorouter.get(
  "/workspace/:workspaceId",
  authMiddlewares,
  requireActiveWorkspace,
  requireWorkspaceMember,
  getWorkspaceProjects,
);
prorouter.get(
  "/workspace/:workspaceId/:projectId",
  authMiddlewares,
  requireActiveWorkspace,
  requireWorkspaceMember,
  getProject,
);
prorouter.patch(
  "/workspace/:workspaceId/:projectId",
  authMiddlewares,
  requireActiveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  updateProject,
);

prorouter.delete(
  "/workspace/:workspaceId/:projectId",
  authMiddlewares,
  requireActiveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  deleteProject,
);

export default prorouter;
