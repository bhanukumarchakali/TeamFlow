import express from "express";

import { authMiddlewares } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import {
  createConversation,
  getMyConversations,
  addConversationMember,
  removeConversationMember,
  updateConversation,
  archiveConversation,
  unarchiveConversation,
  getMyArchivedConversations,
} from "../controllers/conversationController.js";

const conversationRouter = express.Router();

conversationRouter.post(
  "/workspace/:workspaceId",
  authMiddlewares,
  requireWorkspaceMember,
  createConversation,
);

conversationRouter.get(
  "/workspace/:workspaceId",
  authMiddlewares,
  requireWorkspaceMember,
  getMyConversations,
);

conversationRouter.post(
  "/workspace/:workspaceId/:conversationId/members",
  authMiddlewares,
  requireWorkspaceMember,
  addConversationMember,
);
conversationRouter.delete(
  "/workspace/:workspaceId/:conversationId/members/:userId",
  authMiddlewares,
  requireWorkspaceMember,
  removeConversationMember,
);
conversationRouter.patch(
  "/workspace/:workspaceId/:conversationId",
  authMiddlewares,
  requireWorkspaceMember,
  updateConversation,
);
conversationRouter.patch(
  "/workspace/:workspaceId/:conversationId/archive",
  authMiddlewares,
  requireWorkspaceMember,
  archiveConversation,
);
conversationRouter.patch(
  "/workspace/:workspaceId/:conversationId/unarchive",
  authMiddlewares,
  requireWorkspaceMember,
  unarchiveConversation,
);
conversationRouter.get(
  "/workspace/:workspaceId/archived",
  authMiddlewares,
  requireWorkspaceMember,
  getMyArchivedConversations,
);

export default conversationRouter;
