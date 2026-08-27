import type { ReactNode } from "react";
import type { ContentBlock, ModuleSection } from "@/lib/officer-learning/types";

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*.+?\*\*|\*.+?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
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
    } else {
      parts.push(
        <em key={`em-${key++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p className="leading-relaxed text-slate-200/90">{renderInline(block.text)}</p>;
    case "list":
      if (block.ordered) {
        return (
          <ol className="list-decimal space-y-2 pl-5 text-slate-200/90">
            {block.items.map((item, index) => (
              <li key={`${item}-${index}`} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="list-disc space-y-2 pl-5 text-slate-200/90">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-teal-500/20">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-teal-500/10 text-teal-100">
              <tr>
                {block.headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="px-4 py-3 font-semibold">
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-t border-white/10">
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3 align-top text-slate-200/90">
                      {renderInline(cell)}
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
        <pre className="overflow-x-auto rounded-xl border border-amber-400/20 bg-slate-950/70 p-4 font-mono text-sm text-amber-100">
          <code>{block.text}</code>
        </pre>
      );
    case "callout":
      return (
        <div
          className={
            block.variant === "warning"
              ? "rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-50"
              : "rounded-xl border border-teal-400/30 bg-teal-500/10 p-4 text-teal-50"
          }
        >
          <p className="font-semibold">
            {block.variant === "warning" ? "⚠️ Warning" : "💡 Note"}
          </p>
          <p className="mt-2 leading-relaxed">{renderInline(block.text)}</p>
        </div>
      );
    default:
      return null;
  }
}

export function ModuleContentRenderer({ sections }: { sections: ModuleSection[] }) {
  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-32 space-y-4">
          <h2 className="text-2xl font-bold text-white md:text-3xl">{section.title}</h2>
          <div className="space-y-4">
            {section.blocks.map((block, index) => (
              <BlockRenderer key={`${section.id}-block-${index}`} block={block} />
            ))}
          </div>
          {section.subsections?.map((subsection) => (
            <div key={subsection.id} id={subsection.id} className="scroll-mt-32 space-y-3 pt-2">
              <h3 className="text-xl font-semibold text-teal-200">{subsection.title}</h3>
              <div className="space-y-4">
                {subsection.blocks.map((block, index) => (
                  <BlockRenderer key={`${subsection.id}-block-${index}`} block={block} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
