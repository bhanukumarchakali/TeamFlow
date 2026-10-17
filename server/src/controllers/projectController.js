import Project from "../models/projectModel.js";

export const createProject = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, key, avatar } = req.body;
    if (!name || !key) {
      return res.status(400).json({
        success: false,
        message: "Project name and key are required",
      });
    }

    const existingProject = await Project.findOne({
      workspace: workspaceId,
      key: key.trim().toUpperCase(),
    });

    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: "Project key already exists in this workspace",
      });
    }
    const project = await Project.create({
      name,
      description,
      key: key.trim().toUpperCase(),
      workspace: workspaceId,
      owner: req.user.userId,
      avatar,
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Project key already exists in this workspace",
      });
    }

    console.error("Create project error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
};

export const getWorkspaceProjects = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const projects = await Project.find({
      workspace: workspaceId,
      status: "active",
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get workspace projects error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspace projects",
    });
  }
};

export const getProject = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get project error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project",
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { workspaceId, projectId } = req.params;
    const { name, description, key, avatar, status } = req.body;

    if (
      name === undefined &&
      description === undefined &&
      key === undefined &&
      avatar === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required",
      });
    }
    if (status !== undefined && !["active", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project status",
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

    if (key !== undefined) {
      const normalizedKey = key.trim().toUpperCase();

      const existingProject = await Project.findOne({
        workspace: workspaceId,
        key: normalizedKey,
        _id: { $ne: projectId },
      });

      if (existingProject) {
        return res.status(409).json({
          success: false,
          message: "Project key already exists in this workspace",
        });
      }

      project.key = normalizedKey;
    }

    if (name !== undefined) {
      project.name = name;
    }

    if (description !== undefined) {
      project.description = description;
    }

    if (avatar !== undefined) {
      project.avatar = avatar;
    }

    if (status !== undefined) {
      project.status = status;
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Project key already exists in this workspace",
      });
    }
    console.error("Update project error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update project",
    });
  }
};

export const deleteProject = async (req, res) => {
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

    await Project.deleteOne({
      _id: projectId,
    });

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
};
