import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDb from "./src/config/db.js";
import router from "./src/routes/authRoutes.js";
import workrouter from "./src/routes/workspaceRoutes.js";
import prorouter from "./src/routes/projectRoutes.js";
import proMrouter from "./src/routes/projectMemberRoutes.js";
import boardRouter from "./src/routes/boardRoutes.js";
import columnRouter from "./src/routes/columnRoutes.js";
import taskRouter from "./src/routes/taskRoutes.js";
import commentRouter from "./src/routes/commentRoutes.js";
import activityRouter from "./src/routes/activityRoutes.js";
import { Server } from "socket.io";
import conversationRouter from "./src/routes/conversationRoutes.js";
import messageRouter from "./src/routes/messageRoutes.js";
import "./src/config/cloudinary.js";
import uploadRouter from "./src/routes/uploadRoutes.js";
import dashboardRouter from "./src/routes/dashboardRoutes.js";
import member from "./src/models/memberModel.js";
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

connectDb();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/auth", router);
app.use("/api/workspaces", workrouter);
app.use("/api/projects", prorouter);
app.use("/api/project-members", proMrouter);
app.use("/api/boards", boardRouter);
app.use("/api/columns", columnRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/comments", commentRouter);
app.use("/api/activities", activityRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/messages", messageRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/", (req, res) => {
  res.send("Server running");
});

const server = app.listen(port, () => {
  console.log(`Server running at Port ${port}`);
});

const io = new Server(server, {
  cors: {
    origin:process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      return next(new Error("Authentication required"));
    }

    const token = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("token="))
      ?.slice("token=".length);

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return next(new Error("Invalid authentication token"));
    }

    socket.userId = decoded.userId.toString();

    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(new Error("Invalid or expired authentication token"));
  }
});

app.set("io", io);

const onlineUsers = new Map();
const workspaceOnlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket Connnected", socket.id);

  socket.on("joinWorkspace", async ({ workspaceId } = {}) => {
    try {
      if (!workspaceId) {
        socket.emit("workspaceJoinError", {
          message: "Workspace ID is required",
        });
        return;
      }

      // Always use the identity verified by JWT authentication.
      const userId = socket.userId;

      // Verify that this authenticated user belongs to the workspace.
      const workspaceMember = await member.findOne({
        workspace: workspaceId,
        user: userId,
      });

      if (!workspaceMember) {
        socket.emit("workspaceJoinError", {
          message: "You are not a member of this workspace",
        });
        return;
      }

      const normalizedWorkspaceId = String(workspaceId);

      // Prevent duplicate joins on the same socket.
      socket.workspaceIds ??= new Set();

      if (socket.workspaceIds.has(normalizedWorkspaceId)) {
        return;
      }

      socket.join(`workspace:${normalizedWorkspaceId}`);
      socket.join(`user:${userId}`);

      socket.workspaceIds.add(normalizedWorkspaceId);

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }

      const userSockets = onlineUsers.get(userId);
      const wasOffline = userSockets.size === 0;

      userSockets.add(socket.id);

      if (!workspaceOnlineUsers.has(normalizedWorkspaceId)) {
        workspaceOnlineUsers.set(normalizedWorkspaceId, new Set());
      }

      const workspaceUsers = workspaceOnlineUsers.get(normalizedWorkspaceId);

      const wasOfflineInWorkspace = !workspaceUsers.has(userId);

      workspaceUsers.add(userId);

      socket.emit("workspaceOnlineUsers", {
        userIds: [...workspaceUsers],
      });

      if (wasOfflineInWorkspace) {
        io.to(`workspace:${normalizedWorkspaceId}`).emit("userOnline", {
          userId,
        });
      }

      console.log(`User ${userId} joined workspace:${normalizedWorkspaceId}`);
    } catch (error) {
      console.error("Workspace socket join error:", error.message);

      socket.emit("workspaceJoinError", {
        message: "Unable to join workspace",
      });
    }
  });

  // Remove a user from workspace presence only when none of
  // their other connected sockets are still in that workspace.
  const updateWorkspacePresence = (workspaceId, userId) => {
    const workspaceUsers = workspaceOnlineUsers.get(workspaceId);

    if (!workspaceUsers) return;

    const userStillOnlineInWorkspace = [
      ...(onlineUsers.get(userId) ?? []),
    ].some((socketId) => {
      const connectedSocket = io.sockets.sockets.get(socketId);

      return connectedSocket?.workspaceIds?.has(workspaceId);
    });

    if (!userStillOnlineInWorkspace && workspaceUsers.has(userId)) {
      workspaceUsers.delete(userId);

      io.to(`workspace:${workspaceId}`).emit("userOffline", {
        userId,
      });
    }

    if (workspaceUsers.size === 0) {
      workspaceOnlineUsers.delete(workspaceId);
    }
  };

  socket.on("leaveWorkspace", (workspaceId) => {
    const normalizedWorkspaceId = String(workspaceId ?? "");

    if (!socket.workspaceIds?.has(normalizedWorkspaceId)) {
      return;
    }

    socket.leave(`workspace:${normalizedWorkspaceId}`);
    socket.workspaceIds.delete(normalizedWorkspaceId);

    updateWorkspacePresence(normalizedWorkspaceId, socket.userId);

    console.log(`Socket ${socket.id} left workspace:${normalizedWorkspaceId}`);
  });

  socket.on("typingStart", ({ workspaceId, conversationId } = {}) => {
    const normalizedWorkspaceId = String(workspaceId ?? "");

    if (!socket.workspaceIds?.has(normalizedWorkspaceId)) {
      return;
    }

    socket.to(`workspace:${normalizedWorkspaceId}`).emit("typingStart", {
      userId: socket.userId,
      conversationId,
    });
  });

  socket.on("typingStop", ({ workspaceId, conversationId } = {}) => {
    const normalizedWorkspaceId = String(workspaceId ?? "");

    if (!socket.workspaceIds?.has(normalizedWorkspaceId)) {
      return;
    }

    socket.to(`workspace:${normalizedWorkspaceId}`).emit("typingStop", {
      userId: socket.userId,
      conversationId,
    });
  });

  socket.on("disconnect", () => {
    const userId = socket.userId;

    if (!userId) {
      console.log("Socket disconnected:", socket.id);
      return;
    }

    // Remove this socket from the user's connected sockets.
    const userSockets = onlineUsers.get(userId);

    if (userSockets) {
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
      }
    }

    // Update presence for every workspace this socket had joined.
    for (const workspaceId of socket.workspaceIds ?? []) {
      updateWorkspacePresence(workspaceId, userId);
    }

    console.log("Socket disconnected:", socket.id);
  });
});
