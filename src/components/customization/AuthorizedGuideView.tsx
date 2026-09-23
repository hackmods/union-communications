import {
  GuideLayout,
  GuideSection,
} from "@/components/comms/guide-ui";
import type { AuthorizedGuideDto } from "@/lib/customization/types";
import type { ReactNode } from "react";

function renderInline(nodes: unknown): ReactNode {
  if (!Array.isArray(nodes)) return null;
  return nodes.map((node, index) => {
    if (!node || typeof node !== "object") return null;
    const entry = node as { type?: string; text?: string; url?: string };
    if (entry.type === "emphasis") return <em key={index}>{entry.text}</em>;
    if (entry.type === "link" && entry.url) {
      return <a key={index} href={entry.url} className="underline">{entry.text}</a>;
    }
    return <span key={index}>{entry.text}</span>;
  });
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
}) {
  const toc = props.content.blocks
    .filter((block) => block.type === "heading" || block.id)
    .map((block) => ({ id: block.id, label: String(block.payload.content ?? block.id) }))
    .filter((item) => typeof item.label === "string");

  return (
    <GuideLayout
      title={props.content.title}
      subtitle={props.subtitle}
      preset="playbook"
      toc={toc.length ? toc.map((item) => ({ id: item.id, label: String(item.label) })) : undefined}
      tocLabel={props.tocLabel}
      aside={props.aside}
      relatedLabel={props.relatedLabel}
      relatedLinks={props.relatedLinks}
      footer={props.footer}
    >
      {props.content.blocks.map((block) => {
        if (block.type === "heading") {
          return (
            <GuideSection key={block.id} id={block.id} title={String(block.payload.content ?? block.id)}>
              <span className="sr-only">{block.id}</span>
            </GuideSection>
          );
        }
        if (block.type === "paragraph" || block.type === "callout") {
          return (
            <GuideSection key={block.id} id={block.id} title={block.id}>
              <p className="text-base leading-relaxed text-opseu-dark">{renderInline(block.payload.content)}</p>
            </GuideSection>
          );
        }
        if (block.type === "steps") {
          const steps = block.payload.content;
          const list = Array.isArray(steps) ? steps : [];
          return (
            <GuideSection key={block.id} id={block.id} title={block.id}>
              <ol className="list-decimal space-y-2 pl-5">
                {list.map((step, index) => <li key={index}>{String(step)}</li>)}
              </ol>
            </GuideSection>
          );
        }
        return (
          <GuideSection key={block.id} id={block.id} title={block.id}>
            <p className="text-sm text-opseu-gray-dark">{block.type}</p>
          </GuideSection>
        );
      })}
      {props.content.sources.length > 0 ? (
        <GuideSection id="sources" title="Sources">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {props.content.sources.map((source) => (
              <li key={source.id}>{source.id}</li>
            ))}
          </ul>
        </GuideSection>
      ) : null}
    </GuideLayout>
  );
}
