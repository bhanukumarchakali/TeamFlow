import api from "../utils/api";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/api/auth/me");

        setIsAuthenticated(true);
      } catch (error) {
        console.error(
          "Authentication check failed:",
          error.response?.data || error.message,
        );

        if (error.response?.status === 401 || error.response?.status === 403) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated("error");
        }
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <div>Checking authentication...</div>;
  }

  if (isAuthenticated === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-slate-700">
          Unable to verify your session. Please try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
