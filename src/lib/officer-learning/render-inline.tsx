import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import {
  humanizeInternalPath,
  isInternalPath,
  tokenizeInline,
} from "./inline-markdown";

export { humanizeInternalPath } from "./inline-markdown";

export type InlineLinkClassNames = {
  link: string;
  strong?: string;
  code?: string;
  em?: string;
};

/**
 * Render lightweight markdown for Officer Learning.
 * Code spans win over bare path auto-links so `/guide/strike` does not leak backticks.
 */
export function renderInline(
  text: string,
  classes: InlineLinkClassNames,
): ReactNode[] {
  return tokenizeInline(text).map((token, key) => {
    switch (token.kind) {
      case "text":
        return token.value;
      case "md-link":
        if (token.href.startsWith("/")) {
          return (
            <Link key={`md-${key}`} href={token.href} className={classes.link}>
              {token.label}
            </Link>
          );
        }
        return (
          <a
            key={`md-${key}`}
            href={token.href}
            className={classes.link}
            rel="noopener noreferrer"
            target="_blank"
          >
            {token.label}
          </a>
        );
      case "strong":
        return (
          <strong key={`strong-${key}`} className={classes.strong}>
            {renderInline(token.value, classes)}
          </strong>
        );
      case "code":
        if (isInternalPath(token.value)) {
          return (
            <Link
              key={`code-link-${key}`}
              href={token.value}
              className={classes.link}
            >
              {humanizeInternalPath(token.value)}
            </Link>
          );
        }
        return (
          <code key={`code-${key}`} className={classes.code}>
            {token.value}
          </code>
        );
      case "em":
        return (
          <em key={`em-${key}`} className={classes.em ?? "italic"}>
            {renderInline(token.value, classes)}
          </em>
        );
      case "path":
        return (
          <Link key={`path-${key}`} href={token.value} className={classes.link}>
            {humanizeInternalPath(token.value)}
          </Link>
        );
      default:
        return null;
    }
  });
}
