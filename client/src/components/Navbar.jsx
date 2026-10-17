import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import api from "../utils/api.js";

const Navbar = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get("/api/auth/me");

        setUser(response.data.user);
      } catch (error) {
        console.error(
          "Failed to fetch current user:",
          error.response?.data || error.message,
        );
      }
    };

    fetchCurrentUser();

    window.addEventListener("profileUpdated", fetchCurrentUser);

    return () => {
      window.removeEventListener("profileUpdated", fetchCurrentUser);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/signout");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error.message);
    }
  };

  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "Loading profile...";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white text-slate-900 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="shrink-0 rounded-lg text-xl font-extrabold tracking-tight text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-4 dark:text-blue-400 dark:hover:text-blue-300 dark:focus:ring-offset-slate-900"
        >
          TeamFlow<span className="text-slate-800 dark:text-slate-100">.</span>
        </button>
        <div className="ml-auto flex items-center border-r border-slate-200 pr-3 dark:border-slate-700 sm:ml-0 sm:pr-5">
          <ThemeToggle />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfile((previous) => !previous)}
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-blue-100 to-indigo-200 text-sm font-bold text-blue-700 shadow-sm ring-1 ring-slate-200 dark:border-slate-800 dark:from-blue-900 dark:to-indigo-900 dark:text-blue-200 dark:ring-slate-700">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}` ||
                "U"
              )}
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-40 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {fullName}
              </p>
              <p className="max-w-40 truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.email || ""}
              </p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 sm:w-64">
              <div className="mb-1 border-b border-slate-100 px-3 py-3 sm:hidden dark:border-slate-700">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {fullName}
                </p>
                <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                  {user?.email || ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowProfile(false);
                  navigate("/profile");
                }}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                My Profile
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
