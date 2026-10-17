
import { useEffect, useState } from "react";
import api from "../utils/api";
import { WorkspaceContext } from "./workspaceContext";

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => localStorage.getItem("selectedWorkspaceId") || "",
  );
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await api.get("/api/workspaces");

        const userWorkspaces = response.data.workspaces || [];
        setWorkspaces(userWorkspaces);

        if (userWorkspaces.length > 0) {
          const savedWorkspaceId = localStorage.getItem(
            "selectedWorkspaceId",
          );

          const workspaceExists = userWorkspaces.some(
            (workspace) => workspace._id === savedWorkspaceId,
          );

          if (workspaceExists) {
            setSelectedWorkspaceId(savedWorkspaceId);
          } else {
            setSelectedWorkspaceId(userWorkspaces[0]._id);
          }
        }
      } catch (error) {
        console.error(
          "Fetch workspaces error:",
          error.response?.data?.message || error.message,
        );
      } finally {
        setWorkspaceLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspaceId) {
      localStorage.setItem("selectedWorkspaceId", selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  const selectedWorkspace = workspaces.find(
    (workspace) => workspace._id === selectedWorkspaceId,
  );

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        selectedWorkspace,
        workspaceLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
