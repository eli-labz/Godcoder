export interface ThreadPanelHeaderProps {
  taskSummary: string;
  folderPath: string;
  branch: string;
  filesChanged: number;
  totalAdditions: number;
  totalDeletions: number;
  onExpandDiff?: () => void;
  /** Clear the current session (conversation + LLM context). Disabled when undefined. */
  onClear?: () => void;
}
