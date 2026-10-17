import api from "../../utils/api";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/api/auth/me", {});

        setUser(response.data.user);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await api.put("/api/auth/profile", {
        firstName: user.firstName,
        lastName: user.lastName,
      });

      setUser(response.data.user);
      toast.success(response.data.message || "Profile updated successfully");
      window.dispatchEvent(new Event("profileUpdated"));
      setIsEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a JPEG, PNG, GIF, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await api.put("/api/auth/profile/avatar", formData);

      setUser(response.data.user);
      toast.success(
        response.data.message || "Profile picture updated successfully",
      );

      window.dispatchEvent(new Event("profileUpdated"));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to upload profile picture.",
      );
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar || removingAvatar || uploadingAvatar) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove your profile picture?",
    );

    if (!confirmed) return;

    setRemovingAvatar(true);

    try {
      const response = await api.delete("/api/auth/profile/avatar");

      setUser(response.data.user);
      toast.success(
        response.data.message || "Profile picture removed successfully",
      );
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to remove profile picture.",
      );
    } finally {
      setRemovingAvatar(false);
    }
  };
  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from your current password.");
      return;
    }

    setChangingPassword(true);

    try {
      const response = await api.put("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success(response.data.message || "Password changed successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to change password.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        User profile not found.
      </div>
    );
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          My Profile
        </h1>

        <p className="mt-2 text-slate-500 dark:text-slate-400">
          View your personal account information.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:mt-8 sm:p-8 dark:bg-slate-900 dark:shadow-slate-950/30">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-2xl font-bold text-blue-700 ring-2 ring-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:ring-blue-800">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}` || "U"
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {fullName || "User"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {user.email}
              </p>

              <label className="mt-3 inline-block cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:px-4 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                {uploadingAvatar ? "Uploading..." : "Change Profile Picture"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>

              {user.avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={removingAvatar || uploadingAvatar}
                  className="ml-0 mt-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 sm:ml-2 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  {removingAvatar ? "Removing..." : "Remove Picture"}
                </button>
              )}

              {uploadingAvatar && (
                <p className="mt-2 text-sm text-blue-600">
                  Uploading your picture...
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-5">
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">
                    First name
                  </label>
                  <input
                    type="text"
                    value={user.firstName}
                    onChange={(event) =>
                      setUser({ ...user, firstName: event.target.value })
                    }
                    required
                    minLength={2}
                    maxLength={50}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={user.lastName}
                    onChange={(event) =>
                      setUser({ ...user, lastName: event.target.value })
                    }
                    required
                    maxLength={50}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setUser({
                        ...user,
                        firstName: user.firstName,
                        lastName: user.lastName,
                      });
                      setIsEditing(false);
                    }}
                    className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    First name
                  </p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {user.firstName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Last name
                  </p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {user.lastName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Email address
                  </p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {user.email}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Email verification
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${user.isEmailVerified ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}
                  >
                    {user.isEmailVerified ? "Verified" : "Not verified"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Member since
                  </p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Not available"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              </>
            )}
          </div>
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
            {/* Clickable heading */}
            <button
              type="button"
              onClick={() => setShowPasswordSection((prev) => !prev)}
              aria-expanded={showPasswordSection}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Change Password
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Update your password to keep your account secure.
                </p>
              </div>

              <span className="text-xl text-slate-500">
                {showPasswordSection ? "−" : "+"}
              </span>
            </button>

            {/* Password form appears only when expanded */}

            {showPasswordSection && (
              <div className="mt-4">
                <form onSubmit={handleChangePassword} className="space-y-3">
                  {/* Current Password */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Current Password
                    </label>

                    <div className="relative mt-2">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        placeholder="Enter current password"
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-14 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900"
                      />

                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {showCurrentPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      New Password
                    </label>

                    <div className="relative mt-2">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Enter new password"
                        minLength={8}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-14 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900"
                      />

                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {showNewPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </label>

                    <div className="relative mt-2">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                        minLength={8}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-14 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900"
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {showConfirmPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {changingPassword
                        ? "Changing Password..."
                        : "Update Password"}
                    </button>

                    <button
                      type="button"
                      disabled={changingPassword}
                      onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setShowCurrentPassword(false);
                        setShowNewPassword(false);
                        setShowConfirmPassword(false);
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Clear Fields
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
