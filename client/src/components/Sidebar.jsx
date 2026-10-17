import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PanelsTopLeft,
  FolderKanban,
  MessageCircle,
} from "lucide-react";

const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Workspaces", path: "/workspaces", icon: PanelsTopLeft },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Chat", path: "/chat", icon: MessageCircle },
];

const Sidebar = ({ workspaceName }) => {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white p-3 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 md:min-h-[calc(100vh-65px)] md:w-60 md:border-r md:border-b-0 md:p-4">
      <div className="mb-4 border-b border-slate-200 px-3 pb-4 dark:border-slate-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Current workspace
        </p>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <PanelsTopLeft size={19} />
          </div>

          <p
            className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-100"
            title={workspaceName || "No workspace selected"}
          >
            {workspaceName || "No workspace selected"}
          </p>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto md:flex-col">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950/60 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 h-6 w-1 rounded-r-full ${
                      isActive
                        ? "bg-blue-600 dark:bg-blue-400"
                        : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />

                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />

                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
