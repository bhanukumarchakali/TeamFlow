import { useCallback, useEffect, useState } from "react";
import api from "../../utils/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [addingMember, setAddingMember] = useState(false);
  const [removingUserId, setRemovingUserId] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberMessage, setMemberMessage] = useState("");

  const isOwner = role === "owner";
  const canManageMembers = isOwner || role === "admin";

  const fetchMembers = useCallback(async () => {
    try {
      const response = await api.get(`/api/workspaces/${workspaceId}/members`);

      setMembers(response.data.Members || []);
      setMemberError("");
    } catch (err) {
      setMemberError(
        err.response?.data?.message || "Failed to load workspace members.",
      );
    } finally {
      setMembersLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      try {
        const response = await api.get(
          `/api/workspaces/${workspaceId}/members`,
        );

        if (!cancelled) {
          setMembers(response.data.Members || []);
          setMemberError("");
        }
      } catch (err) {
        if (!cancelled) {
          setMemberError(
            err.response?.data?.message || "Failed to load workspace members.",
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const [workspaceResponse, membershipResponse] = await Promise.all([
          api.get(`/api/workspaces/${workspaceId}`),
          api.get(`/api/workspaces/${workspaceId}/membership`),
        ]);

        setRole(membershipResponse.data.role);

        const workspace = workspaceResponse.data.Workspace;

        setFormData({
          name: workspace.name || "",
          description: workspace.description || "",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load workspace.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);


  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await api.patch(
        `/api/workspaces/${workspaceId}`,
        formData,
      );

      setMessage(response.data.message || "Workspace updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update workspace.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setMemberError("");
    setMemberMessage("");
    setAddingMember(true);

    try {
      const response = await api.post(
        `/api/workspaces/${workspaceId}/members`,
        {
          email: memberEmail.trim(),
          role: memberRole,
        },
      );

      setMemberMessage(response.data.message || "Member added successfully.");
      setMemberEmail("");
      setMemberRole("member");
      await fetchMembers();
    } catch (err) {
      setMemberError(err.response?.data?.message || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId, name) => {
    const confirmed = window.confirm(`Remove ${name} from this workspace?`);

    if (!confirmed) return;

    setMemberError("");
    setMemberMessage("");
    setRemovingUserId(userId);

    try {
      const response = await api.delete(
        `/api/workspaces/${workspaceId}/members/${userId}`,
      );
      setMembers((currentMembers) =>
        currentMembers.filter((item) => item.user?._id !== userId),
      );

      setMemberMessage(response.data.message || "Member removed successfully.");
    } catch (err) {
      setMemberError(err.response?.data?.message || "Failed to remove member.");
    } finally {
      setRemovingUserId("");
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    setMemberError("");
    setMemberMessage("");

    try {
      const response = await api.patch(
        `/api/workspaces/${workspaceId}/members/${userId}`,
        { role: newRole },
      );
      setMembers((currentMembers) =>
        currentMembers.map((item) =>
          item.user?._id === userId ? { ...item, role: newRole } : item,
        ),
      );

      setMemberMessage(
        response.data.message || "Member role updated successfully.",
      );
    } catch (err) {
      setMemberError(
        err.response?.data?.message || "Failed to update member role.",
      );
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this workspace? Its projects and members will be preserved, but the workspace will become inactive.",
    );

    if (!confirmed) return;

    try {
      const response = await api.delete(`/api/workspaces/${workspaceId}`);

      if (response.data.success) {
        toast.success("Workspace archived successfully.");
        navigate("/workspaces");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to archive workspace.",
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading workspace...
      </div>
    );
  }

  if (error && !formData.name && !formData.description) {
    return (
      <div className="mx-auto max-w-2xl bg-slate-50 p-8 dark:bg-slate-950">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => navigate("/workspaces")}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-white"
        >
          Back to Workspaces
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-10 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate("/workspaces")}
          className="mb-6 text-sm font-medium text-blue-600 dark:text-blue-400"
        >
          ← Back to Workspaces
        </button>

        {/* Workspace details */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Workspace Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Update your workspace details.
          </p>

          {error && (
            <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          {message && (
            <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
              {message}
            </p>
          )}

          {isOwner ? (
            <>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                    required
                    value={formData.name}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        name: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                    rows={4}
                    value={formData.description}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        description: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>

              <button
                type="button"
                onClick={handleDeleteWorkspace}
                className="mt-5 rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-700"
              >
                Archive Workspace
              </button>
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-600 dark:text-slate-400">
              You can view workspace details, but only the owner can edit or
              archive this workspace.
            </p>
          )}
        </section>

        {/* Workspace members */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Workspace Members
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage the people who have access to this workspace.
          </p>

          {memberError && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {memberError}
            </p>
          )}

          {memberMessage && (
            <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
              {memberMessage}
            </p>
          )}

          {canManageMembers && (
            <form
              onSubmit={handleAddMember}
              className="mt-6 rounded-lg bg-slate-50 p-4 dark:bg-slate-800"
            >
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Add a member
              </h3>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder="Enter registered user's email"
                  aria-label="Member email"
                  className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />

                <select
                  value={memberRole}
                  onChange={(event) => setMemberRole(event.target.value)}
                  aria-label="Member role"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="member">Member</option>
                  {isOwner && <option value="admin">Admin</option>}
                </select>

                <button
                  type="submit"
                  disabled={addingMember}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {addingMember ? "Adding..." : "Add Member"}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                The user must already have a TeamFlow account.
              </p>
            </form>
          )}

          <div className="mt-6">
            {membersLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading members...
              </p>
            ) : members.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No members found.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {members.map((item) => {
                  const user = item.user;

                  if (!user) return null;

                  const fullName =
                    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                    user.email;

                  const isMemberOwner = item.role === "owner";

                  return (
                    <div
                      key={item._id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt=""
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                            {fullName}
                          </p>
                          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.role}
                        </span>

                        {isOwner && canManageMembers && !isMemberOwner && (
                          <select
                            aria-label={`Change role for ${fullName}`}
                            value={item.role}
                            onChange={(event) =>
                              handleUpdateRole(user._id, event.target.value)
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}

                        {canManageMembers && !isMemberOwner && (
                          <button
                            type="button"
                            disabled={removingUserId === user._id}
                            onClick={() =>
                              handleRemoveMember(user._id, fullName)
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            {removingUserId === user._id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default WorkspaceSettings;
