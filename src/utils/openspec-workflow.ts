export type OpenSpecWorkflowId = 'openspec' | 'raven';

export type OpenSpecArtifactId = 'proposal' | 'prd' | 'design' | 'specs' | 'tasks' | 'task';

export type OpenSpecArtifactState = 'present' | 'missing';

export type OpenSpecNextAction =
  | 'create-proposal'
  | 'create-prd'
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
  workflow: OpenSpecWorkflowId;
  name: string;
  path: string;
  artifacts: Partial<Record<OpenSpecArtifactId, OpenSpecArtifactStatus>>;
  artifactIds: OpenSpecArtifactId[];
  specsCount: number;
  taskProgress: OpenSpecTaskProgress;
  nextAction: OpenSpecNextAction;
  mtime: number;
}

export interface OpenSpecWorkflowSummary {
  rootPath: string;
  changesPath: string;
  changesPaths: Partial<Record<OpenSpecWorkflowId, string>>;
  changes: OpenSpecChangeSummary[];
}

export interface OpenSpecWorkflowResult {
  summary?: OpenSpecWorkflowSummary;
  error?: string;
}
