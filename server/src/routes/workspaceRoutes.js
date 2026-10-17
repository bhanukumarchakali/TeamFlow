import express from "express";
import { createWorkspace } from "../controllers/workspaceController.js";
import { authMiddlewares } from "../middlewares/authMiddleware.js";
import { getWorkspaces } from "../controllers/workspaceController.js";
import { getWs } from "../controllers/workspaceController.js";
import { getMembers } from "../controllers/workspaceController.js";
import { addMember } from "../controllers/workspaceController.js";
import { removeMember } from "../controllers/workspaceController.js";
import { updateMember } from "../controllers/workspaceController.js";
import { requireWorkspaceAdmin } from "../middlewares/workspaceMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import {
  requireWorkspaceOwner,
  requireActiveWorkspace,
} from "../middlewares/workspaceMiddleware.js";
import {
  updateWorkspace,
  deleteWorkspace,
} from "../controllers/workspaceController.js";
import { getMyMembership } from "../controllers/workspaceController.js";

const workrouter = express.Router();

workrouter.post("/", authMiddlewares, createWorkspace);
workrouter.get("/", authMiddlewares, getWorkspaces);
workrouter.get("/:workspaceId", authMiddlewares, getWs);
workrouter.get(
  "/:workspaceId/membership",
  authMiddlewares,
  requireWorkspaceMember,
  getMyMembership,
);
workrouter.patch(
  "/:workspaceId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  updateWorkspace,
);
workrouter.get("/:workspaceId/members", authMiddlewares, getMembers);
workrouter.post(
  "/:workspaceId/members",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,

  addMember,
);
workrouter.delete(
  "/:workspaceId/members/:userId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  removeMember,
);
workrouter.delete(
  "/:workspaceId",
  authMiddlewares,
  requireActiveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  deleteWorkspace,
);
workrouter.patch(
  "/:workspaceId/members/:userId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  updateMember,
);

export default workrouter;
