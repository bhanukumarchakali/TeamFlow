import express from "express";

import { authMiddlewares } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import { requireWorkspaceAdmin } from "../middlewares/workspaceMiddleware.js";
import { addProjectMember } from "../controllers/projectMemberController.js";
import { getProjectMembers } from "../controllers/projectMemberController.js";
import { removeProjectMember } from "../controllers/projectMemberController.js";
import { updateProjectMemberRole } from "../controllers/projectMemberController.js";
const proMrouter = express.Router();

proMrouter.post(
  "/workspace/:workspaceId/:projectId/members",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  addProjectMember,
);

proMrouter.get(
  "/workspace/:workspaceId/:projectId/getmembers",
  authMiddlewares,
  requireWorkspaceMember,
  getProjectMembers,
);
proMrouter.delete(
  "/workspace/:workspaceId/:projectId/members/:userId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  removeProjectMember,
);
proMrouter.patch(
  "/workspace/:workspaceId/:projectId/members/:userId",
  authMiddlewares,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  updateProjectMemberRole,
);
export default proMrouter;
