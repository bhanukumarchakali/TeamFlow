import Activity from "../models/activityModel.js";
import Project from "../models/projectModel.js";

export const getProjectActivities = async (req, res) => {
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

    const activities = await Activity.find({
      workspace: workspaceId,
      project: projectId,
    })
      .populate("user", "firstName lastName email avatar")
      .populate("task", "title")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Get project activities error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project activities",
    });
  }
};

export const getTaskActivities = async (req, res) => {
  try {
    const { workspaceId, projectId, taskId } = req.params;

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

    const activities = await Activity.find({
      workspace: workspaceId,
      project: projectId,
      task: taskId,
    })
      .populate("user", "firstName lastName email avatar")
      .populate("task", "title")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Get task activities error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task activities",
    });
  }
};
