import api from "../../utils/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspaceRole, setWorkspaceRole] = useState(null);

  const canManageProjects =
    workspaceRole === "owner" || workspaceRole === "admin";
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const workspaceId = "6ab4ea6e026ce3098139b25d";

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!projectName.trim() || !projectKey.trim()) {
      return;
    }

    try {
      setCreatingProject(true);

      if (editingProject) {
        const response = await api.patch(
          `/api/projects/workspace/${workspaceId}/${editingProject._id}`,
          {
            name: projectName.trim(),
            key: projectKey.trim(),
            description: projectDescription.trim(),
          },
        );

        console.log("Updated project:", response.data);

        const updatedProject = response.data.project;

        setProjects((previousProjects) =>
          previousProjects.map((project) =>
            project._id === updatedProject._id ? updatedProject : project,
          ),
        );
      } else {
        const response = await api.post(
          `/api/projects/workspace/${workspaceId}`,
          {
            name: projectName.trim(),
            key: projectKey.trim(),
            description: projectDescription.trim(),
          },
        );

        console.log("Created project:", response.data);

        const createdProject = response.data.project;

        setProjects((previousProjects) => [
          createdProject,
          ...previousProjects,
        ]);
      }

      setProjectName("");
      setProjectKey("");
      setProjectDescription("");
      setEditingProject(null);
      setShowCreateForm(false);
    } catch (error) {
      console.error(
        editingProject
          ? "Failed to update project:"
          : "Failed to create project:",
        error.response?.data || error.message,
      );
    } finally {
      setCreatingProject(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingProjectId(projectId);

      const response = await api.delete(
        `/api/projects/workspace/${workspaceId}/${projectId}`,

      );

      console.log("Deleted project:", response.data);

      setProjects((previousProjects) =>
        previousProjects.filter((project) => project._id !== projectId),
      );
    } catch (error) {
      console.error(
        "Failed to delete project:",
        error.response?.data || error.message,
      );
    } finally {
      setDeletingProjectId(null);
    }
  };

  useEffect(() => {
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
    const fetchProjects = async () => {
      try {
        const response = await api.get(
          `/api/projects/workspace/${workspaceId}`,
        );

        console.log("Projects:", response.data);

        setProjects(response.data.projects || []);
      } catch (error) {
        console.error(
          "Failed to fetch projects:",
          error.response?.data || error.message,
        );
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaceRole();
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Projects
          </h1>

          {canManageProjects && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create Project
            </button>
          )}
        </div>

        {showCreateForm && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow dark:bg-slate-900 dark:shadow-slate-950/30">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {editingProject ? "Edit Project" : "Create Project"}
            </h2>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="projectName"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Project name
                </label>

                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Enter project name"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <div>
                <label
                  htmlFor="projectKey"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Project key
                </label>

                <input
                  id="projectKey"
                  type="text"
                  value={projectKey}
                  onChange={(event) =>
                    setProjectKey(event.target.value.toUpperCase())
                  }
                  placeholder="e.g. TFL"
                  maxLength={10}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="projectDescription"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Description
                </label>

                <textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(event) =>
                    setProjectDescription(event.target.value)
                  }
                  placeholder="Enter project description"
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={creatingProject}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingProject
                  ? editingProject
                    ? "Updating..."
                    : "Creating..."
                  : editingProject
                    ? "Update Project"
                    : "Create Project"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setProjectName("");
                  setProjectKey("");
                  setProjectDescription("");
                  setEditingProject(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {projects.length === 0 ? (
          <p className="mt-6 text-slate-600 dark:text-slate-400">
            No projects found.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/projects/${project._id}`)}
                className="cursor-pointer rounded-2xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900 dark:shadow-slate-950/30 dark:hover:bg-slate-800"
              >
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {project.name}
                </h2>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {project.description || "No description"}
                </p>
                {canManageProjects && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();

                        setEditingProject(project);
                        setProjectName(project.name);
                        setProjectKey(project.key || "");
                        setProjectDescription(project.description || "");
                        setShowCreateForm(true);
                      }}
                      className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteProject(project._id);
                      }}
                      disabled={deletingProjectId === project._id}
                      className="ml-2 mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      {deletingProjectId === project._id
                        ? "Deleting..."
                        : "Delete"}
                    </button>{" "}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
