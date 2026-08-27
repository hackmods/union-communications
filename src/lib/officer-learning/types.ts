export type ModuleStatus = "not_started" | "in_progress" | "completed";

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; text: string }
  | { type: "callout"; variant: "note" | "warning" | "practice" | "reflection"; text: string };

export type ModuleSection = {
  id: string;
  title: string;
  blocks: ContentBlock[];
  subsections?: { id: string; title: string; blocks: ContentBlock[] }[];
};

export type QuizOption = {
  id: string;
  label: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
};

export type ParsedModule = {
  id: string;
  number: number;
  title: string;
  purpose: string;
  objectives: string[];
  sections: ModuleSection[];
  quiz: QuizQuestion[];
};

export type ModuleMeta = {
  id: string;
  slug: string;
  number: number;
  coverSrc: string;
  readingMinutes: number;
};

export type ModuleProgress = {
  status: ModuleStatus;
  scrollDepth: number;
  quizPassed: boolean;
  lastVisitedAt?: string;
};

export type LearningProgressStore = Record<string, ModuleProgress>;
