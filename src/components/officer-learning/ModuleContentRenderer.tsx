"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContentBlock, ModuleSection } from "@/lib/officer-learning/types";
import type { OlTheme } from "@/lib/officer-learning/theme";
import { useOlTheme } from "./OlThemeProvider";
import clsx from "clsx";
import { WorkedScenarioSection } from "./WorkedScenarioSection";

function renderInline(text: string, olTheme: OlTheme): ReactNode[] {
  const parts: ReactNode[] = [];
  const tokenRe =
    /(\*\*.+?\*\*|\*.+?\*|\/(?:guide|tools|app|brand-kit|portal)(?:\/[\w-]+)*(?:\?[\w=&%-]+)?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`strong-${key++}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && !token.startsWith("**")) {
      parts.push(
        <em key={`em-${key++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("/")) {
      parts.push(
        <Link
          key={`link-${key++}`}
          href={token}
          className={olTheme.link}
        >
          {token}
        </Link>,
      );
    } else {
      parts.push(token);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function ChecklistBlock({
  items,
  storageKey,
}: {
  items: string[];
  storageKey: string;
}) {
  const t = useTranslations("officerLearning.checklist");
  const olTheme = useOlTheme();
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      const next: Record<number, boolean> = {};
      for (const [k, v] of Object.entries(parsed)) {
        next[Number(k)] = Boolean(v);
      }
      return next;
    } catch {
      return {};
    }
  });

  const persist = (next: Record<number, boolean>) => {
    setChecked(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const done = items.filter((_, i) => checked[i]).length;

  return (
    <div className={olTheme.checklistPanel}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className={olTheme.checklistTitle}>{t("title")}</p>
        <p className={olTheme.checklistProgress}>
          {t("progress", { done, total: items.length })}
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => {
          const id = `${storageKey}-${index}`;
          const isOn = Boolean(checked[index]);
          return (
            <li key={id}>
              <label
                htmlFor={id}
                className={clsx(
                  "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
                  isOn ? olTheme.checklistItemOn : olTheme.checklistItemOff,
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  className={clsx("mt-1 h-4 w-4 shrink-0", olTheme.inputAccent)}
                  checked={isOn}
                  onChange={(e) =>
                    persist({ ...checked, [index]: e.target.checked })
                  }
                />
                <span
                  className={clsx(
                    "leading-relaxed text-slate-100",
                    isOn && "line-through opacity-80",
                  )}
                >
                  {renderInline(item, olTheme)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-400">{t("hint")}</p>
    </div>
  );
}

function BlockRenderer({
  block,
  checklistKey,
}: {
  block: ContentBlock;
  checklistKey: string;
}) {
  const t = useTranslations("officerLearning.callouts");
  const olTheme = useOlTheme();

  switch (block.type) {
    case "paragraph":
      return <p className={olTheme.prose}>{renderInline(block.text, olTheme)}</p>;
    case "list":
      if (block.ordered) {
        return (
          <ol className="list-decimal space-y-2 pl-5 text-slate-200/90">
            {block.items.map((item, index) => (
              <li key={`${item}-${index}`} className="leading-relaxed">
                {renderInline(item, olTheme)}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="list-disc space-y-2 pl-5 text-slate-200/90">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`} className="leading-relaxed">
              {renderInline(item, olTheme)}
            </li>
          ))}
        </ul>
      );
    case "checklist":
      return <ChecklistBlock items={block.items} storageKey={checklistKey} />;
    case "table":
      return (
        <div className={olTheme.tableWrap}>
          <table className="min-w-full text-left text-sm">
            <thead className={olTheme.tableHead}>
              <tr>
                {block.headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="px-4 py-3 font-semibold">
                    {renderInline(header, olTheme)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-t border-white/10">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className="px-4 py-3 align-top text-slate-200/90"
                    >
                      {renderInline(cell, olTheme)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "code":
      return (
        <pre className={olTheme.codeBlock}>
          <code>{block.text}</code>
        </pre>
      );
    case "callout": {
      const styles =
        block.variant === "warning"
          ? olTheme.calloutWarning
          : block.variant === "practice"
            ? olTheme.calloutPractice
            : block.variant === "reflection"
              ? olTheme.calloutReflection
              : olTheme.calloutDefault;
      return (
        <div className={styles}>
          <p className="font-semibold">{t(block.variant)}</p>
          <p className="mt-2 leading-relaxed">{renderInline(block.text, olTheme)}</p>
        </div>
      );
    }
    default:
      return null;
  }
}

type Props = {
  sections: ModuleSection[];
  moduleId: string;
  moduleSlug: string;
};

export function ModuleContentRenderer({ sections, moduleId, moduleSlug }: Props) {
  const olTheme = useOlTheme();
  return (
    <div className="space-y-10">
      {sections.map((section) =>
        section.id === "worked-scenario" ? (
          <WorkedScenarioSection
            key={section.id}
            section={section}
            moduleId={moduleId}
            moduleSlug={moduleSlug}
            renderBlock={({ block, checklistKey }) => (
              <BlockRenderer block={block} checklistKey={checklistKey} />
            )}
          />
        ) : (
          <section key={section.id} id={section.id} className="scroll-mt-32 space-y-4">
            <h2 className="text-2xl font-bold text-white md:text-3xl">{section.title}</h2>
            <div className="space-y-4">
              {section.blocks.map((block, index) => (
                <BlockRenderer
                  key={`${section.id}-block-${index}`}
                  block={block}
                  checklistKey={`ol-check:${moduleId}:${section.id}:${index}`}
                />
              ))}
            </div>
            {section.subsections?.map((subsection) => (
              <div
                key={subsection.id}
                id={subsection.id}
                className="scroll-mt-32 space-y-3 pt-2"
              >
                <h3 className={olTheme.subsectionTitle}>{subsection.title}</h3>
                <div className="space-y-4">
                  {subsection.blocks.map((block, index) => (
                    <BlockRenderer
                      key={`${subsection.id}-block-${index}`}
                      block={block}
                      checklistKey={`ol-check:${moduleId}:${subsection.id}:${index}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ),
      )}
    </div>
  );
}
