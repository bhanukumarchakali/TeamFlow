import express from "express";

import { authMiddlewares } from "../middlewares/authMiddleware.js";

import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import {
  sendMessage,
  getConversationMessages,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
  searchMessages,
  reactToMessage,
  togglePinMessage,
} from "../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.post(
  "/workspace/:workspaceId/:conversationId",
  authMiddlewares,
  requireWorkspaceMember,
  sendMessage,
);
messageRouter.get(
  "/workspace/:workspaceId/:conversationId",
  authMiddlewares,
  requireWorkspaceMember,
  getConversationMessages,
);
messageRouter.patch(
  "/workspace/:workspaceId/:conversationId/read",
  authMiddlewares,
  requireWorkspaceMember,
  markMessagesAsRead,
);
messageRouter.get(
  "/workspace/:workspaceId/:conversationId/unread",
  authMiddlewares,
  requireWorkspaceMember,
  getUnreadMessageCount,
);
messageRouter.patch(
  "/workspace/:workspaceId/:conversationId/:messageId",
  authMiddlewares,
  requireWorkspaceMember,
  editMessage,
);
messageRouter.delete(
  "/workspace/:workspaceId/:conversationId/:messageId",
  authMiddlewares,
  requireWorkspaceMember,
  deleteMessage,
);
messageRouter.get(
  "/workspace/:workspaceId/:conversationId/search",
  authMiddlewares,
  searchMessages,
);

messageRouter.patch("/:messageId/reaction", authMiddlewares, reactToMessage);

messageRouter.patch("/:messageId/pin", authMiddlewares, togglePinMessage);

export default messageRouter;
