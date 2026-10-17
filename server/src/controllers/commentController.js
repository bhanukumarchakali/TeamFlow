import Comment from "../models/commentModel.js";
import Activity from "../models/activityModel.js";
import Task from "../models/taskModel.js";
import Project from "../models/projectModel.js";
import Board from "../models/boardModel.js";

export const createComment = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, taskId } = req.params;

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      workspace: workspaceId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const board = await Board.findOne({
      _id: boardId,
      project: projectId,
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      board: boardId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const comment = await Comment.create({
      task: taskId,
      user: req.user.userId,
      content,
    });

    await comment.populate("user", "firstName lastName email avatar");
    const activity = await Activity.create({
      workspace: workspaceId,
      project: projectId,
      board: boardId,
      task: taskId,
      user: req.user.userId,
      action: "comment_created",
      details: `Added a comment to task "${task.title}"`,
    });

    await activity.populate([
      {
        path: "user",
        select: "firstName lastName email avatar",
      },
      {
        path: "task",
        select: "title",
      },
    ]);
    const io = req.app.get("io");
    io.to(`workspace:${workspaceId}`).emit("activityCreated", {
      activity,
    });
    const roomName = `workspace:${workspaceId}`;
    const room = io.sockets.adapter.rooms.get(roomName);

    console.log("Emitting commentCreated to:", roomName);
    console.log("Sockets currently in room:", room ? [...room] : []);

    io.to(`workspace:${workspaceId}`).emit("commentCreated", {
      comment,
    });
    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    console.error("Create comment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create comment",
    });
  }
};

export const getTaskComments = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, taskId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      workspace: workspaceId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const board = await Board.findOne({
      _id: boardId,
      project: projectId,
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      board: boardId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const comments = await Comment.find({
      task: taskId,
    })
      .populate("user", "firstName lastName email avatar")
      .sort({
        createdAt: 1,
      });

    return res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error("Get task comments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task comments",
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, taskId, commentId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      workspace: workspaceId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const board = await Board.findOne({
      _id: boardId,
      project: projectId,
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      board: boardId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      task: taskId,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comment",
      });
    }
    const activity = await Activity.create({
      workspace: workspaceId,
      project: projectId,
      board: boardId,
      task: taskId,
      user: req.user.userId,
      action: "comment_deleted",
      details: `Deleted a comment from task "${task.title}"`,
    });

    await activity.populate([
      {
        path: "user",
        select: "firstName lastName email avatar",
      },
      {
        path: "task",
        select: "title",
      },
    ]);

    await Comment.deleteOne({
      _id: commentId,
    });
    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("commentDeleted", {
      commentId,
      taskId,
    });
    io.to(`workspace:${workspaceId}`).emit("activityCreated", {
      activity,
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
};
