export type OpenSpecArtifactId = 'proposal' | 'design' | 'specs' | 'tasks';

export type OpenSpecArtifactState = 'present' | 'missing';

export type OpenSpecNextAction =
  | 'create-proposal'
  | 'continue-design-specs'
  | 'create-tasks'
  | 'apply'
  | 'verify-review-archive'
  | 'inspect';

export interface OpenSpecArtifactStatus {
  id: OpenSpecArtifactId;
  state: OpenSpecArtifactState;
  path: string | null;
  count?: number;
}

export interface OpenSpecTaskProgress {
  total: number;
  completed: number;
  hasTasksFile: boolean;
  hasCheckboxes: boolean;
}

export interface OpenSpecChangeSummary {
  name: string;
  path: string;
  artifacts: Record<OpenSpecArtifactId, OpenSpecArtifactStatus>;
  specsCount: number;
  taskProgress: OpenSpecTaskProgress;
  nextAction: OpenSpecNextAction;
  mtime: number;
}

export interface OpenSpecWorkflowSummary {
  rootPath: string;
  changesPath: string;
  changes: OpenSpecChangeSummary[];
}

export interface OpenSpecWorkflowResult {
  summary?: OpenSpecWorkflowSummary;
  error?: string;
}
