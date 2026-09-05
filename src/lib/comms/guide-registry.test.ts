import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "@/app/sitemap";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import {
  GUIDE_CATALOG_GROUP_IDS,
  GUIDE_CATALOG_PATH,
  GUIDE_HUB_PATH,
  GUIDE_JOB_GROUP_HREFS,
  GUIDE_NAV_STEWARD_CRAFT_HREFS,
  GUIDE_REGISTRY,
  GUIDE_RESOURCES_COMMS_LINKS,
  GUIDE_RESOURCES_LABOUR_LINKS,
  GUIDE_STEWARD_PLAYBOOKS_HUB,
  GUIDE_STEWARD_PLAYBOOK_GROUPS,
  GUIDE_STEWARD_PLAYBOOK_LINKS,
  allRegisteredGuidePaths,
  guidePathsMissingFromRegistry,
  isGuideContentPath,
  primaryGuideGroupForPath,
  registryEntryByHref,
} from "./guide-registry";

const OFFICER_LEARNING_MODULE = /^\/guide\/officer-learning\/.+/;

function publicGuidePaths(): string[] {
  return PUBLIC_PATHS.filter(
    (path) => isGuideContentPath(path) && !OFFICER_LEARNING_MODULE.test(path),
  );
}

describe("guide-registry", () => {
  it("registers every public guide route except the hub and OL modules", () => {
    const missing = guidePathsMissingFromRegistry(publicGuidePaths());
    expect(missing).toEqual([]);
  });

  it("assigns each discoverability path to exactly one primary group", () => {
    const seen = new Map<string, string>();
    for (const path of allRegisteredGuidePaths()) {
      if (path === GUIDE_HUB_PATH) continue;
      const group = primaryGuideGroupForPath(path);
      expect(group, `missing group for ${path}`).toBeTruthy();
      expect(seen.has(path), `duplicate primary registration: ${path}`).toBe(
        false,
      );
      seen.set(path, group!);
    }
  });

  it("includes running-meetings on Resources labour path", () => {
    expect(
      GUIDE_RESOURCES_LABOUR_LINKS.some(
        (row) => row.href === "/guide/running-meetings",
      ),
    ).toBe(true);
  });

  it("includes steward playbooks hub on Resources labour path", () => {
    expect(
      GUIDE_RESOURCES_LABOUR_LINKS.some(
        (row) => row.href === GUIDE_STEWARD_PLAYBOOKS_HUB,
      ),
    ).toBe(true);
  });

  it("leads labour discoverability with Officer Learning", () => {
    expect(GUIDE_REGISTRY.labour[0]?.href).toBe("/guide/officer-learning");
    expect(GUIDE_RESOURCES_LABOUR_LINKS[0]?.href).toBe(
      "/guide/officer-learning",
    );
    expect(GUIDE_STEWARD_PLAYBOOK_LINKS[0]?.href).toBe(
      "/guide/officer-learning",
    );
  });

  it("keeps crisis on Resources comms path and bargaining group", () => {
    expect(
      GUIDE_RESOURCES_COMMS_LINKS.some((row) => row.href === "/guide/crisis"),
    ).toBe(true);
    expect(
      GUIDE_REGISTRY.bargaining.some((row) => row.href === "/guide/crisis"),
    ).toBe(true);
  });

  it("lists strike operations on labour resources, steward playbooks, and bargaining group", () => {
    expect(
      GUIDE_RESOURCES_LABOUR_LINKS.some((row) => row.href === "/guide/strike"),
    ).toBe(true);
    expect(
      GUIDE_STEWARD_PLAYBOOK_LINKS.some((row) => row.href === "/guide/strike"),
    ).toBe(true);
    expect(
      GUIDE_REGISTRY.bargaining.some((row) => row.href === "/guide/strike"),
    ).toBe(true);
    expect(primaryGuideGroupForPath("/guide/strike")).toBe("bargaining");
  });

  it("lists membership signup under channels only", () => {
    expect(primaryGuideGroupForPath("/guide/membership-signup")).toBe(
      "channels",
    );
  });

  it("lists union history on labour resources and steward playbooks", () => {
    expect(
      GUIDE_RESOURCES_LABOUR_LINKS.some(
        (row) => row.href === "/guide/union-history",
      ),
    ).toBe(true);
    expect(
      GUIDE_STEWARD_PLAYBOOK_LINKS.some(
        (row) => row.href === "/guide/union-history",
      ),
    ).toBe(true);
    expect(
      GUIDE_STEWARD_PLAYBOOK_LINKS.find((row) => row.href === "/guide/union-history")
        ?.tier,
    ).toBe("gold");
    expect(
      GUIDE_REGISTRY.labour.find((row) => row.href === "/guide/union-history")
        ?.tier,
    ).toBe("gold");
  });

  it("has EN/FR titles and blurbs for every steward playbook link", () => {
    for (const locale of [en, fr] as const) {
      const links = locale.stewardPlaybooksHub.links as Record<string, string>;
      const blurbs = locale.stewardPlaybooksHub.blurbs as Record<
        string,
        string
      >;
      for (const { key } of GUIDE_STEWARD_PLAYBOOK_LINKS) {
        expect(links[key], `missing stewardPlaybooksHub.links.${key}`).toBeTruthy();
        expect(
          blurbs[key],
          `missing stewardPlaybooksHub.blurbs.${key}`,
        ).toBeTruthy();
        expect(links[key]).not.toMatch(/^stewardPlaybooksHub\./);
      }
    }
  });

  it("has EN/FR catalog blurbs for every GUIDE_REGISTRY key", () => {
    for (const locale of [en, fr] as const) {
      const blurbs = locale.guidesIndex.blurbs as Record<string, string>;
      for (const group of Object.values(GUIDE_REGISTRY)) {
        for (const { key, href } of group) {
          expect(
            blurbs[key],
            `missing guidesIndex.blurbs.${key} (${href})`,
          ).toBeTruthy();
        }
      }
    }
  });

  it("does not treat the All-guides catalog as a /guide content route", () => {
    expect(isGuideContentPath(GUIDE_CATALOG_PATH)).toBe(false);
    expect(isGuideContentPath("/guide")).toBe(true);
    expect(isGuideContentPath("/guide/print")).toBe(true);
    expect(PUBLIC_PATHS).toContain(GUIDE_CATALOG_PATH);
  });

  it("gives every GUIDE_REGISTRY row a navKey", () => {
    for (const group of Object.values(GUIDE_REGISTRY)) {
      for (const entry of group) {
        expect(entry.navKey, `missing navKey for ${entry.href}`).toBeTruthy();
        expect(registryEntryByHref(entry.href)?.navKey).toBe(entry.navKey);
      }
    }
  });

  it("places floor, local, and campaign jobs without stealing primary groups", () => {
    expect(GUIDE_JOB_GROUP_HREFS.floor).toContain("/guide/grievance-process");
    expect(GUIDE_JOB_GROUP_HREFS.local).toContain("/guide/union-history");
    expect(GUIDE_JOB_GROUP_HREFS.local).toContain("/guide/membership-signup");
    expect(GUIDE_JOB_GROUP_HREFS.campaign).toContain("/guide/crisis");
    expect(primaryGuideGroupForPath("/guide/membership-signup")).toBe(
      "channels",
    );
    expect(primaryGuideGroupForPath("/guide/crisis")).toBe("bargaining");
    expect(GUIDE_NAV_STEWARD_CRAFT_HREFS).toEqual([
      GUIDE_STEWARD_PLAYBOOKS_HUB,
      "/guide/steward-101",
      "/guide/bargaining",
      "/guide/strike",
      "/guide/crisis",
    ]);
  });

  it("lists the catalog groups in registry order and covers every registered href", () => {
    expect(GUIDE_CATALOG_GROUP_IDS).toEqual([
      "commsPath",
      "channels",
      "bargaining",
      "labour",
    ]);
    const catalogHrefs = new Set(
      GUIDE_CATALOG_GROUP_IDS.flatMap((id) =>
        GUIDE_REGISTRY[id].map((row) => row.href),
      ),
    );
    for (const path of allRegisteredGuidePaths()) {
      expect(catalogHrefs.has(path), `catalog missing ${path}`).toBe(true);
    }
  });

  it("groups steward playbooks with Officer Learning first in training", () => {
    expect(GUIDE_STEWARD_PLAYBOOK_GROUPS.training[0]?.href).toBe(
      "/guide/officer-learning",
    );
    expect(
      GUIDE_STEWARD_PLAYBOOK_GROUPS.floor.map((row) => row.href),
    ).toEqual([...GUIDE_JOB_GROUP_HREFS.floor]);
    expect(
      GUIDE_STEWARD_PLAYBOOK_GROUPS.campaign.some(
        (row) => row.href === "/guide/crisis",
      ),
    ).toBe(true);
  });
});
