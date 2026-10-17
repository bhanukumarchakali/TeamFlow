import projectMember from "../models/projectMemberModel.js";
import Project from "../models/projectModel.js";
import member from "../models/memberModel.js";

export const addProjectMember = async (req, res) => {
  try {
    const { workspaceId, projectId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    if (role !== undefined && !["manager", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project member role",
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

    const workspaceMember = await member.findOne({
      workspace: workspaceId,
      user: userId,
    });

    if (!workspaceMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this workspace",
      });
    }

    const existingProjectMember = await projectMember.findOne({
      project: projectId,
      user: userId,
    });

    if (existingProjectMember) {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this project",
      });
    }

    const newProjectMember = await projectMember.create({
      project: projectId,
      user: userId,
      role: role || "member",
    });

    return res.status(201).json({
      success: true,
      message: "Project member added successfully",
      projectMember: newProjectMember,
    });
  } catch (error) {
    console.error("Add project member error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to add project member",
    });
  }
};

export const getProjectMembers = async (req, res) => {
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

    const projectMembers = await projectMember
      .find({
        project: projectId,
      })
      .populate("user", "firstName lastName email avatar");

    return res.status(200).json({
      success: true,
      projectMembers,
    });
  } catch (error) {
    console.error("Get project members error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project members",
    });
  }
};

export const removeProjectMember = async (req, res) => {
  try {
    const { workspaceId, projectId, userId } = req.params;

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

    const projectMemberDoc = await projectMember.findOne({
      project: projectId,
      user: userId,
    });

    if (!projectMemberDoc) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this project",
      });
    }

    await projectMember.deleteOne({
      _id: projectMemberDoc._id,
    });

    return res.status(200).json({
      success: true,
      message: "Project member removed successfully",
    });
  } catch (error) {
    console.error("Remove project member error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to remove project member",
    });
  }
};

export const updateProjectMemberRole = async (req, res) => {
  try {
    const { workspaceId, projectId, userId } = req.params;
    const { role } = req.body;

    if (!["manager", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project member role",
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

    const projectMemberDoc = await projectMember.findOne({
      project: projectId,
      user: userId,
    });

    if (!projectMemberDoc) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this project",
      });
    }

    projectMemberDoc.role = role;

    await projectMemberDoc.save();

    return res.status(200).json({
      success: true,
      message: "Project member role updated successfully",
      projectMember: projectMemberDoc,
    });
  } catch (error) {
    console.error("Update project member role error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update project member role",
    });
  }
};
