import Task from "../models/taskModel.js";
import Project from "../models/projectModel.js";
import Board from "../models/boardModel.js";
import Column from "../models/columnModel.js";
import projectMember from "../models/projectMemberModel.js";
import Activity from "../models/activityModel.js";

export const createTask = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, columnId } = req.params;

    const {
      title,
      description,
      assignedTo,
      priority,
      status,
      dueDate,
      position,
    } = req.body;

    if (
      dueDate !== undefined &&
      dueDate !== null &&
      dueDate !== "" &&
      Number.isNaN(Date.parse(dueDate))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task due date",
      });
    }

    if (
      position !== undefined &&
      (!Number.isInteger(position) || position < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Task position must be a non-negative integer",
      });
    }

    const allowedStatuses = ["todo", "in_progress", "review", "done"];
    const allowedPriorities = ["low", "medium", "high", "urgent"];

    if (priority !== undefined && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
    }

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
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

    const column = await Column.findOne({
      _id: columnId,
      board: boardId,
      isActive: true,
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    if (assignedTo) {
      const assignedProjectMember = await projectMember.findOne({
        project: projectId,
        user: assignedTo,
      });

      if (!assignedProjectMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is not a member of this project",
        });
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      project: projectId,
      board: boardId,
      column: columnId,
      createdBy: req.user.userId,
      assignedTo: assignedTo || null,
      priority: priority || "medium",
      status: status || "todo",
      dueDate: dueDate || null,
      position: position ?? 0,
    });

    const activity = await Activity.create({
      workspace: workspaceId,
      project: projectId,
      board: boardId,
      task: task._id,
      user: req.user.userId,
      action: "task_created",
      details: `Created task "${task.title}"`,
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

    io.to(`workspace:${workspaceId}`).emit("taskCreated", {
      task,
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
};

export const getColumnTasks = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, columnId } = req.params;

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

    const column = await Column.findOne({
      _id: columnId,
      board: boardId,
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    const tasks = await Task.find({
      project: projectId,
      board: boardId,
      column: columnId,
      isActive: true,
    })
      .populate("assignedTo", "firstName lastName email avatar")
      .sort({
        position: 1,
      });

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get column tasks error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch column tasks",
    });
  }
};

export const getTask = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, columnId, taskId } = req.params;

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

    const column = await Column.findOne({
      _id: columnId,
      board: boardId,
      isActive: true,
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      board: boardId,
      column: columnId,
      isActive: true,
    })
      .populate("createdBy", "firstName lastName email avatar")
      .populate("assignedTo", "firstName lastName email avatar");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Get task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task",
    });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, columnId, taskId } = req.params;

    const {
      title,
      description,
      assignedTo,
      priority,
      status,
      dueDate,
      position,
    } = req.body;

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    if (
      dueDate !== undefined &&
      dueDate !== null &&
      dueDate !== "" &&
      Number.isNaN(Date.parse(dueDate))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task due date",
      });
    }

    const allowedStatuses = ["todo", "in_progress", "review", "done"];
    const allowedPriorities = ["low", "medium", "high", "urgent"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    if (priority !== undefined && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
    }

    if (
      position !== undefined &&
      (!Number.isInteger(position) || position < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Task position must be a non-negative integer",
      });
    }

    if (
      title === undefined &&
      description === undefined &&
      assignedTo === undefined &&
      priority === undefined &&
      status === undefined &&
      dueDate === undefined &&
      position === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required",
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

    const column = await Column.findOne({
      _id: columnId,
      board: boardId,
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      board: boardId,
      column: columnId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (assignedTo !== undefined && assignedTo !== null) {
      const assignedProjectMember = await projectMember.findOne({
        project: projectId,
        user: assignedTo,
      });

      if (!assignedProjectMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is not a member of this project",
        });
      }

      task.assignedTo = assignedTo;
    }

    if (assignedTo === null) {
      task.assignedTo = null;
    }

    if (title !== undefined) {
      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description = description;
    }

    if (priority !== undefined) {
      task.priority = priority;
    }

    if (status !== undefined) {
      task.status = status;
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate;
    }

    if (position !== undefined) {
      task.position = position;
    }

    await task.save();

    await task.populate([
      {
        path: "createdBy",
        select: "firstName lastName email avatar",
      },
      {
        path: "assignedTo",
        select: "firstName lastName email avatar",
      },
    ]);
    if (assignedTo !== undefined) {
      await Activity.create({
        workspace: workspaceId,
        project: projectId,
        board: boardId,
        task: task._id,
        user: req.user.userId,
        action: "task_assigned",
        details: assignedTo
          ? `Assigned task "${task.title}"`
          : `Unassigned task "${task.title}"`,
      });
    } else {
      await Activity.create({
        workspace: workspaceId,
        project: projectId,
        board: boardId,
        task: task._id,
        user: req.user.userId,
        action: "task_updated",
        details: `Updated task "${task.title}"`,
      });
    }
    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("taskUpdated", {
      task,
    });

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Update task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, columnId, taskId } = req.params;

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

    const column = await Column.findOne({
      _id: columnId,
      board: boardId,
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      board: boardId,
      column: columnId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    task.isActive = false;

    await task.save();
    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("taskDeleted", {
      taskId: task._id,
    });

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
};

export const moveTask = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, taskId } = req.params;

    const { columnId, position, status } = req.body;
    if (
      position !== undefined &&
      (!Number.isInteger(position) || position < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Task position must be a non-negative integer",
      });
    }
    const allowedStatuses = ["todo", "in_progress", "review", "done"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    if (!columnId) {
      return res.status(400).json({
        success: false,
        message: "Column ID is required",
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

    const column = await Column.findOne({
      _id: columnId,
      board: boardId,
      isActive: true,
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      board: boardId,
      column: req.params.columnId,
      isActive: true,
    });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    task.column = columnId;

    if (position !== undefined) {
      task.position = position;
    }

    if (status !== undefined) {
      task.status = status;
    }

    await task.save();

    await Activity.create({
      workspace: workspaceId,
      project: projectId,
      board: boardId,
      task: task._id,
      user: req.user.userId,
      action: "task_moved",
      details: `Moved task "${task.title}"`,
    });
    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("taskMoved", {
      task,
    });

    return res.status(200).json({
      success: true,
      message: "Task moved successfully",
      task,
    });
  } catch (error) {
    console.error("Move task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to move task",
    });
  }
};
