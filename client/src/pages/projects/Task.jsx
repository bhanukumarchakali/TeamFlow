import api from "../../utils/api.js";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "../../utils/socket.js";

const Task = () => {
  const { projectId, boardId, columnId, taskId } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [workspaceRole, setWorkspaceRole] = useState(null);

  const canManageTasks = workspaceRole === "owner" || workspaceRole === "admin";

  const [task, setTask] = useState(null);

  const [projectMembers, setProjectMembers] = useState([]);

  const workspaceId = "6ab4ea6e026ce3098139b25d";

  const deleteComment = async (commentId) => {
    try {
      await api.delete(
        `/api/comments/workspace/${workspaceId}/${projectId}/${boardId}/${taskId}/${commentId}`,
      );

      setComments((previousComments) =>
        previousComments.filter((comment) => comment._id !== commentId),
      );
    } catch (error) {
      console.error(
        "Failed to delete comment:",
        error.response?.data || error.message,
      );
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) {
      return;
    }

    try {
      setCommentLoading(true);

      await api.post(
        `/api/comments/workspace/${workspaceId}/${projectId}/${boardId}/${taskId}`,
        {
          content: commentText,
        },
      );

      setCommentText("");
    } catch (error) {
      console.error(
        "Failed to create comment:",
        error.response?.data || error.message,
      );
    } finally {
      setCommentLoading(false);
    }
  };

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await api.get(
          `/api/comments/workspace/${workspaceId}/${projectId}/${boardId}/${taskId}`,
        );

        console.log("Task comments:", response.data);

        setComments(response.data.comments || []);
      } catch (error) {
        console.error(
          "Failed to fetch task comments:",
          error.response?.data || error.message,
        );
      }
    };
    const fetchTask = async () => {
      try {
        const response = await api.get(
          `/api/tasks/workspace/${workspaceId}/${projectId}/${boardId}/${columnId}/${taskId}`,
        );

        console.log("Task:", response.data);
        console.log("Task object:", response.data.task);
        console.log("Task status:", response.data.task.status);
        console.log("Task column:", response.data.task.column);

        setTask(response.data.task);
        setTitle(response.data.task.title);
        setDescription(response.data.task.description || "");
      } catch (error) {
        console.error(
          "Failed to fetch task:",
          error.response?.data || error.message,
        );
      }
    };
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get("/api/auth/me");

        setCurrentUser(response.data.user);
      } catch (error) {
        console.error(
          "Failed to fetch current user:",
          error.response?.data || error.message,
        );
      }
    };
    const fetchActivities = async () => {
      try {
        const response = await api.get(
          `/api/activities/workspace/${workspaceId}/${projectId}/task/${taskId}`,
        );

        console.log("Task activities:", response.data);

        setActivities(response.data.activities || []);
      } catch (error) {
        console.error(
          "Failed to fetch task activities:",
          error.response?.data || error.message,
        );
      }
    };
    const fetchProjectMembers = async () => {
      try {
        const response = await api.get(
          `/api/project-members/workspace/${workspaceId}/${projectId}/getmembers`,
        );

        console.log("Project members:", response.data);

        setProjectMembers(response.data.projectMembers || []);
      } catch (error) {
        console.error(
          "Failed to fetch project members:",
          error.response?.data || error.message,
        );
      }
    };
    const fetchWorkspaceRole = async () => {
      try {
        const response = await api.get(`/api/workspaces/${workspaceId}`);

        setWorkspaceRole(response.data.role);
      } catch (error) {
        console.error(
          "Failed to fetch workspace role:",
          error.response?.data || error.message,
        );
      }
    };
    const handleCommentCreated = ({ comment }) => {
      console.log("COMMENT SOCKET RECEIVED:", comment);

      if (String(comment.task?._id || comment.task) !== String(taskId)) {
        return;
      }

      setComments((previousComments) => {
        const alreadyExists = previousComments.some(
          (existingComment) => existingComment._id === comment._id,
        );

        if (alreadyExists) {
          return previousComments;
        }

        return [...previousComments, comment];
      });
    };
    console.log("Registering commentCreated listener");

    socket.on("commentCreated", handleCommentCreated);
    const handleCommentDeleted = ({ commentId, taskId: deletedTaskId }) => {
      if (String(deletedTaskId) !== String(taskId)) {
        return;
      }

      setComments((previousComments) =>
        previousComments.filter((comment) => comment._id !== commentId),
      );
    };

    socket.on("commentDeleted", handleCommentDeleted);

    const handleActivityCreated = ({ activity }) => {
      if (String(activity.task?._id || activity.task) !== String(taskId)) {
        return;
      }

      setActivities((previousActivities) => {
        const alreadyExists = previousActivities.some(
          (existingActivity) => existingActivity._id === activity._id,
        );

        if (alreadyExists) {
          return previousActivities;
        }

        return [activity, ...previousActivities];
      });
    };

    socket.on("activityCreated", handleActivityCreated);

    fetchTask();
    fetchProjectMembers();
    fetchComments();
    fetchCurrentUser();
    fetchActivities();
    fetchWorkspaceRole();

    return () => {
      socket.off("commentCreated", handleCommentCreated);
      socket.off("commentDeleted", handleCommentDeleted);
      socket.off("activityCreated", handleActivityCreated);
    };
  }, [projectId, boardId, columnId, taskId]);
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const joinWorkspace = () => {
      socket.emit("joinWorkspace", {
        workspaceId,
        userId: currentUser.id,
      });

      console.log("Joined workspace from Task:", workspaceId);
    };

    if (socket.connected) {
      joinWorkspace();
    }

    socket.on("connect", joinWorkspace);

    return () => {
      socket.off("connect", joinWorkspace);
    };
  }, [currentUser, workspaceId]);

  const handleUpdateTask = async () => {
    try {
      const response = await api.patch(
        `/api/tasks/workspace/${workspaceId}/${projectId}/${boardId}/${columnId}/${taskId}`,
        {
          title,
          description,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assignedTo?._id || null,
          dueDate: task.dueDate || null,
        },
      );

      console.log("Updated task:", response.data);

      setTask(response.data.task);
      setEditing(false);
    } catch (error) {
      console.error(
        "Failed to update task:",
        error.response?.data || error.message,
      );
    }
  };

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        Task not found.
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900 dark:shadow-slate-950/30">
          <div className="flex items-start justify-between gap-4">
            {editing ? (
              <div className="w-full">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-2xl font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                  placeholder="Task description"
                />
                <select
                  value={task.priority || "medium"}
                  onChange={(e) =>
                    setTask((previousTask) => ({
                      ...previousTask,
                      priority: e.target.value,
                    }))
                  }
                  className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select
                  value={task.status || "todo"}
                  onChange={(e) =>
                    setTask((previousTask) => ({
                      ...previousTask,
                      status: e.target.value,
                    }))
                  }
                  className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>

                <select
                  value={task.assignedTo?._id || ""}
                  onChange={(e) =>
                    setTask((previousTask) => ({
                      ...previousTask,
                      assignedTo: e.target.value
                        ? projectMembers.find(
                            (projectMember) =>
                              projectMember.user._id === e.target.value,
                          )?.user || null
                        : null,
                    }))
                  }
                  className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Unassigned</option>

                  {projectMembers.map((projectMember) => (
                    <option
                      key={projectMember.user._id}
                      value={projectMember.user._id}
                    >
                      {projectMember.user.firstName}{" "}
                      {projectMember.user.lastName}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={
                    task.dueDate
                      ? new Date(task.dueDate).toISOString().split("T")[0]
                      : "No due date"
                  }
                  onChange={(e) =>
                    setTask((previousTask) => ({
                      ...previousTask,
                      dueDate: e.target.value || null,
                    }))
                  }
                  className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleUpdateTask}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Save
                  </button>

                  <button
                    onClick={() => {
                      setTitle(task.title);
                      setDescription(task.description || "");
                      setEditing(false);
                    }}
                    className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {task.title}
                  </h1>

                  {canManageTasks && (
                    <button
                      onClick={() => setEditing(true)}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  {task.description || "No description"}
                </p>
              </div>
            )}

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {task.status}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Priority
              </p>

              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {task.priority || "Not set"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Assigned To
              </p>

              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {task.assignedTo
                  ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                  : "Unassigned"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Created By
              </p>

              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {task.createdBy
                  ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
                  : "Unknown"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Due Date
              </p>

              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("en-GB")
                  : ""}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Created
              </p>

              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {new Date(task.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Updated
              </p>

              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {new Date(task.updatedAt).toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-slate-100">
            Comments
          </h2>

          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No comments yet.
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment._id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {comment.user?.firstName} {comment.user?.lastName}
                      </p>

                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {new Date(comment.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                    {comment.content}
                  </p>
                  {currentUser?.id === comment.user?._id && (
                    <button
                      onClick={() => deleteComment(comment._id)}
                      className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-6">
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Write a comment..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />

            <button
              onClick={addComment}
              disabled={commentLoading || !commentText.trim()}
              className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {commentLoading ? "Posting..." : "Add Comment"}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-slate-100">
          Activity
        </h2>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No activity yet.
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity._id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {activity.user?.firstName} {activity.user?.lastName}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {new Date(activity.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>

                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {activity.action === "task_created" && "created this task"}
                  {activity.action === "task_updated" && "updated this task"}
                  {activity.action === "task_assigned" && "assigned this task"}
                  {activity.action === "task_moved" && "moved this task"}
                  {activity.action === "task_deleted" && "deleted this task"}
                  {activity.action === "comment_created" && "added a comment"}
                  {activity.action === "comment_deleted" && "deleted a comment"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Task;
