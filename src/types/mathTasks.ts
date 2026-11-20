export type DiagnosticSeverity = 'critical' | 'high' | 'medium';
export type DiagnosticCategory = 'compilation' | 'math_logic' | 'mathpar_syntax' | 'architecture';

export interface CodeDiagnostic {
  id: string;
  file: string;
  line: number;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  title: string;
  description: string;
  suggestion: string;
}

export interface RepoFileEntry {
  path: string;
  name: string;
  packageGroup: string;
  extension: string;
  lines: number;
  isModified: boolean;
  diagnosticCount: number;
  criticalCount: number;
}

export interface CourseSection {
  id: string;
  title: string;
  taskCount: number;
  weeksCount: number;
  implemented: boolean;
  generatorClass: string | null;
}

export interface CourseChapter {
  id: string;
  title: string;
  totalAssignments: number;
  totalTasks: number;
  weeksRange: string;
  sections: CourseSection[];
}

export interface DiffLine {
  type: 'context' | 'removed' | 'added';
  lineOriginal: number | null;
  lineModified: number | null;
  text: string;
}

export interface FileDetailResponse {
  path: string;
  originalContent: string;
  workingContent: string;
  isModified: boolean;
  hasAvailablePatch: boolean;
  diagnostics: CodeDiagnostic[];
  diff: DiffLine[];
}

export interface TestCaseResult {
  id: string;
  suite: 'compilation' | 'math_invariants' | 'mathpar_syntax' | 'curriculum_plan';
  name: string;
  targetFile: string;
  passed: boolean;
  durationMs: number;
  expected: string;
  actual: string;
  details: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  mode: 'original' | 'working';
  timestamp: string;
  results: TestCaseResult[];
}

export interface GeneratedTaskItem {
  taskId: string;
  taskType: string;
  conditionText: string;
  solutionSteps: Array<{ content: string; isText: boolean }>;
  finalAnswer: string;
  rawBlock: string;
  syntaxValid: boolean;
  validationNotes: string[];
}

export interface GeneratedAssignmentPreview {
  pageHeader: string;
  fileName: string;
  weekNumber: number;
  assignmentNumber: number;
  sectionId: string;
  sectionTitle: string;
  mode: 'original' | 'working';
  tasks: GeneratedTaskItem[];
  fullMathparText: string;
}

export interface AiAnalysisResponse {
  mode: 'audit' | 'generate_module';
  summary: string;
  architectureNotes: string[];
  fixedOrGeneratedCode: string;
  suggestedFilePath: string;
  mathparSample: string;
  modelUsed: string;
}
