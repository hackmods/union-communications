import { describe, expect, it } from "vitest";
import {
  humanizeInternalPath,
  tokenizeInline,
} from "./inline-markdown";

function flat(text: string): string {
  return tokenizeInline(text)
    .map((token) => {
      switch (token.kind) {
        case "text":
          return token.value;
        case "md-link":
          return `[${token.label}](${token.href})`;
        case "strong":
          return `<strong>${token.value}</strong>`;
        case "code":
          return isPath(token.value)
            ? `[${humanizeInternalPath(token.value)}](${token.value})`
            : `<code>${token.value}</code>`;
        case "em":
          return `<em>${token.value}</em>`;
        case "path":
          return `[${humanizeInternalPath(token.value)}](${token.value})`;
        default:
          return "";
      }
    })
    .join("");
}

function isPath(value: string): boolean {
  return /^\/(?:guide|tools|app|brand-kit|portal|learn|create|utilities|start)(?:\/[\w-]+)*/.test(
    value,
  );
}

describe("humanizeInternalPath", () => {
  it("title-cases the leaf slug", () => {
    expect(humanizeInternalPath("/guide/seniority-bumping")).toBe(
      "Seniority Bumping",
    );
  });
});

describe("tokenizeInline", () => {
  it("does not leave stray backticks around internal paths", () => {
    const out = flat("Pair with `/guide/strike` before you act.");
    expect(out).not.toContain("`");
    expect(out).toContain("[Strike](/guide/strike)");
  });

  it("renders bold markers", () => {
    const out = flat("Who should **not** typically sit here");
    expect(out).toContain("<strong>not</strong>");
    expect(out).not.toContain("**");
  });

  it("renders markdown links with readable labels", () => {
    const out = flat("See the [seniority-bumping guide](/guide/seniority-bumping).");
    expect(out).toContain("[seniority-bumping guide](/guide/seniority-bumping)");
  });

  it("humanizes bare internal paths", () => {
    const out = flat("Open /guide/membership-signup next.");
    expect(out).toContain("[Membership Signup](/guide/membership-signup)");
  });

  it("keeps non-path code as code", () => {
    const out = flat("Use folder `03_Contract_Enforcement/`.");
    expect(out).toContain("<code>03_Contract_Enforcement/</code>");
  });

  it("nested bold around backticked path still drops backticks", () => {
    const tokens = tokenizeInline("See **/guide/dfr** and **`/guide/dfr`**.");
    const flatText = tokens
      .map((token) => {
        if (token.kind === "strong") {
          return tokenizeInline(token.value)
            .map((inner) =>
              inner.kind === "code" || inner.kind === "path"
                ? humanizeInternalPath(inner.value)
                : "value" in inner
                  ? inner.value
                  : "",
            )
            .join("");
        }
        if (token.kind === "code" || token.kind === "path") {
          return humanizeInternalPath(token.value);
        }
        return "value" in token ? token.value : "";
      })
      .join("");
    expect(flatText).not.toContain("`");
    expect(flatText).toMatch(/Dfr|DFR|dfr/i);
  });
});
