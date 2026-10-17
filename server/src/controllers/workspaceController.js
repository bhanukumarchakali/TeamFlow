import workspace from "../models/workspaceModel.js";
import member from "../models/memberModel.js";
import User from "../models/userModel.js";

export const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Workspace name is required" });
    }

    const Workspace = await workspace.create({
      name,
      description,
      owner: req.user.userId,
    });
    await member.create({
      workspace: Workspace._id,
      user: req.user.userId,
      role: "owner",
    });

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      Workspace,
    });
  } catch (error) {
    console.error("Create workspace error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create workspace",
    });
  }
};

export const getWorkspaces = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const members = await member.find({ user: req.user.userId });

    const workspaceIds = members.map((member) => member.workspace);
    const Workspaces = await workspace.find({
      _id: { $in: workspaceIds },
      isActive: true,
    });
    return res.status(200).json({
      success: true,
      workspaces: Workspaces,
    });
  } catch (error) {
    console.error("cant get workspace:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get workspace",
    });
  }
};

export const getWs = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const Workspace = await workspace.findById(workspaceId);
    if (!Workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const Member = await member.findOne({
      workspace: workspaceId,
      user: req.user.userId,
    });

    if (!Member) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    return res.status(200).json({
      success: true,
      Workspace,
      role: Member.role,
    });
  } catch (error) {
    console.error("Get workspace error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspace",
    });
  }
};

export const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, avatar } = req.body;

    if (!name && !description && !avatar) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required",
      });
    }

    const Workspace = await workspace.findById(workspaceId);

    if (!Workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (name !== undefined) {
      Workspace.name = name;
    }

    if (description !== undefined) {
      Workspace.description = description;
    }

    if (avatar !== undefined) {
      Workspace.avatar = avatar;
    }

    await Workspace.save();

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("workspaceUpdated", {
      workspace: Workspace,
    });

    return res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      Workspace,
    });
  } catch (error) {
    console.error("Update workspace error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update workspace",
    });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const Workspace = await workspace.findOne({
      _id: workspaceId,
      isActive: true,
    });

    if (!Workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found or inactive",
      });
    }

    Workspace.isActive = false;
    await Workspace.save();

    const io = req.app.get("io");

    if (io) {
      io.to(`workspace:${workspaceId}`).emit("workspaceDeleted", {
        workspaceId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace archived successfully",
    });
  } catch (error) {
    console.error("Delete workspace error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to archive workspace",
    });
  }
};

export const getMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const Member = await member.findOne({
      workspace: workspaceId,
      user: req.user.userId,
    });

    if (!Member) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    const Members = await member
      .find({
        workspace: workspaceId,
      })
      .populate("user", "firstName lastName email avatar");

    return res.status(200).json({
      success: true,
      Members,
    });
  } catch (error) {
    console.error("Get workspace members error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspace members",
    });
  }
};

export const addMember = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingMember = await member.findOne({
      workspace: workspaceId,
      user: user._id,
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this workspace",
      });
    }

    const requestedRole = role || "member";

    if (!["admin", "member"].includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (requestedRole === "admin" && req.workspaceMember.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can add admins",
      });
    }

    const newMember = await member.create({
      workspace: workspaceId,
      user: user._id,
      role: requestedRole,
    });

    await newMember.populate("user", "firstName lastName email avatar");

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("memberAdded", {
      member: newMember,
    });

    return res.status(201).json({
      success: true,
      message: "Member added successfully",
      Member: newMember,
    });
  } catch (error) {
    console.error("Add workspace member error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to add workspace member",
    });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;

    if (req.user.userId === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself from the workspace",
      });
    }

    const Workspace = await workspace.findById(workspaceId);

    if (!Workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (Workspace.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "Workspace owner cannot be removed",
      });
    }

    const Member = await member.findOne({
      workspace: workspaceId,
      user: userId,
    });

    if (!Member) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this workspace",
      });
    }

    await member.deleteOne({
      _id: Member._id,
    });
    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("memberRemoved", {
      userId,
    });
    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove workspace member error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to remove workspace member",
    });
  }
};

export const updateMember = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;
    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const Member = await member.findOne({
      workspace: workspaceId,
      user: userId,
    });

    if (!Member) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this workspace",
      });
    }

    if (Member.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "Workspace owner role cannot be changed",
      });
    }

    Member.role = role;

    await Member.save();

    await Member.populate("user", "firstName lastName email avatar");

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("memberRoleUpdated", {
      member: Member,
    });

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      Member,
    });
  } catch (error) {
    console.error("Update workspace member role error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update member role",
    });
  }
};

export const getMyMembership = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspaceMember = await member.findOne({
      workspace: workspaceId,
      user: req.user.userId,
    });

    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    return res.status(200).json({
      success: true,
      role: workspaceMember.role,
    });
  } catch (error) {
    console.error("Get my workspace membership error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspace membership",
    });
  }
};
