import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import {
  type CopyLeaf,
  PUBLIC_NS,
  hubLeaves,
  publicLeaves,
  wordCount,
} from "./copy-namespaces";

function emDashCount(s: string): number {
  return (s.match(/\u2014/g) ?? []).length;
}

const EN_LEAVES = publicLeaves(en as unknown as Record<string, unknown>);
const FR_LEAVES = publicLeaves(fr as unknown as Record<string, unknown>);
const EN_HUB = hubLeaves(en as unknown as Record<string, unknown>);
const FR_HUB = hubLeaves(fr as unknown as Record<string, unknown>);

function report(rows: CopyLeaf[]): string {
  return rows.map(([path, value]) => `${path}: ${value}`).join("\n");
}

/**
 * Tokens that legitimately end in a period mid-sentence, so "art. 43" and
 * "p. ex. Signez" are not mistaken for a lowercase sentence start.
 */
const ABBREVIATIONS = new Set([
  "e.g.", "i.e.", "etc.", "vs.", "cf.", "al.", "approx.", "no.", "No.",
  "art.", "ex.", "p.", "par.", "réf.", "Réf.", "Ont.", "min.", "max.",
  "env.", "St.", "Inc.",
]);

/**
 * A period followed by a lowercase letter is the fingerprint of a mechanical
 * semicolon/dash -> period edit that left the second clause uncapitalized.
 * Those render verbatim in search results and share cards.
 */
function hasLowercaseSentenceStart(value: string): boolean {
  // Collapse multi-token abbreviations first so "p. ex. off-001" does not
  // leave a bare "x." for the scanner to treat as a sentence end.
  const normalized = value
    .replace(/\bp\.\s*ex\./gi, "PEX")
    .replace(/\be\.\s*g\./gi, "EG")
    .replace(/\bi\.\s*e\./gi, "IE");
  const pattern = /(\S*[.!?]) +([a-z\u00e0-\u00ff])/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalized))) {
    // Strip opening brackets/quotes so "(e.g." still matches the allowlist.
    const token = match[1].replace(/^[^\w\u00c0-\u00ff]+/, "");
    if (!ABBREVIATIONS.has(token)) return true;
  }
  return false;
}

describe("public Comms copy style", () => {
  it("exposes shared Brand Kit nudge + privacy page keys in EN and FR", () => {
    expect(en.common.setupBrandPrompt).toBeTruthy();
    expect(en.common.setupBrandLink).toBeTruthy();
    expect(fr.common.setupBrandPrompt).toBeTruthy();
    expect(fr.common.setupBrandLink).toBeTruthy();
    expect(en.privacyPage.title).toBeTruthy();
    expect(fr.privacyPage.title).toBeTruthy();
  });

  it("keeps Brand Kit nudge on common, not duplicated on canvas tools", () => {
    const tools = [
      "boardNotice",
      "boardBanner",
      "resizer",
      "solidarityPoster",
      "meetingBackground",
      "qrCard",
      "actionCard",
      "pulsePoll",
      "qrBoard",
      "orgChart",
      "graphicMaker",
      "quoteCard",
      "flyerMaker",
    ] as const;
    for (const ns of tools) {
      expect(
        (en as Record<string, { setupBrandPrompt?: string }>)[ns]
          .setupBrandPrompt,
      ).toBeUndefined();
      expect(
        (fr as Record<string, { setupBrandPrompt?: string }>)[ns]
          .setupBrandPrompt,
      ).toBeUndefined();
    }
    // Doc-gen keeps a letterhead-specific override.
    expect(en.documentGenerator.setupBrandPrompt).toBeTruthy();
    expect(fr.documentGenerator.setupBrandPrompt).toBeTruthy();
  });

  it("keeps key lead copy short", () => {
    expect(wordCount(en.home.subtitle)).toBeLessThanOrEqual(20);
    expect(wordCount(en.socialMediaPlan.intro)).toBeLessThanOrEqual(35);
    expect(wordCount(en.resources.intro)).toBeLessThanOrEqual(28);
    expect(wordCount(en.boardBanner.subtitle)).toBeLessThanOrEqual(16);
    expect(wordCount(en.actionCard.subtitle)).toBeLessThanOrEqual(18);
    expect(wordCount(en.websiteTemplate.referenceNote)).toBeLessThanOrEqual(40);
  });

  // Deliberately no blanket per-leaf word ceiling. It optimized for brevity
  // over clarity and rewarded clipping subjects/verbs out of body copy
  // ("Prefer Install when it appears."). Body tips and guide paragraphs
  // should read as complete sentences; only named lead fields are kept short
  // above, and em-dash stacking is capped below.

  it("allows at most one em dash on public tool/guide lead fields", () => {
    const leads: string[] = [];
    for (const ns of PUBLIC_NS) {
      const block = (en as Record<string, unknown>)[ns];
      if (!block || typeof block !== "object") continue;
      const rec = block as Record<string, unknown>;
      for (const key of ["subtitle", "intro", "description", "whenToUse"]) {
        const v = rec[key];
        if (typeof v === "string") leads.push(`${ns}.${key}: ${v}`);
      }
    }
    const crowded = leads.filter((line) => emDashCount(line) > 1);
    expect(crowded, crowded.join("\n")).toEqual([]);
  });
});

describe("public copy sentence hygiene", () => {
  it("starts every sentence with a capital in both locales", () => {
    for (const [locale, rows] of [
      ["en", EN_LEAVES],
      ["fr", FR_LEAVES],
    ] as const) {
      const broken = rows.filter(([, v]) => hasLowercaseSentenceStart(v));
      expect(broken, `${locale}\n${report(broken)}`).toEqual([]);
    }
  });
});

describe("locked product terms", () => {
  // "the hub" is ambiguous on public pages: Officer Hub is the /app casework
  // surface, and public Comms should say "this site" or name the tool.
  it("never says a bare 'the hub' in English public copy", () => {
    const bare = EN_LEAVES.filter(([, v]) =>
      /\b(?:the|this|your|our) hub\b/i.test(v),
    );
    expect(bare, report(bare)).toEqual([]);
  });

  /**
   * Official bilingual lockup. A leftover OPSEU or SEFPO after stripping
   * `OPSEU / SEFPO` (or the French-order `SEFPO / OPSEU`) is a miss —
   * including the tight `OPSEU/SEFPO` form this guard was written to catch.
   */
  function withoutOpseuSefpoLockup(value: string): string {
    return value.replace(/OPSEU \/ SEFPO/g, "").replace(/SEFPO \/ OPSEU/g, "");
  }

  function hasBareOpseuOrSefpo(value: string): boolean {
    return /\b(?:OPSEU|SEFPO)\b/.test(withoutOpseuSefpoLockup(value));
  }

  it("treats a bare OPSEU as a lockup miss", () => {
    expect(hasBareOpseuOrSefpo("Use OPSEU logo")).toBe(true);
    expect(hasBareOpseuOrSefpo("Use OPSEU/SEFPO logo")).toBe(true);
    expect(hasBareOpseuOrSefpo("Use OPSEU / SEFPO logo")).toBe(false);
    expect(hasBareOpseuOrSefpo("Utiliser le logo SEFPO / OPSEU")).toBe(false);
  });

  it("uses OPSEU / SEFPO, not a bare OPSEU, in public copy", () => {
    const hits = [...EN_LEAVES, ...FR_LEAVES].filter(([, value]) =>
      hasBareOpseuOrSefpo(value),
    );
    expect(hits, report(hits)).toEqual([]);
  });

  it("uses one French name per locked term", () => {
    const drifted = FR_LEAVES.filter(([, v]) =>
      // Officer Hub -> "Hub des dirigeants" (not Portail/Centre des dirigeants)
      /(?:Portail|Centre) des dirigeants/.test(v) ||
      // Brand Kit is a product name, so it stays capitalized in French too
      /trousse de marque/.test(v) ||
      // alt text -> "texte alternatif", never the clipped "texte alt"
      /texte alt(?!ernatif)\b/.test(v) ||
      // flyer -> "tract" (not affiche = poster, not dépliant = leaflet)
      /d[ée]pliant/i.test(v) ||
      // statutes use their French acronyms, not the English ones
      /\b(?:OHSA|ESA)\b/.test(v) ||
      // duty of fair representation -> DRE
      /\bDJR\b/.test(v),
    );
    expect(drifted, report(drifted)).toEqual([]);
  });

  it("locks Org Chart as Organigramme", () => {
    expect(en.nav.orgChart).toBe("Org Chart");
    expect(fr.nav.orgChart).toBe("Organigramme");
    const drifted = FR_LEAVES.filter(
      ([path, v]) =>
        path.startsWith("orgChart.") &&
        /graphique organisationnel|chartre d.organisation/i.test(v),
    );
    expect(drifted, report(drifted)).toEqual([]);
  });

  it("Org Chart copy names officers and stewards, not a member list", () => {
    const hits = [...EN_LEAVES, ...FR_LEAVES].filter(([path, value]) => {
      if (
        !path.startsWith("orgChart.") &&
        !path.startsWith("websiteTemplate.orgChart")
      ) {
        return false;
      }
      return /\bmember lists?\b/i.test(value) || /liste des membres/i.test(value);
    });
    expect(hits, report(hits)).toEqual([]);
  });
});

describe("plain language for volunteers", () => {
  /**
   * Words that mean something to us and nothing to a steward. Keyed by the
   * term so a failure message says which one leaked back in.
   */
  const JARGON: readonly (readonly [label: string, pattern: RegExp])[] = [
    ["tenant", /\btenants?\b/i],
    ["chrome (UI)", /\b(?:canvas|install|brand) chrome\b/i],
    ["type scale", /\btype scale\b/i],
    ["progressive web app", /\bprogressive web app\b/i],
    ["PCI", /\bPCI\b/],
    // Do not flag ICU placeholders like {slug}.
    ["slug", /(?<!\{)\bslugs?\b(?!\})/i],
    ["memory store", /\bmemory stores?\b/i],
    ["localStorage", /\blocalStorage\b/],
    ["CTA", /\bCTAs?\b/],
    ["utilize", /\butiliz\w+/i],
    ["leverage", /\bleverage\b/i],
    ["*_DB_BACKEND", /_DB_BACKEND/],
  ];

  /**
   * `privacyPage.hubSelfHost` is addressed to whoever self-hosts the Officer
   * Hub, not to stewards, so it keeps `AUTH_SECRET`. Documented exception in
   * docs/audit/public-copy-qol-2026-08.md.
   */
  const EXEMPT = new Set(["privacyPage.hubSelfHost"]);

  it("keeps developer jargon out of public strings", () => {
    for (const [locale, rows] of [
      ["en", EN_LEAVES],
      ["fr", FR_LEAVES],
    ] as const) {
      const hits = rows.flatMap(([path, value]) => {
        if (EXEMPT.has(path)) return [];
        const found = JARGON.filter(([, pattern]) => pattern.test(value));
        return found.map(
          ([label]) => [path, `[${label}] ${value}`] as const satisfies CopyLeaf,
        );
      });
      expect(hits, `${locale}\n${report(hits)}`).toEqual([]);
    }
  });
});

describe("French locale quality", () => {
  it("puts a space before ':' and ';' as French typography requires", () => {
    const tight = FR_LEAVES.filter(([, v]) => {
      if (/\S;(?= )/.test(v)) return true;
      // Skip URL schemes (mailto:, https:) and clock times (19:30).
      return /(?:^|[^\s\d:])(?<!mailto|https|http|ftp):(?= )/.test(v);
    });
    expect(tight, report(tight)).toEqual([]);
  });

  it("translates every substantial English string", () => {
    const enByPath = new Map(EN_LEAVES);
    const untranslated = FR_LEAVES.filter(([path, value]) => {
      const english = enByPath.get(path);
      if (english !== value) return false;
      // Short labels, product names, and ALL-CAPS strings are legitimately
      // identical across locales (Solidarity., UnionOps, JUST BE LOVED).
      if (wordCount(value) <= 4) return false;
      return !/^[A-Z0-9 .,&|/'-]+$/.test(value);
    });
    expect(untranslated, report(untranslated)).toEqual([]);
  });
});

describe("Officer Hub copy style", () => {
  it("starts every Hub sentence with a capital in both locales", () => {
    for (const [locale, rows] of [
      ["en", EN_HUB],
      ["fr", FR_HUB],
    ] as const) {
      const broken = rows.filter(([, v]) => hasLowercaseSentenceStart(v));
      expect(broken, `${locale}\n${report(broken)}`).toEqual([]);
    }
  });

  it("never says a bare 'the hub' in English Hub copy", () => {
    const bare = EN_HUB.filter(([, v]) =>
      /\b(?:the|this|your|our) hub\b/i.test(v),
    );
    expect(bare, report(bare)).toEqual([]);
  });

  it("uses one French name per locked Hub term", () => {
    const drifted = FR_HUB.filter(([, v]) =>
      /(?:Portail|Centre) des dirigeants/.test(v) ||
      /trousse de marque/.test(v) ||
      /texte alt(?!ernatif)\b/.test(v) ||
      /\bDJR\b/.test(v) ||
      // Rental "locataire" must not stand in for union tenancy.
      /\blocataire\b/i.test(v) ||
      // Warehouse jargon from early hybrid FR.
      /\bmagasin\b/i.test(v),
    );
    expect(drifted, report(drifted)).toEqual([]);
  });

  it("locks Local Portal solidarity names in both locales", () => {
    expect(en.portal.stationTitle).toBe("Together");
    expect(fr.portal.stationTitle).toBe("Ensemble");
    expect(en.portal.frontsTitle).toBe("Hold the line");
    expect(fr.portal.frontsTitle).toBe("Tenir la ligne");
    expect(en.portal.frontsLink).toBe(en.portal.frontsTitle);
    expect(fr.portal.frontsLink).toBe(fr.portal.frontsTitle);
    expect(en.portal.tabs.momentum).toBe("One fight");
    expect(fr.portal.tabs.momentum).toBe("Un seul combat");
    expect(en.portal.tabs.pipeline).toBe("Many hands");
    expect(fr.portal.tabs.pipeline).toBe(fr.portal.muteTool.pipeline);
    expect(fr.portal.tabs.pipeline).toBe("Plusieurs mains");

    const staleEn = EN_HUB.filter(
      ([path, v]) =>
        path.startsWith("portal.") &&
        (/\b(?:Station|Fronts|Momentum|Pipeline|Locker)\b/.test(v) ||
          /Shop board|On the table|The push/.test(v)),
    );
    const staleFr = FR_HUB.filter(
      ([path, v]) =>
        path.startsWith("portal.") &&
        (/\b(?:Poste|Fronts|Élan|Chaîne|Casier)\b/.test(v) ||
          /Sur la table|La poussée|Tableau d.atelier/.test(v)),
    );
    expect(staleEn, report(staleEn)).toEqual([]);
    expect(staleFr, report(staleFr)).toEqual([]);
  });

  it("puts a space before ':' and ';' in Hub French", () => {
    const tight = FR_HUB.filter(([, v]) => {
      if (/\S;(?= )/.test(v)) return true;
      return /(?:^|[^\s\d:])(?<!mailto|https|http|ftp):(?= )/.test(v);
    });
    expect(tight, report(tight)).toEqual([]);
  });

  it("translates every substantial Hub English string", () => {
    const enByPath = new Map(EN_HUB);
    const untranslated = FR_HUB.filter(([path, value]) => {
      const english = enByPath.get(path);
      if (english !== value) return false;
      if (wordCount(value) <= 4) return false;
      return !/^[A-Z0-9 .,&|/'-]+$/.test(value);
    });
    expect(untranslated, report(untranslated)).toEqual([]);
  });

  /**
   * Hub jargon list differs from public: officers need grievance / CA /
   * bumping / bargaining unit. Ban software words instead.
   */
  const HUB_JARGON: readonly (readonly [label: string, pattern: RegExp])[] = [
    ["tenant", /\btenants?\b/i],
    // Do not flag ICU placeholders like {slug}.
    ["slug", /(?<!\{)\bslugs?\b(?!\})/i],
    ["payload", /\bpayloads?\b/i],
    ["adapter", /\badapters?\b/i],
    ["overlay", /\boverlays?\b/i],
    ["RLS", /\bRLS\b/],
    ["memory store", /\bmemory stores?\b/i],
    ["*_DB_BACKEND", /_DB_BACKEND/],
    ["CTA", /\bCTAs?\b/],
    ["utilize", /\butiliz\w+/i],
    ["leverage", /\bleverage\b/i],
    ["AUTH_ env", /\bAUTH_[A-Z0-9_]+\b/],
  ];

  it("keeps developer jargon out of Hub strings", () => {
    for (const [locale, rows] of [
      ["en", EN_HUB],
      ["fr", FR_HUB],
    ] as const) {
      const hits = rows.flatMap(([path, value]) => {
        const found = HUB_JARGON.filter(([, pattern]) => pattern.test(value));
        return found.map(
          ([label]) => [path, `[${label}] ${value}`] as const satisfies CopyLeaf,
        );
      });
      expect(hits, `${locale}\n${report(hits)}`).toEqual([]);
    }
  });

  it("does not hardcode national union names in Hub copy", () => {
    const hits = [...EN_HUB, ...FR_HUB].filter(([, value]) =>
      /\b(?:OPSEU|CAAT)\b/i.test(value),
    );
    expect(hits, report(hits)).toEqual([]);
  });
});
