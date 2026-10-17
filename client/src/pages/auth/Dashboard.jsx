import { useCallback, useEffect, useState } from "react";
import api from "../../utils/api.js";
import { useNavigate } from "react-router-dom";
import socket from "../../utils/socket.js";
import { useWorkspace } from "../../context/useWorkspace.js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  FolderKanban,
  ListChecks,
  CircleCheck,
  Timer,
  CircleAlert,
  ChartNoAxesCombined,
} from "lucide-react";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    taskCompletionRate: 0,
  });

  const [myTasks, setMyTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState([]);

  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    workspaceLoading,
  } = useWorkspace();
  const [statsLoading, setStatsLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const taskStatusData = [
    {
      name: "To Do",
      value: dashboardStats.taskStatusBreakdown?.todo ?? 0,
      color: "#64748b",
    },
    {
      name: "In Progress",
      value: dashboardStats.taskStatusBreakdown?.in_progress ?? 0,
      color: "#3b82f6",
    },
    {
      name: "In Review",
      value: dashboardStats.taskStatusBreakdown?.review ?? 0,
      color: "#f59e0b",
    },
    {
      name: "Completed",
      value: dashboardStats.taskStatusBreakdown?.done ?? 0,
      color: "#22c55e",
    },
  ];
  const navigate = useNavigate();

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  const selectedWorkspace = workspaces.find(
    (workspace) => workspace._id === selectedWorkspaceId,
  );

  const fetchMyTasks = useCallback(async () => {
    if (!selectedWorkspaceId) {
      return;
    }

    setMyTasksLoading(true);

    try {
      const response = await api.get(
        `/api/dashboard/workspace/${selectedWorkspaceId}/my-tasks`,
      );

      setMyTasks(response.data.tasks || []);
    } catch (error) {
      console.error(
        "My assigned tasks error:",
        error.response?.data?.message || error.message,
      );
      setMyTasks([]);
    } finally {
      setMyTasksLoading(false);
    }
  }, [selectedWorkspaceId]);

  const fetchDashboardStats = useCallback(async () => {
    if (!selectedWorkspaceId) {
      setDashboardStats({
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        taskCompletionRate: 0,
        taskStatusBreakdown: {
          todo: 0,
          in_progress: 0,
          review: 0,
          done: 0,
        },
      });
      return;
    }

    setStatsLoading(true);

    try {
      const response = await api.get(
        `/api/dashboard/workspace/${selectedWorkspaceId}/stats`,
      );

      setDashboardStats(response.data.stats);
    } catch (error) {
      console.error(
        "Dashboard stats error:",
        error.response?.data?.message || error.message,
      );
    } finally {
      setStatsLoading(false);
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const handleCommentDeleted = (data) => {
      console.log("Comment deleted:", data);
    };

    socket.on("commentDeleted", handleCommentDeleted);

    return () => {
      socket.off("commentDeleted", handleCommentDeleted);
    };
  }, []);


useEffect(() => {
  if (!selectedWorkspaceId) {
    return;
  }

  let cancelled = false;

  const loadMyTasks = async () => {
    setMyTasksLoading(true);

    try {
      const response = await api.get(
        `/api/dashboard/workspace/${selectedWorkspaceId}/my-tasks`,
      );

      if (!cancelled) {
        setMyTasks(response.data.tasks || []);
      }
    } catch (error) {
      if (!cancelled) {
        console.error(
          "My assigned tasks error:",
          error.response?.data?.message || error.message,
        );
        setMyTasks([]);
      }
    } finally {
      if (!cancelled) {
        setMyTasksLoading(false);
      }
    }
  };

  loadMyTasks();

  return () => {
    cancelled = true;
  };
}, [selectedWorkspaceId]);


  useEffect(() => {
    const handleMemberAdded = (data) => {
      console.log("Member added:", data.member);
    };

    socket.on("memberAdded", handleMemberAdded);

    return () => {
      socket.off("memberAdded", handleMemberAdded);
    };
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);

      socket.emit("joinWorkspace", {
        workspaceId: selectedWorkspaceId,
      });
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on("connect", handleConnect);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.emit("leaveWorkspace", selectedWorkspaceId);
    };
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const handleTaskCreated = (data) => {
      console.log("Task created:", data.task);

      fetchDashboardStats();
      fetchMyTasks();
    };

    socket.on("taskCreated", handleTaskCreated);

    return () => {
      socket.off("taskCreated", handleTaskCreated);
    };
  }, [fetchDashboardStats, fetchMyTasks]);

  useEffect(() => {
    const handleTaskUpdated = (data) => {
      console.log("Task updated:", data.task);

      fetchDashboardStats();
      fetchMyTasks();
    };

    socket.on("taskUpdated", handleTaskUpdated);

    return () => {
      socket.off("taskUpdated", handleTaskUpdated);
    };
  }, [fetchDashboardStats, fetchMyTasks]);

  useEffect(() => {
    const handleTaskMoved = (data) => {
      console.log("Task moved:", data.task);

      fetchDashboardStats();
      fetchMyTasks();
    };

    socket.on("taskMoved", handleTaskMoved);

    return () => {
      socket.off("taskMoved", handleTaskMoved);
    };
  }, [fetchDashboardStats, fetchMyTasks]);

  useEffect(() => {
    const handleTaskDeleted = (data) => {
      console.log("Task deleted:", data);

      fetchDashboardStats();
      fetchMyTasks();
    };

    socket.on("taskDeleted", handleTaskDeleted);

    return () => {
      socket.off("taskDeleted", handleTaskDeleted);
    };
  }, [fetchDashboardStats, fetchMyTasks]);

  useEffect(() => {
    const handleMemberRoleUpdated = (data) => {
      console.log("Member role updated:", data.member);
    };

    socket.on("memberRoleUpdated", handleMemberRoleUpdated);

    return () => {
      socket.off("memberRoleUpdated", handleMemberRoleUpdated);
    };
  }, []);
  useEffect(() => {
    const handleMemberRemoved = (data) => {
      console.log("Member removed:", data);
    };

    socket.on("memberRemoved", handleMemberRemoved);

    return () => {
      socket.off("memberRemoved", handleMemberRemoved);
    };
  }, []);
  useEffect(() => {
    const handleWorkspaceUpdated = (data) => {
      console.log("Workspace updated:", data.workspace);
    };

    socket.on("workspaceUpdated", handleWorkspaceUpdated);

    return () => {
      socket.off("workspaceUpdated", handleWorkspaceUpdated);
    };
  }, []);

  useEffect(() => {
    const handleCommentCreated = (data) => {
      console.log("Comment created:", data.comment);
    };

    socket.on("commentCreated", handleCommentCreated);

    return () => {
      socket.off("commentCreated", handleCommentCreated);
    };
  }, []);
  useEffect(() => {
    const handleUserOffline = (data) => {
      console.log("User offline:", data.userId);
    };

    socket.on("userOffline", handleUserOffline);

    return () => {
      socket.off("userOffline", handleUserOffline);
    };
  }, []);

  useEffect(() => {
    const handleWorkspaceOnlineUsers = (data) => {
      console.log("Workspace online users:", data.userIds);
    };

    socket.on("workspaceOnlineUsers", handleWorkspaceOnlineUsers);

    return () => {
      socket.off("workspaceOnlineUsers", handleWorkspaceOnlineUsers);
    };
  }, []);
  useEffect(() => {
    const handleUserOnline = (data) => {
      console.log("User online:", data.userId);
    };

    socket.on("userOnline", handleUserOnline);

    return () => {
      socket.off("userOnline", handleUserOnline);
    };
  }, []);

  useEffect(() => {
    const handleTypingStart = (data) => {
      console.log("User typing:", data);
    };

    const handleTypingStop = (data) => {
      console.log("User stopped typing:", data);
    };

    socket.on("typingStart", handleTypingStart);
    socket.on("typingStop", handleTypingStop);

    return () => {
      socket.off("typingStart", handleTypingStart);
      socket.off("typingStop", handleTypingStop);
    };
  }, []);
  useEffect(() => {
    const handleMessageCreated = (data) => {
      console.log("Conversation ID:", data.conversationId);
      console.log("Message:", data.message);
    };
    socket.on("messageCreated", handleMessageCreated);

    return () => {
      socket.off("messageCreated", handleMessageCreated);
    };
  }, []);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/api/auth/me");

        console.log("User:", response.data);

        setUser(response.data.user);
      } catch (error) {
        console.error("Dashboard error:", error.message);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      return;
    }

    let cancelled = false;

    const loadDashboardStats = async () => {
      try {
        const response = await api.get(
          `/api/dashboard/workspace/${selectedWorkspaceId}/stats`,
        );

        if (!cancelled) {
          setDashboardStats(response.data.stats);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Dashboard stats error:",
            error.response?.data?.message || error.message,
          );
        }
      }
    };

    loadDashboardStats();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      return;
    }

    let cancelled = false;

    const fetchRecentProjects = async () => {
      setProjectsLoading(true);

      try {
        const response = await api.get(
          `/api/projects/workspace/${selectedWorkspaceId}`,
        );

        if (!cancelled) {
          setRecentProjects((response.data.projects || []).slice(0, 5));
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Recent projects error:",
            error.response?.data?.message || error.message,
          );
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    };

    fetchRecentProjects();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  const getTaskStatusStyle = (status) => {
    const styles = {
      todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      in_progress:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      review:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };

    return styles[status] || styles.todo;
  };

  const getTaskPriorityStyle = (priority) => {
    const styles = {
      high: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      medium:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };

    return (
      styles[priority?.toLowerCase()] ||
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    );
  };

  const isTaskOverdue = (task) => {
    return (
      task.dueDate &&
      new Date(task.dueDate) < new Date() &&
      task.status !== "done"
    );
  };

  const getProjectStatusStyle = (status) => {
    const styles = {
      active:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      completed:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      planning:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      on_hold:
        "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    };

    return (
      styles[status?.toLowerCase()] ||
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    );
  };

  return (
    <>
      <div className="min-w-0 w-full px-4 py-6 text-slate-900 transition-colors duration-200 dark:text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {user && (
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-6 shadow-sm transition-all duration-300 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 sm:p-8">
              {/* Decorative background accent */}
              <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-blue-200/30 blur-2xl dark:bg-indigo-500/10" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                    TeamFlow Workspace
                  </p>

                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    {greeting}, {user.firstName}!
                    <span className="ml-2 inline-block">👋</span>
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                    Here's what's happening with your workspace today.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="3" y="7" width="18" height="14" rx="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                      </span>

                      <span className="font-medium">
                        {selectedWorkspace?.name || "No workspace selected"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M16 3v4M8 3v4M3 11h18" />
                      </svg>

                      <span>
                        {new Date().toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decorative greeting icon */}
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-3xl shadow-sm dark:border-slate-700 dark:bg-slate-800/80 sm:flex">
                  {currentHour >= 5 && currentHour < 17 ? "☀️" : "🌙"}
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Overview of your workspace activity.
              </p>
            </div>

            <div className="w-full sm:max-w-xs">
              <label
                htmlFor="workspaceSelector"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Select workspace
              </label>

              <select
                id="workspaceSelector"
                value={selectedWorkspaceId}
                onChange={(event) => setSelectedWorkspaceId(event.target.value)}
                disabled={workspaceLoading || workspaces.length === 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900"
              >
                {workspaceLoading ? (
                  <option value="">Loading workspaces...</option>
                ) : workspaces.length === 0 ? (
                  <option value="">No workspaces available</option>
                ) : (
                  workspaces.map((workspace) => (
                    <option key={workspace._id} value={workspace._id}>
                      {workspace.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {!workspaceLoading && workspaces.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                No workspaces yet
              </h2>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Create a workspace to start managing projects and tasks with
                your team.
              </p>

              <button
                onClick={() => navigate("/workspaces")}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Go to Workspaces
              </button>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* Total Projects */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total Projects
                </p>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-transform duration-300 group-hover:scale-110 dark:bg-blue-950 dark:text-blue-400">
                  <FolderKanban size={21} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {statsLoading ? "..." : dashboardStats.totalProjects}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Projects in your workspace
              </p>
            </div>

            {/* Total Tasks */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total Tasks
                </p>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition-transform duration-300 group-hover:scale-110 dark:bg-violet-950 dark:text-violet-400">
                  <ListChecks size={21} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {statsLoading ? "..." : dashboardStats.totalTasks}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tasks across your projects
              </p>
            </div>

            {/* Completed Tasks */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Completed Tasks
                </p>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform duration-300 group-hover:scale-110 dark:bg-emerald-950 dark:text-emerald-400">
                  <CircleCheck size={21} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {statsLoading ? "..." : dashboardStats.completedTasks}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tasks successfully completed
              </p>
            </div>

            {/* In Progress */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  In Progress
                </p>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-transform duration-300 group-hover:scale-110 dark:bg-amber-950 dark:text-amber-400">
                  <Timer size={21} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {statsLoading ? "..." : dashboardStats.inProgressTasks}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tasks currently being worked on
              </p>
            </div>

            {/* Overdue Tasks */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Overdue Tasks
                </p>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600 transition-transform duration-300 group-hover:scale-110 dark:bg-rose-950 dark:text-rose-400">
                  <CircleAlert size={21} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {statsLoading ? "..." : dashboardStats.overdueTasks}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tasks that need attention
              </p>
            </div>

            {/* Task Completion Rate */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Task Completion Rate
                </p>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 transition-transform duration-300 group-hover:scale-110 dark:bg-cyan-950 dark:text-cyan-400">
                  <ChartNoAxesCombined size={21} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {statsLoading ? "..." : `${dashboardStats.taskCompletionRate}%`}
              </p>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                role="progressbar"
                aria-label="Task completion rate"
                aria-valuenow={dashboardStats.taskCompletionRate ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, dashboardStats.taskCompletionRate ?? 0))}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Overall workspace progress
              </p>
            </div>
          </div>

          {/* Task Analytics */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Task Status Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Task Status Breakdown
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Track how tasks are progressing across your workspace.
                </p>
              </div>

              {statsLoading ? (
                <div className="flex h-72 items-center justify-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Loading task analytics...
                  </p>
                </div>
              ) : dashboardStats.totalTasks === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <ListChecks size={28} />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-100">
                    No tasks yet
                  </h3>

                  <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                    Tasks will appear here once your workspace starts getting
                    work done.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskStatusData.filter(
                            (entry) => entry.value > 0,
                          )}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={94}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {taskStatusData
                            .filter((entry) => entry.value > 0)
                            .map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>

                        <Tooltip
                          formatter={(value, name) => [`${value} tasks`, name]}
                          contentStyle={{
                            backgroundColor: "var(--chart-tooltip-bg, #ffffff)",
                            border:
                              "1px solid var(--chart-tooltip-border, #e2e8f0)",
                            borderRadius: "12px",
                            color: "var(--chart-tooltip-text, #0f172a)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {dashboardStats.totalTasks}
                      </span>
                      <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Total tasks
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {taskStatusData.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {entry.name}
                          </p>
                          <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {entry.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Task Completion Progress */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Task Completion Progress
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Monitor completed work across your workspace.
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <ChartNoAxesCombined size={22} />
                </div>
              </div>

              {statsLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Loading progress...
                  </p>
                </div>
              ) : dashboardStats.totalTasks === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <ListChecks
                    size={32}
                    className="text-slate-400 dark:text-slate-500"
                  />
                  <p className="mt-3 font-medium text-slate-800 dark:text-slate-100">
                    No tasks to track yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Create tasks to start tracking progress.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Completed tasks
                      </p>
                      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {dashboardStats.completedTasks ?? 0}
                        <span className="ml-2 text-base font-medium text-slate-400">
                          / {dashboardStats.totalTasks}
                        </span>
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {Math.min(
                        100,
                        Math.max(0, dashboardStats.taskCompletionRate ?? 0),
                      )}
                      %
                    </span>
                  </div>

                  <div
                    className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                    role="progressbar"
                    aria-label="Task completion progress"
                    aria-valuenow={Math.min(
                      100,
                      Math.max(0, dashboardStats.taskCompletionRate ?? 0),
                    )}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, dashboardStats.taskCompletionRate ?? 0),
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>0%</span>
                    <span>100%</span>
                  </div>

                  <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <div className="flex items-center gap-2">
                        <CircleCheck
                          size={18}
                          className="text-emerald-600 dark:text-emerald-400"
                        />
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          Completed
                        </p>
                      </div>
                      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                        {dashboardStats.completedTasks ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                      <div className="flex items-center gap-2">
                        <Timer
                          size={18}
                          className="text-blue-600 dark:text-blue-400"
                        />
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                          In progress
                        </p>
                      </div>
                      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                        {dashboardStats.inProgressTasks ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                      <div className="flex items-center gap-2">
                        <CircleAlert
                          size={18}
                          className="text-rose-600 dark:text-rose-400"
                        />
                        <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
                          Overdue
                        </p>
                      </div>
                      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                        {dashboardStats.overdueTasks ?? 0}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Recent Projects
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Pick up where your team left off.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/projects")}
                className="self-start rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800 sm:self-auto"
              >
                View all projects →
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="mt-3 h-3 w-1/4 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  ))}
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <FolderKanban size={24} />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-100">
                    No projects yet
                  </h3>

                  <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Create a project to organize your team's tasks and
                    collaborate.
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/projects")}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Explore projects
                  </button>
                </div>
              ) : (
                recentProjects.map((project) => (
                  <button
                    key={project._id}
                    type="button"
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className="group w-full rounded-xl border border-slate-200 p-4 text-left transition-all duration-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:hover:border-blue-900 dark:hover:bg-slate-800/70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105 dark:bg-blue-950 dark:text-blue-400">
                        <FolderKanban size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {project.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Project key: {project.key || "Not set"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getProjectStatusStyle(project.status)}`}
                        >
                          {(project.status || "Unknown")
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (char) => char.toUpperCase())}
                        </span>

                        <span className="hidden text-slate-400 transition-transform group-hover:translate-x-1 sm:inline">
                          →
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                My Assigned Tasks
              </h2>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {myTasks.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {myTasksLoading ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Loading your tasks...
                </p>
              ) : myTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No tasks assigned to you in this workspace.
                </p>
              ) : (
                myTasks.map((task) => (
                  <button
                    key={task._id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/projects/${task.project._id}/boards/${task.board}/columns/${task.column}/tasks/${task._id}`,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {task.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Project: {task.project?.name || "Unknown project"}
                        </p>

                        {task.dueDate && (
                          <p
                            className={`mt-2 text-sm font-medium ${
                              isTaskOverdue(task)
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isTaskOverdue(task) ? "Overdue · " : "Due "}
                            {new Date(task.dueDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getTaskStatusStyle(task.status)}`}
                          >
                            {(task.status || "todo")
                              .replace("_", " ")
                              .replace(/\b\w/g, (char) => char.toUpperCase())}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getTaskPriorityStyle(task.priority)}`}
                          >
                            {task.priority || "No priority"}
                          </span>

                          {isTaskOverdue(task) && (
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
