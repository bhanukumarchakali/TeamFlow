import { useEffect, useState } from "react";
import api from "../../utils/api.js";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../context/useWorkspace.js";

const Workspaces = () => {
  const navigate = useNavigate();

  const { setSelectedWorkspaceId } = useWorkspace();

  const handleViewDashboard = (workspaceId) => {
    setSelectedWorkspaceId(workspaceId);
    navigate("/dashboard");
  };

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [workspaceRoles, setWorkspaceRoles] = useState({});

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await api.get("/api/workspaces");
        setWorkspaces(response.data.workspaces || []);
        const userWorkspaces = response.data.workspaces || [];

        const roleEntries = await Promise.all(
          userWorkspaces.map(async (workspace) => {
            try {
              const membershipResponse = await api.get(
                `/api/workspaces/${workspace._id}/membership`,
              );

              return [workspace._id, membershipResponse.data.role];
            } catch (error) {
              console.error(
                `Failed to fetch role for ${workspace.name}:`,
                error.response?.data?.message || error.message,
              );

              return [workspace._id, null];
            }
          }),
        );

        setWorkspaceRoles(Object.fromEntries(roleEntries));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load workspaces.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await api.post("/api/workspaces", formData);

      if (response.data.success) {
        setFormData({ name: "", description: "" });
        setShowCreateForm(false);

        const refreshed = await api.get("/api/workspaces");

        setWorkspaces(refreshed.data.workspaces || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create workspace.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-10 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Workspaces
            </h1>
            {showCreateForm && (
              <form
                onSubmit={handleCreateWorkspace}
                className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/30"
              >
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Create a workspace
                </h2>

                <div>
                  <label
                    htmlFor="workspaceName"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Workspace name
                  </label>

                  <input
                    id="workspaceName"
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData({ ...formData, name: event.target.value })
                    }
                    placeholder="e.g. My Team"
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="workspaceDescription"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Description
                  </label>

                  <textarea
                    id="workspaceDescription"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        description: event.target.value,
                      })
                    }
                    placeholder="What is this workspace for?"
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create Workspace
                </button>
              </form>
            )}
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage the spaces where your team collaborates.
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to Dashboard
          </button>

          <button
            onClick={() => setShowCreateForm((previous) => !previous)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showCreateForm ? "Cancel" : "+ Create Workspace"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-slate-500 dark:text-slate-400">
            Loading workspaces...
          </p>
        ) : workspaces.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              No workspaces yet
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Create your first workspace to start collaborating.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <div
                key={workspace._id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/30"
              >
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {workspace.name}
                </h2>

                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Role: {workspaceRoles[workspace._id] || "Loading role..."}
                </p>

                <p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-slate-400">
                  {workspace.description || "No description provided."}
                </p>

                {workspaceRoles[workspace._id] === "owner" && (
                  <button
                    onClick={() =>
                      navigate(`/workspaces/${workspace._id}/settings`)
                    }
                    className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Workspace Settings
                  </button>
                )}

                <button
                  onClick={() => handleViewDashboard(workspace._id)}
                  className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View Dashboard
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workspaces;
