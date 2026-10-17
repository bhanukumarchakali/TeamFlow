
import { useContext } from "react";
import { WorkspaceContext } from "./workspaceContext";

export const useWorkspace = () => {
  return useContext(WorkspaceContext);
};
