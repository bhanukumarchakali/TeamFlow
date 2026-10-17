import api from "../../utils/api";
import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

const Project = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState([]);

  const [workspaceRole, setWorkspaceRole] = useState(null);

  const canManageBoards =
    workspaceRole === "owner" || workspaceRole === "admin";
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);

  const workspaceId = "6ab4ea6e026ce3098139b25d";

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await api.get(
          `/api/projects/workspace/${workspaceId}/${projectId}`,
        );

        console.log("Project:", response.data);

        setProject(response.data.project);
      } catch (error) {
        console.error(
          "Failed to fetch project:",
          error.response?.data || error.message,
        );
      } finally {
        setLoading(false);
      }
    };
    const fetchBoards = async () => {
      try {
        const response = await api.get(
          `/api/boards/workspace/${workspaceId}/${projectId}`,
        );

        console.log("Boards:", response.data);

        setBoards(response.data.boards || []);
      } catch (error) {
        console.error(
          "Failed to fetch boards:",
          error.response?.data || error.message,
        );
      }
    };
    const fetchWorkspaceRole = async () => {
      try {
        const response = await api.get(
          `/api/workspaces/${workspaceId}/membership`,
        );

        console.log("Workspace role:", response.data);

        setWorkspaceRole(response.data.role);
      } catch (error) {
        console.error(
          "Failed to fetch workspace role:",
          error.response?.data || error.message,
        );
      }
    };

    fetchProject();
    fetchBoards();
    fetchWorkspaceRole();
  }, [projectId]);

  const handleCreateBoard = async (event) => {
    event.preventDefault();

    if (!boardName.trim()) {
      return;
    }

    try {
      setCreatingBoard(true);

      if (editingBoard) {
        const response = await api.patch(
          `/api/boards/workspace/${workspaceId}/${projectId}/${editingBoard._id}`,
          {
            name: boardName.trim(),
            description: boardDescription.trim(),
          },

        );

        console.log("Updated board:", response.data);

        const updatedBoard = response.data.board;

        setBoards((previousBoards) =>
          previousBoards.map((board) =>
            board._id === updatedBoard._id ? updatedBoard : board,
          ),
        );
      } else {
        const response = await api.post(
          `/api/boards/workspace/${workspaceId}/${projectId}`,
          {
            name: boardName.trim(),
            description: boardDescription.trim(),
          },

        );

        console.log("Created board:", response.data);

        const createdBoard = response.data.board;

        setBoards((previousBoards) => [createdBoard, ...previousBoards]);
      }

      setBoardName("");
      setBoardDescription("");
      setEditingBoard(null);
      setShowBoardForm(false);
    } catch (error) {
      console.error(
        editingBoard ? "Failed to update board:" : "Failed to create board:",
        error.response?.data || error.message,
      );
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleDeleteBoard = async (boardId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this board?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.delete(
        `/api/boards/workspace/${workspaceId}/${projectId}/${boardId}`,
      );

      console.log("Deleted board:", response.data);

      setBoards((previousBoards) =>
        previousBoards.filter((board) => board._id !== boardId),
      );

      if (editingBoard?._id === boardId) {
        setEditingBoard(null);
        setBoardName("");
        setBoardDescription("");
        setShowBoardForm(false);
      }
    } catch (error) {
      console.error(
        "Failed to delete board:",
        error.response?.data || error.message,
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        Loading project...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        Project not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {project.name}
        </h1>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {project.description || "No description"}
        </p>

        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          Project Key: {project.key}
        </p>
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Boards
            </h2>
            {canManageBoards && (
              <button
                type="button"
                onClick={() => {
                  if (showBoardForm) {
                    setShowBoardForm(false);
                    setEditingBoard(null);
                    setBoardName("");
                    setBoardDescription("");
                  } else {
                    setEditingBoard(null);
                    setBoardName("");
                    setBoardDescription("");
                    setShowBoardForm(true);
                  }
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {showBoardForm ? "Cancel" : "Create Board"}
              </button>
            )}
          </div>
          {showBoardForm && canManageBoards && (
            <form
              onSubmit={handleCreateBoard}
              className="mt-6 rounded-2xl bg-white p-6 shadow dark:bg-slate-900 dark:shadow-slate-950/30"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingBoard ? "Edit board" : "Create a new board"}
              </h3>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Board Name
                </label>

                <input
                  type="text"
                  value={boardName}
                  onChange={(event) => setBoardName(event.target.value)}
                  placeholder="e.g. Sprint Planning"
                  maxLength={100}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>

                <textarea
                  value={boardDescription}
                  onChange={(event) => setBoardDescription(event.target.value)}
                  placeholder="Describe the purpose of this board"
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={creatingBoard || !boardName.trim()}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingBoard
                  ? editingBoard
                    ? "Saving..."
                    : "Creating..."
                  : editingBoard
                    ? "Save Changes"
                    : "Create Board"}
              </button>
            </form>
          )}

          {boards.length === 0 ? (
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              No boards found.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <div
                  key={board._id}
                  onClick={() => {
                    console.log("Clicked board:", board);
                    console.log("Clicked board ID:", board._id);

                    navigate(`/projects/${projectId}/boards/${board._id}`);
                  }}
                  className="cursor-pointer rounded-2xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900 dark:shadow-slate-950/30"
                >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {board.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {board.description || "No description"}
                  </p>
                  {canManageBoards && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingBoard(board);
                          setBoardName(board.name);
                          setBoardDescription(board.description || "");
                          setShowBoardForm(true);
                        }}
                        className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteBoard(board._id);
                        }}
                        className="mt-4 ml-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Project;
