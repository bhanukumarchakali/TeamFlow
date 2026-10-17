import Column from "../models/columnModel.js";
import Board from "../models/boardModel.js";
import Project from "../models/projectModel.js";
import Task from "../models/taskModel.js";

export const createcolumn = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId } = req.params;
    const { name, position } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Column name is required",
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
    const column = await Column.create({
      name,
      board: boardId,
      position: position ?? 0,
    });
    return res.status(201).json({
      success: true,
      message: "Column created successfully",
      column,
    });
  } catch (error) {
    console.error("Create column error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create column",
    });
  }
};

export const getBoardColumns = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId } = req.params;

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

    const columns = await Column.find({
      board: boardId,
      isActive: true,
    }).sort({
      position: 1,
    });

    return res.status(200).json({
      success: true,
      columns,
    });
  } catch (error) {
    console.error("Get board columns error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch board columns",
    });
  }
};

export const updateColumn = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId, columnId } = req.params;
    const { name, position, isActive } = req.body;

    if (
      name === undefined &&
      position === undefined &&
      isActive === undefined
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

    if (name !== undefined) {
      column.name = name;
    }

    if (position !== undefined) {
      column.position = position;
    }

    if (isActive !== undefined) {
      column.isActive = isActive;
    }

    await column.save();

    return res.status(200).json({
      success: true,
      message: "Column updated successfully",
      column,
    });
  } catch (error) {
    console.error("Update column error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update column",
    });
  }
};

export const deleteColumn = async (req, res) => {
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

    const activeTasks = await Task.countDocuments({
      column: columnId,
      isActive: true,
    });

    if (activeTasks > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a column that contains active tasks. Move the tasks to another column first.",
      });
    }

    await Column.deleteOne({
      _id: columnId,
    });

    return res.status(200).json({
      success: true,
      message: "Column deleted successfully",
    });
  } catch (error) {
    console.error("Delete column error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete column",
    });
  }
};
