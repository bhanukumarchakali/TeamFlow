
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";
import { WorkspaceProvider } from "../context/WorkspaceContext.jsx";
import { useWorkspace } from "../context/useWorkspace.js";

const ProtectedContent = () => {
  const { selectedWorkspace } = useWorkspace();

  return (
    <div className="min-h-screen bg-slate-100 transition-colors dark:bg-slate-950">
      <Navbar />

      <div className="flex w-full flex-col md:min-h-[calc(100vh-65px)] md:flex-row">
        <Sidebar workspaceName={selectedWorkspace?.name} />

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const ProtectedLayout = () => {
  return (
    <WorkspaceProvider>
      <ProtectedContent />
    </WorkspaceProvider>
  );
};

export default ProtectedLayout;