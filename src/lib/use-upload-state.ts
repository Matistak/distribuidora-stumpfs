import { useContext } from "react";
import { UploadStateContext } from "@/lib/upload-context";

export function useUploadState() {
  const context = useContext(UploadStateContext);
  if (!context) {
    throw new Error("useUploadState must be used within an UploadStateProvider.");
  }

  return context;
}
