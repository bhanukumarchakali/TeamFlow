import member from "../models/memberModel.js";
import workspace from "../models/workspaceModel.js";
export const requireWorkspaceMember = async (req, res, next) => {
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

    req.workspaceMember = workspaceMember;

    next();
  } catch (error) {
    console.error("Workspace member middleware error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify workspace membership",
    });
  }
};

export const requireWorkspaceAdmin = async (req, res, next) => {
  try {
    if (!req.workspaceMember) {
      return res.status(403).json({
        success: false,
        message: "Workspace membership not verified",
      });
    }
    console.log("Workspace permission check:", {
      userId: req.user.userId,
      workspaceId: req.params.workspaceId,
      role: req.workspaceMember.role,
    });

    if (!["owner", "admin"].includes(req.workspaceMember.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  } catch (error) {
    console.error("Workspace admin middleware error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify workspace permissions",
    });
  }
};

export const requireWorkspaceOwner = async (req, res, next) => {
  try {
    if (!req.workspaceMember) {
      return res.status(403).json({
        success: false,
        message: "Workspace membership not verified",
      });
    }

    if (req.workspaceMember.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can perform this action",
      });
    }

    next();
  } catch (error) {
    console.error("Workspace owner middleware error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify workspace ownership",
    });
  }
};

export const requireActiveWorkspace = async (req, res, next) => {
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

    req.workspace = Workspace;
    next();
  } catch (error) {
    console.error("Active workspace check error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify workspace status",
    });
  }
};
