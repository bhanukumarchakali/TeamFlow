import Board from "../models/boardModel.js";

import Project from "../models/projectModel.js";

export const createBoard = async (req, res) => {
  try {
    const { workspaceId, projectId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Board name is required",
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

    const board = await Board.create({
      name,
      description,
      project: projectId,
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Board created successfully",
      board,
    });
  } catch (error) {
    console.error("Create board error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create board",
    });
  }
};

export const getProjectBoards = async (req, res) => {
  try {
    const { workspaceId, projectId } = req.params;

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

    const boards = await Board.find({
      project: projectId,
      isActive: true,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      boards,
    });
  } catch (error) {
    console.error("Get project boards error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project boards",
    });
  }
};

export const getBoard = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      board,
    });
  } catch (error) {
    console.error("Get board error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch board",
    });
  }
};

export const updateBoard = async (req, res) => {
  try {
    const { workspaceId, projectId, boardId } = req.params;
    const { name, description, isActive } = req.body;

    if (
      name === undefined &&
      description === undefined &&
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

    if (name !== undefined) {
      board.name = name;
    }

    if (description !== undefined) {
      board.description = description;
    }

    if (isActive !== undefined) {
      board.isActive = isActive;
    }

    await board.save();

    return res.status(200).json({
      success: true,
      message: "Board updated successfully",
      board,
    });
  } catch (error) {
    console.error("Update board error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update board",
    });
  }
};

export const deleteBoard = async (req, res) => {
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

    await Board.deleteOne({
      _id: boardId,
    });

    return res.status(200).json({
      success: true,
      message: "Board deleted successfully",
    });
  } catch (error) {
    console.error("Delete board error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete board",
    });
  }
};
