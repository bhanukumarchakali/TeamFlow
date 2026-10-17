import Task from "../models/taskModel.js";
import Project from "../models/projectModel.js";
import mongoose from "mongoose";
import member from "../models/memberModel.js";




export const getDashboardStats = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.userId;

    // Check workspace membership and role
    const workspaceMember = await member.findOne({
      workspace: workspaceId,
      user: userId,
    }).select("role");

    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    // Get active projects
    const activeProjects = await Project.find({
      workspace: workspaceId,
      status: "active",
    }).select("_id");

    const projectIds = activeProjects.map((project) => project._id);

    const isWorkspaceAdmin = ["owner", "admin"].includes(
      workspaceMember.role
    );

    // Build the task filter based on role
    const taskFilter = {
      project: { $in: projectIds },
      isActive: true,
      ...(!isWorkspaceAdmin && { assignedTo: userId }),
    };

    // Count tasks by status
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      reviewTasks,
      overdueTasks,
    ] = await Promise.all([
      Task.countDocuments(taskFilter),

      Task.countDocuments({
        ...taskFilter,
        status: "done",
      }),

      Task.countDocuments({
        ...taskFilter,
        status: "in_progress",
      }),

      Task.countDocuments({
        ...taskFilter,
        status: "todo",
      }),

      Task.countDocuments({
        ...taskFilter,
        status: "review",
      }),

      Task.countDocuments({
        ...taskFilter,
        status: { $ne: "done" },
        dueDate: { $lt: new Date() },
      }),
    ]);

    // Calculate project count
    const totalProjects = isWorkspaceAdmin
      ? activeProjects.length
      : (await Task.distinct("project", taskFilter)).length;

    // Calculate completion percentage
    const taskCompletionRate =
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    return res.status(200).json({
      success: true,
      stats: {
        totalProjects,
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        taskCompletionRate,

        // New status breakdown
        taskStatusBreakdown: {
          todo: todoTasks,
          in_progress: inProgressTasks,
          review: reviewTasks,
          done: completedTasks,
        },
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
};

export const getMyAssignedTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.userId;

    const activeProjects = await Project.find({
      workspace: workspaceId,
      status: "active",
    }).select("_id name");

    const projectIds = activeProjects.map((project) => project._id);

    const tasks = await Task.find({
      project: { $in: projectIds },
      assignedTo: userId,
      isActive: true,
    })
      .populate("project", "name key")
      .sort({ dueDate: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get my assigned tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned tasks",
    });
  }
};
