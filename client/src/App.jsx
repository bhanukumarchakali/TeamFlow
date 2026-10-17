import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Register from "./pages/auth/Register.jsx";
import Login from "./pages/auth/Login.jsx";
import Dashboard from "./pages/auth/Dashboard.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import VerifyEmail from "./pages/auth/VerifyEmail.jsx";
import ForgotPassword from "./pages/auth/ForgetPassword.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";
import Chat from "./pages/auth/Chat.jsx";
import Projects from "./pages/projects/Projects.jsx";
import Project from "./pages/projects/Project.jsx";
import Board from "./pages/projects/Board.jsx";
import Task from "./pages/projects/Task.jsx";
import ProtectedLayout from "./components/ProtectedLayout.jsx";
import Profile from "./pages/auth/Profile.jsx";
import Workspaces from "./pages/workspace/Workspaces.jsx";
import WorkspaceSettings from "./pages/workspace/WorkspaceSettings.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          element={
            <ProtectedRoute>
              <ProtectedLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route
            path="/workspaces/:workspaceId/settings"
            element={<WorkspaceSettings />}
          />
          <Route path="/chat" element={<Chat />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/projects/:projectId" element={<Project />} />
          <Route
            path="/projects/:projectId/boards/:boardId"
            element={<Board />}
          />
          <Route
            path="/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId"
            element={<Task />}
          />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
};

export default App;
