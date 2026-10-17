import api from "../../utils/api";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

const Board = () => {
  const navigate = useNavigate();
  const { projectId, boardId } = useParams();
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState({});
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskStatus, setTaskStatus] = useState("todo");
  const [creatingTask, setCreatingTask] = useState(false);

  const [showColumnForm, setShowColumnForm] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  const [workspaceRole, setWorkspaceRole] = useState(null);

  const canManageColumns =
    workspaceRole === "owner" || workspaceRole === "admin";
  const workspaceId = "6ab4ea6e026ce3098139b25d";

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        console.log("Project ID:", projectId);
        console.log("Board ID from URL:", boardId);

        const response = await api.get(
          `/api/boards/workspace/${workspaceId}/${projectId}/${boardId}`,
        );

        console.log("Fetched board response:", response.data);
        setBoard(response.data.board);
      } catch (error) {
        console.error(
          "Failed to fetch board:",
          error.response?.data || error.message,
        );
      } finally {
        setLoading(false);
      }
    };
    const fetchColumns = async () => {
      try {


        const response = await api.get(
          `/api/columns/workspace/${workspaceId}/${projectId}/${boardId}`,
        );

        console.log("Columns:", response.data);
        const fetchedColumns = response.data.columns || [];

        setColumns(response.data.columns || []);
        fetchedColumns.forEach((column) => {
          fetchColumnTasks(column._id);
        });
      } catch (error) {
        console.error(
          "Failed to fetch columns:",
          error.response?.data || error.message,
        );
      }
    };
    const fetchWorkspaceRole = async () => {
      try {
        const response = await api.get(
          `/api/workspaces/${workspaceId}/membership`,
        );

        setWorkspaceRole(response.data.role);
      } catch (error) {
        console.error(
          "Failed to fetch workspace role:",
          error.response?.data || error.message,
        );
      }
    };
    const fetchColumnTasks = async (columnId) => {
      try {
        const response = await api.get(
          `/api/tasks/workspace/${workspaceId}/${projectId}/${boardId}/${columnId}`,
        );

        console.log(`Tasks for column ${columnId}:`, response.data);

        setTasks((previousTasks) => ({
          ...previousTasks,
          [columnId]: response.data.tasks || [],
        }));
      } catch (error) {
        console.error(
          `Failed to fetch tasks for column ${columnId}:`,
          error.response?.data || error.message,
        );
      }
    };

    fetchBoard();
    fetchColumns();
    fetchWorkspaceRole();
  }, [projectId, boardId]);

  const handleCreateColumn = async (event) => {
    event.preventDefault();

    if (!columnName.trim()) return;

    try {
      setCreatingColumn(true);

      if (editingColumn) {
        // Rename an existing column
        const response = await api.patch(
          `/api/columns/workspace/${workspaceId}/${projectId}/${boardId}/${editingColumn._id}`,
          { name: columnName.trim() },
        );

        const updatedColumn = response.data.column;

        setColumns((previousColumns) =>
          previousColumns.map((column) =>
            column._id === updatedColumn._id ? updatedColumn : column,
          ),
        );
      } else {
        // Create a new column
        const response = await api.post(
          `/api/columns/workspace/${workspaceId}/${projectId}/${boardId}`,
          {
            name: columnName.trim(),
            position: columns.length,
          },
        );

        const createdColumn = response.data.column;

        setColumns((previousColumns) =>
          [...previousColumns, createdColumn].sort(
            (a, b) => a.position - b.position,
          ),
        );

        setTasks((previousTasks) => ({
          ...previousTasks,
          [createdColumn._id]: [],
        }));
      }

      setColumnName("");
      setEditingColumn(null);
      setShowColumnForm(false);
    } catch (error) {
      console.error(
        editingColumn ? "Failed to rename column:" : "Failed to create column:",
        error.response?.data || error.message,
      );
    } finally {
      setCreatingColumn(false);
    }
  };
  const handleDeleteColumn = async (columnId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this column?",
    );

    if (!confirmed) return;

    try {
      const response = await api.delete(
        `/api/columns/workspace/${workspaceId}/${projectId}/${boardId}/${columnId}`,
      );

      console.log("Deleted column:", response.data);

      setColumns((previousColumns) =>
        previousColumns.filter((column) => column._id !== columnId),
      );

      setTasks((previousTasks) => {
        const updatedTasks = { ...previousTasks };
        delete updatedTasks[columnId];
        return updatedTasks;
      });

      if (editingColumn?._id === columnId) {
        setEditingColumn(null);
        setColumnName("");
        setShowColumnForm(false);
      }
    } catch (error) {
      console.error(
        "Failed to delete column:",
        error.response?.data || error.message,
      );
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!taskTitle.trim() || !selectedColumnId) {
      toast.error("Task title is required");
      return;
    }

    setCreatingTask(true);

    try {
      const response = await api.post(
        `/api/tasks/workspace/${workspaceId}/${projectId}/${boardId}/${selectedColumnId}`,
        {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          priority: taskPriority,
          status: taskStatus,
          position: (tasks[selectedColumnId] || []).length,
        },
      );

      const newTask = response.data.task;

      setTasks((previousTasks) => ({
        ...previousTasks,
        [selectedColumnId]: [
          ...(previousTasks[selectedColumnId] || []),
          newTask,
        ],
      }));

      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskStatus("todo");
      setSelectedColumnId(null);
      setShowTaskForm(false);
    } catch (error) {
      console.error(
        "Failed to create task:",
        error.response?.data || error.message,
      );

      toast.error(error.response?.data?.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId, columnId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?",
    );

    if (!confirmed) return;

    try {
      const response = await api.delete(
        `/api/tasks/workspace/${workspaceId}/${projectId}/${boardId}/${columnId}/${taskId}`,
      );

      if (response.data.success) {
        setTasks((previousTasks) => ({
          ...previousTasks,
          [columnId]: (previousTasks[columnId] || []).filter(
            (task) => task._id !== taskId,
          ),
        }));

        toast.success("Task deleted successfully.");
      }
    } catch (error) {
      console.error(
        "Failed to delete task:",
        error.response?.data || error.message,
      );

      toast.error(error.response?.data?.message || "Failed to delete task.");
    }
  };

  const handleDragStart = (event, task, sourceColumnId) => {
    if (!canManageColumns) {
      event.preventDefault();
      return;
    }

    setDraggedTask({
      task,
      sourceColumnId,
    });

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task._id);
  };

  const handleDragOver = (event, columnId) => {
    event.preventDefault();

    if (!canManageColumns || !draggedTask) return;

    event.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (event, columnId) => {
    // Ignore movement between children inside the same column.
    if (event.currentTarget.contains(event.relatedTarget)) return;

    setDragOverColumn((current) => (current === columnId ? null : current));
  };

  const handleDrop = async (event, destinationColumnId) => {
    event.preventDefault();
    setDragOverColumn(null);

    if (!canManageColumns || !draggedTask) return;

    const { task, sourceColumnId } = draggedTask;

    if (sourceColumnId === destinationColumnId) {
      setDraggedTask(null);
      return;
    }

    try {
      const destinationTasks = tasks[destinationColumnId] || [];
      const response = await api.patch(
        `/api/tasks/workspace/${workspaceId}/${projectId}/${boardId}/${sourceColumnId}/${task._id}/move`,
        {
          columnId: destinationColumnId,
          position: destinationTasks.length,
          status: task.status,
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to move task");
      }

      // Use the updated task returned by the API when available.
      const movedTask = response.data.task || {
        ...task,
        column: destinationColumnId,
        position: destinationTasks.length,
      };

      setTasks((previousTasks) => ({
        ...previousTasks,
        [sourceColumnId]: (previousTasks[sourceColumnId] || []).filter(
          (item) => item._id !== task._id,
        ),
        [destinationColumnId]: [
          ...(previousTasks[destinationColumnId] || []),
          movedTask,
        ],
      }));
    } catch (error) {
      console.error(
        "Failed to move task:",
        error.response?.data || error.message,
      );

      toast.error(error.response?.data?.message || "Failed to move task.");
    } finally {
      setDraggedTask(null);
      setDragOverColumn(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        Loading board...
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        Board not found.
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {board.name}
        </h1>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {board.description || "No description"}
        </p>
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Columns
            </h2>

            {canManageColumns && (
              <button
                type="button"
                onClick={() => setShowColumnForm((previous) => !previous)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                {showColumnForm
                  ? "Cancel"
                  : editingColumn
                    ? "Rename Column"
                    : "+ Create Column"}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label
                htmlFor="statusFilter"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Filter by status
              </label>

              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All statuses</option>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="priorityFilter"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Filter by priority
              </label>

              <select
                id="priorityFilter"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="mt-2 block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
              className="mt-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Clear filters
            </button>
          </div>

          {showColumnForm && canManageColumns && (
            <form
              onSubmit={handleCreateColumn}
              className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingColumn ? "Rename Column" : "Create Column"}
              </h3>
              <div className="flex-1">
                <label
                  htmlFor="columnName"
                  className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Column name
                </label>

                <input
                  id="columnName"
                  type="text"
                  value={columnName}
                  onChange={(event) => setColumnName(event.target.value)}
                  placeholder="e.g. To Do"
                  maxLength={100}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={creatingColumn || !columnName.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingColumn
                  ? editingColumn
                    ? "Saving..."
                    : "Creating..."
                  : editingColumn
                    ? "Save Changes"
                    : "Create Column"}
              </button>
            </form>
          )}

          {columns.length === 0 ? (
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              No columns found.
            </p>
          ) : (
            <div className="mt-6 flex gap-6 overflow-x-auto pb-6">
              {columns.map((column) => (
                <div
                  key={column._id}
                  onDragOver={(event) => handleDragOver(event, column._id)}
                  onDragLeave={(event) => handleDragLeave(event, column._id)}
                  onDrop={(event) => handleDrop(event, column._id)}
                  className={`w-80 min-w-80 rounded-2xl p-4 shadow-sm transition-colors ${
                    dragOverColumn === column._id
                      ? "bg-blue-100 ring-2 ring-blue-400 dark:bg-blue-950/60 dark:ring-blue-500"
                      : "bg-slate-100 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">
                      {column.name}
                    </h3>

                    {canManageColumns && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColumn(column);
                            setColumnName(column.name);
                            setShowColumnForm(true);
                          }}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Rename
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(column._id)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {canManageColumns && (
                    <button
                      onClick={() => {
                        setSelectedColumnId(column._id);
                        setShowTaskForm(true);
                      }}
                      className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                    >
                      + Create Task
                    </button>
                  )}

                  {showTaskForm && selectedColumnId === column._id && (
                    <form
                      onSubmit={handleCreateTask}
                      className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                        Create New Task
                      </h4>

                      <input
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Task title"
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />

                      <textarea
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Task description (optional)"
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Priority
                        </label>
                        <select
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Status
                        </label>
                        <select
                          value={taskStatus}
                          onChange={(e) => setTaskStatus(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={creatingTask}
                          className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {creatingTask ? "Creating..." : "Create Task"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowTaskForm(false);
                            setSelectedColumnId(null);
                            setTaskTitle("");
                            setTaskDescription("");
                          }}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="mt-4 min-h-24 space-y-3">
                    {(tasks[column._id] || [])
                      .filter((task) => {
                        const matchesStatus =
                          statusFilter === "all" ||
                          task.status === statusFilter;

                        const matchesPriority =
                          priorityFilter === "all" ||
                          task.priority === priorityFilter;

                        return matchesStatus && matchesPriority;
                      })
                      .map((task) => (
                        <div
                          key={task._id}
                          draggable={canManageColumns}
                          onDragStart={(event) =>
                            handleDragStart(event, task, column._id)
                          }
                          onDragEnd={() => {
                            setDraggedTask(null);
                            setDragOverColumn(null);
                          }}
                          onClick={() =>
                            navigate(
                              `/projects/${projectId}/boards/${boardId}/columns/${column._id}/tasks/${task._id}`,
                            )
                          }
                          className={`cursor-pointer rounded-xl bg-white p-4 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 dark:text-slate-100 ${
                            draggedTask?.task._id === task._id
                              ? "opacity-40"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {task.title}
                            </h4>

                            {canManageColumns && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteTask(task._id, column._id);
                                }}
                                className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                Delete
                              </button>
                            )}
                          </div>

                          {task.description && (
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {task.description}
                            </p>
                          )}
                        </div>
                      ))}

                    {(tasks[column._id] || []).filter((task) => {
                      const matchesStatus =
                        statusFilter === "all" || task.status === statusFilter;

                      const matchesPriority =
                        priorityFilter === "all" ||
                        task.priority === priorityFilter;

                      return matchesStatus && matchesPriority;
                    }).length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {statusFilter === "all"
                          ? "No tasks"
                          : "No tasks with this status"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Board;
