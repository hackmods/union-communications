import type {
  ContentBlock,
  ModuleSection,
  ParsedModule,
  QuizQuestion,
} from "./types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Preserve lightweight markdown markers for client-side rendering. */
function parseInline(text: string): string {
  return text.trim();
}

function parseListBlock(lines: string[], ordered: boolean): ContentBlock {
  const items = lines.map((line) => {
    const cleaned = line.replace(/^(\*|\d+\.)\s+/, "").trim();
    return parseInline(cleaned);
  });
  return { type: "list", ordered, items };
}

function parseTableBlock(lines: string[]): ContentBlock | null {
  if (lines.length < 2) return null;
  const splitRow = (row: string) =>
    row
      .split("|")
      .map((cell) => cell.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);

  const headers = splitRow(lines[0]);
  const rows = lines.slice(2).map(splitRow).filter((r) => r.length > 0);
  if (headers.length === 0) return null;
  return {
    type: "table",
    headers: headers.map(parseInline),
    rows: rows.map((row) => row.map(parseInline)),
  };
}

function detectCallout(text: string): ContentBlock | null {
  const trimmed = text.trim();
  if (/^💡|^Note:/i.test(trimmed)) {
    return {
      type: "callout",
      variant: "note",
      text: parseInline(trimmed.replace(/^(💡\s*|Note:\s*)/i, "")),
    };
  }
  if (/^⚠️|^Warning:/i.test(trimmed)) {
    return {
      type: "callout",
      variant: "warning",
      text: parseInline(trimmed.replace(/^(⚠️\s*|Warning:\s*)/i, "")),
    };
  }
  if (/^📝|^Practice:/i.test(trimmed)) {
    return {
      type: "callout",
      variant: "practice",
      text: parseInline(trimmed.replace(/^(📝\s*|Practice:\s*)/i, "")),
    };
  }
  if (/^🪞|^Reflection:/i.test(trimmed)) {
    return {
      type: "callout",
      variant: "reflection",
      text: parseInline(trimmed.replace(/^(🪞\s*|Reflection:\s*)/i, "")),
    };
  }
  return null;
}

function parseBlocks(rawLines: string[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < rawLines.length && !rawLines[i].startsWith("```")) {
        codeLines.push(rawLines[i]);
        i += 1;
      }
      blocks.push({ type: "code", text: codeLines.join("\n") });
      i += 1;
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].includes("|")) {
        tableLines.push(rawLines[i]);
        i += 1;
      }
      const table = parseTableBlock(tableLines);
      if (table) blocks.push(table);
      continue;
    }

    if (/^\*\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const listLines: string[] = [];
      while (
        i < rawLines.length &&
        (/^\*\s+/.test(rawLines[i]) || /^\d+\.\s+/.test(rawLines[i]))
      ) {
        listLines.push(rawLines[i]);
        i += 1;
      }
      blocks.push(parseListBlock(listLines, ordered));
      continue;
    }

    const paragraphLines: string[] = [line];
    i += 1;
    while (
      i < rawLines.length &&
      rawLines[i].trim() !== "" &&
      !rawLines[i].startsWith("#") &&
      !rawLines[i].startsWith("```") &&
      !rawLines[i].includes("|") &&
      !/^\*\s+/.test(rawLines[i]) &&
      !/^\d+\.\s+/.test(rawLines[i])
    ) {
      paragraphLines.push(rawLines[i]);
      i += 1;
    }

    const paragraphText = parseInline(paragraphLines.join(" ").trim());
    const callout = detectCallout(paragraphText);
    blocks.push(callout ?? { type: "paragraph", text: paragraphText });
  }

  return blocks;
}

function parseQuiz(lines: string[]): QuizQuestion[] {
  const quizStart = lines.findIndex((l) => l.trim() === "## Self-Test Quiz");
  if (quizStart === -1) return [];

  const quizLines = lines.slice(quizStart + 1);
  const questions: QuizQuestion[] = [];
  let current: Partial<QuizQuestion> | null = null;

  for (const line of quizLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("### Question")) {
      if (current?.prompt && current.options?.length && current.correctOptionId) {
        questions.push(current as QuizQuestion);
      }
      const qNum = questions.length + 1;
      current = {
        id: `q${qNum}`,
        prompt: "",
        options: [],
        correctOptionId: "",
        explanation: "",
      };
      continue;
    }

    if (!current) continue;

    if (trimmed.startsWith("*   ") || trimmed.startsWith("* ")) {
      const match = trimmed.match(/^\*\s+([A-D])\)\s+(.+)$/);
      if (match) {
        current.options!.push({
          id: match[1],
          label: parseInline(match[2]),
        });
      }
      continue;
    }

    if (trimmed.startsWith("**Correct Answer:")) {
      const answer = trimmed.match(/\*\*Correct Answer:\s*([A-D])\*\*/)?.[1];
      if (answer) current.correctOptionId = answer;
      continue;
    }

    if (trimmed.startsWith("*Explanation*:") || trimmed.startsWith("*Explanation*")) {
      current.explanation = parseInline(trimmed.replace(/^\*Explanation\*:\s*/, ""));
      continue;
    }

    if (trimmed && !trimmed.startsWith("*") && !current.prompt) {
      current.prompt = parseInline(trimmed);
    }
  }

  if (current?.prompt && current.options?.length && current.correctOptionId) {
    questions.push(current as QuizQuestion);
  }

  return questions;
}

function parseSections(lines: string[]): ModuleSection[] {
  const contentEnd = lines.findIndex((l) => l.trim() === "## Self-Test Quiz");
  const bodyLines = contentEnd === -1 ? lines : lines.slice(0, contentEnd);
  const sections: ModuleSection[] = [];
  let currentSection: ModuleSection | null = null;
  let currentSubsection: { id: string; title: string; blocks: ContentBlock[] } | null =
    null;
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const blocks = parseBlocks(buffer);
    if (currentSubsection) {
      currentSubsection.blocks.push(...blocks);
    } else if (currentSection) {
      currentSection.blocks.push(...blocks);
    }
    buffer = [];
  };

  for (const line of bodyLines) {
    if (
      line.startsWith("## ") &&
      !line.includes("Overarching Purpose") &&
      !line.includes("Core Learning Objectives")
    ) {
      flushBuffer();
      const title = line.replace(/^##\s+/, "").trim();
      currentSection = {
        id: slugify(title),
        title,
        blocks: [],
        subsections: [],
      };
      currentSubsection = null;
      sections.push(currentSection);
      continue;
    }

    if (line.startsWith("### ") && currentSection) {
      flushBuffer();
      const title = line.replace(/^###\s+/, "").trim();
      currentSubsection = {
        id: slugify(title),
        title,
        blocks: [],
      };
      currentSection.subsections!.push(currentSubsection);
      continue;
    }

    if (
      line.startsWith("# ") ||
      line.trim() === "---" ||
      line.startsWith("## Overarching Purpose") ||
      line.startsWith("## Core Learning Objectives")
    ) {
      continue;
    }

    if (line.startsWith("*   **") && line.includes("Core Learning Objectives") === false) {
      buffer.push(line);
      continue;
    }

    buffer.push(line);
  }

  flushBuffer();
  return sections.filter((s) => s.blocks.length > 0 || (s.subsections?.length ?? 0) > 0);
}

export function parseOfficerLearningModule(
  id: string,
  markdown: string,
): ParsedModule {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  const titleLine = lines.find((l) => l.startsWith("# "));
  const titleRaw = titleLine?.replace(/^#\s+/, "").trim() ?? id;
  const numberMatch = titleRaw.match(/^Module\s+(\d+):\s*(.+)$/i);
  const number = numberMatch ? Number(numberMatch[1]) : 0;
  const title = numberMatch ? numberMatch[2].trim() : titleRaw;

  const purposeIdx = lines.findIndex((l) => l.trim() === "## Overarching Purpose");
  const objectivesIdx = lines.findIndex((l) => l.trim() === "## Core Learning Objectives");
  let purpose = "";
  const objectives: string[] = [];

  if (purposeIdx !== -1) {
    const purposeLines: string[] = [];
    for (let i = purposeIdx + 1; i < lines.length; i += 1) {
      if (lines[i].startsWith("##")) break;
      if (lines[i].trim()) purposeLines.push(lines[i].trim());
    }
    purpose = purposeLines.join(" ");
  }

  if (objectivesIdx !== -1) {
    for (let i = objectivesIdx + 1; i < lines.length; i += 1) {
      if (lines[i].startsWith("##")) break;
      const match = lines[i].match(/^\*\s+\*\*(.+?)\*\*:\s*(.+)$/);
      if (match) {
        objectives.push(`${match[1]}: ${match[2]}`);
      }
    }
  }

  return {
    id,
    number,
    title,
    purpose,
    objectives,
    sections: parseSections(lines),
    quiz: parseQuiz(lines),
  };
}

export function estimateReadingMinutes(module: ParsedModule): number {
  const textLength =
    module.purpose.length +
    module.objectives.join(" ").length +
    module.sections.reduce((acc, section) => {
      const sectionText = JSON.stringify(section);
      return acc + sectionText.length;
    }, 0);
  return Math.max(12, Math.round(textLength / 900));
}
