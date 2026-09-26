import { describe, expect, it } from "vitest";
import { PUBLIC_CATALOG } from "@/lib/comms/public-catalog";
import {
  canonicalPublicPath,
  canonicalizePublicHref,
  PUBLIC_ROUTE_REDIRECTS,
} from "./public-routes";

function redirectMatches(source: string, localePath: string): RegExpMatchArray | null {
  const tokenized = source
    .replace(":locale(en|fr)", "__LOCALE__")
    .replace(":path*", "__PATH__")
    .replace(":slug", "__SLUG__");
  const escaped = tokenized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace("__LOCALE__", "(?<locale>en|fr)")
    .replace("__PATH__", "(?<path>.+)")
    .replace("__SLUG__", "(?<slug>[^/]+)");
  return localePath.match(new RegExp(`^${escaped}$`));
}

describe("public route migration", () => {
  it.each([
    ["/onboarding", "/start"],
    ["/brand-kit", "/create/brand-kit"],
    ["/tools", "/create"],
    ["/tools/flyer-maker", "/create/flyer-maker"],
    ["/tools/rtw-accommodation", "/utilities/rtw-accommodation"],
    ["/create/rtw-accommodation", "/utilities/rtw-accommodation"],
    ["/tools/keep-learning", "/learn"],
    ["/create/keep-learning", "/learn"],
    ["/guides", "/learn"],
    ["/guide", "/learn/communications-blueprint"],
    ["/guide/social-media-plan", "/learn/first-week"],
    ["/guide/steward-playbooks", "/learn/steward"],
    ["/guide/officer-learning/contract-enforcement", "/learn/officer/contract-enforcement"],
    ["/guide/workshops/land-acknowledgement", "/learn/workshops/land-acknowledgement"],
    ["/guide/materials", "/learn/resources"],
    ["/examples", "/learn/library/examples"],
    ["/captions", "/learn/library/captions"],
    ["/assets", "/learn/library/brand-assets"],
  ])("maps %s to %s", (legacy, canonical) => {
    expect(canonicalPublicPath(legacy)).toBe(canonical);
  });

  it("preserves query and fragment data while canonicalizing internal links", () => {
    expect(canonicalizePublicHref("/onboarding?campaign=fall#brand"))
      .toBe("/start?campaign=fall&step=brand#brand");
    expect(canonicalizePublicHref("/onboarding?step=account"))
      .toBe("/start?step=account");
    expect(canonicalizePublicHref("/tools/flyer-maker?source=guide"))
      .toBe("/create/flyer-maker?source=guide");
  });

  it("permanently redirects every catalog legacy path to its canonical path", () => {
    expect(PUBLIC_ROUTE_REDIRECTS.every((redirect) => redirect.permanent)).toBe(true);
    const missing: string[] = [];

    for (const item of PUBLIC_CATALOG) {
      for (const legacyPath of item.legacyPaths) {
        const localePath = `/en${legacyPath.replace(/\/$/, "")}/`;
        const match = PUBLIC_ROUTE_REDIRECTS
          .map((redirect) => ({ redirect, match: redirectMatches(redirect.source, localePath) }))
          .find(({ match: routeMatch }) => routeMatch);
        if (!match) {
          missing.push(legacyPath);
          continue;
        }

        const target = match.redirect.destination
          .replace(":locale", "en")
          .replace(":slug", match.match?.groups?.slug ?? "")
          .replace(":path*", match.match?.groups?.path ?? "")
          .split("?")[0]
          .replace(/^\/en/, "")
          .replace(/\/$/, "") || "/";
        expect(target, `${legacyPath} redirect destination`).toBe(item.canonicalPath);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps both onboarding redirect variants so caller query strings survive", () => {
    const onboarding = PUBLIC_ROUTE_REDIRECTS.filter((redirect) =>
      redirect.source.endsWith("/onboarding/"),
    );
    expect(onboarding).toHaveLength(2);
    expect(onboarding.some((redirect) => redirect.has?.some((item) => item.key === "step"))).toBe(true);
    expect(onboarding.some((redirect) => redirect.missing?.some((item) => item.key === "step"))).toBe(true);
  });

  it("redirects locale-prefixed Viewport Lab URLs to the chrome-free lab", () => {
    const lab = PUBLIC_ROUTE_REDIRECTS.find((redirect) =>
      redirect.source.endsWith("/viewport-lab/"),
    );
    expect(lab?.destination).toBe("/viewport-lab/");
    expect(lab?.permanent).toBe(true);
  });
});
