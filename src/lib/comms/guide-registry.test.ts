import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "@/app/sitemap";
import {
  GUIDE_HUB_PATH,
  GUIDE_REGISTRY,
  GUIDE_RESOURCES_COMMS_LINKS,
  GUIDE_RESOURCES_LABOUR_LINKS,
  GUIDE_STEWARD_PLAYBOOKS_HUB,
  GUIDE_STEWARD_PLAYBOOK_LINKS,
  allRegisteredGuidePaths,
  guidePathsMissingFromRegistry,
  primaryGuideGroupForPath,
} from "./guide-registry";

const OFFICER_LEARNING_MODULE = /^\/guide\/officer-learning\/.+/;

function publicGuidePaths(): string[] {
  return PUBLIC_PATHS.filter(
    (path) => path.startsWith("/guide") && !OFFICER_LEARNING_MODULE.test(path),
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
});
