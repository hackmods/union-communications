import {
  GuideLayout,
  GuideSection,
} from "@/components/comms/guide-ui";
import type { AuthorizedGuideDto } from "@/lib/customization/types";
import type { ReactNode } from "react";

function humanizeId(id: string): string {
  return id
    .replace(/[:_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstPlainText(nodes: unknown): string | null {
  if (typeof nodes === "string" && nodes.trim()) return nodes.trim();
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const entry = node as { text?: string };
    if (typeof entry.text === "string" && entry.text.trim()) return entry.text.trim();
  }
  return null;
}

function renderInline(nodes: unknown): ReactNode {
  if (typeof nodes === "string") return nodes;
  if (!Array.isArray(nodes)) return null;
  return nodes.map((node, index) => {
    if (!node || typeof node !== "object") return null;
    const entry = node as { type?: string; text?: string; url?: string };
    if (entry.type === "emphasis") return <em key={index}>{entry.text}</em>;
    if (entry.type === "link" && entry.url) {
      return (
        <a key={index} href={entry.url} className="underline underline-offset-2">
          {entry.text}
        </a>
      );
    }
    return <span key={index}>{entry.text}</span>;
  });
}

function sectionTitle(block: AuthorizedGuideDto["blocks"][number]): string {
  if (block.type === "heading") {
    const content = block.payload.content;
    if (typeof content === "string" && content.trim()) return content.trim();
    return humanizeId(block.id);
  }
  const plain = firstPlainText(block.payload.content);
  if (plain && plain.length <= 80) return plain;
  return humanizeId(block.id);
}

function sourceLabel(source: AuthorizedGuideDto["sources"][number]): string {
  const payload = source.payload;
  const label = typeof payload.label === "string" ? payload.label
    : typeof payload.title === "string" ? payload.title
      : typeof payload.id === "string" ? payload.id
        : source.id;
  const url = typeof payload.url === "string" ? payload.url : null;
  return url ? `${label} — ${url}` : label;
}

/** Renders an authorized guide DTO. Never accepts raw resolver/private payloads. */
export function AuthorizedGuideView(props: {
  content: AuthorizedGuideDto;
  subtitle?: string;
  aside?: ReactNode;
  relatedLabel?: string;
  relatedLinks?: Array<{ href: string; label: string }>;
  footer?: ReactNode;
  tocLabel?: string;
  sourcesLabel?: string;
}) {
  const toc = props.content.blocks
    .filter((block) => block.type === "heading" || block.type === "paragraph" || block.type === "callout" || block.type === "steps")
    .map((block) => ({ id: block.id, label: sectionTitle(block) }));

  return (
    <GuideLayout
      title={props.content.title}
      subtitle={props.subtitle}
      preset="playbook"
      toc={toc.length ? toc : undefined}
      tocLabel={props.tocLabel}
      aside={props.aside}
      relatedLabel={props.relatedLabel}
      relatedLinks={props.relatedLinks}
      footer={props.footer}
    >
      {props.content.blocks.map((block) => {
        if (block.type === "heading") {
          return (
            <GuideSection key={block.id} id={block.id} title={sectionTitle(block)}>
              <span className="sr-only">{block.id}</span>
            </GuideSection>
          );
        }
        if (block.type === "callout") {
          const tone = typeof block.payload.tone === "string" ? block.payload.tone : "info";
          return (
            <GuideSection key={block.id} id={block.id} title={sectionTitle(block)}>
              <aside
                className={`rounded border px-4 py-3 text-base leading-relaxed ${
                  tone === "warning"
                    ? "border-opseu-orange/40 bg-opseu-orange/5 text-opseu-dark"
                    : "border-opseu-blue/30 bg-opseu-blue/5 text-opseu-dark"
                }`}
              >
                {renderInline(block.payload.content)}
              </aside>
            </GuideSection>
          );
        }
        if (block.type === "paragraph") {
          return (
            <GuideSection key={block.id} id={block.id} title={sectionTitle(block)}>
              <p className="max-w-prose text-base leading-relaxed text-slate-700">
                {renderInline(block.payload.content)}
              </p>
            </GuideSection>
          );
        }
        if (block.type === "steps" || block.type === "list") {
          const steps = block.payload.content;
          const list = Array.isArray(steps) ? steps : [];
          const ordered = block.type === "steps" || block.payload.ordered === true;
          const ListTag = ordered ? "ol" : "ul";
          return (
            <GuideSection key={block.id} id={block.id} title={sectionTitle(block)}>
              <ListTag className={`${ordered ? "list-decimal" : "list-disc"} space-y-2 pl-5 text-slate-700`}>
                {list.map((step, index) => (
                  <li key={index}>{typeof step === "string" ? step : renderInline(step)}</li>
                ))}
              </ListTag>
            </GuideSection>
          );
        }
        return (
          <GuideSection key={block.id} id={block.id} title={humanizeId(block.id)}>
            <p className="text-sm text-opseu-gray-dark">{block.type}</p>
          </GuideSection>
        );
      })}
      {props.content.sources.length > 0 ? (
        <GuideSection id="sources" title={props.sourcesLabel ?? "Sources"}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {props.content.sources.map((source) => (
              <li key={source.id}>{sourceLabel(source)}</li>
            ))}
          </ul>
        </GuideSection>
      ) : null}
    </GuideLayout>
  );
}
