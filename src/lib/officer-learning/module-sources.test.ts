import { describe, expect, it } from "vitest";
import { PAGE_SOURCE_IDS } from "@/lib/constants/comms-sources";
import { OFFICER_LEARNING_MODULES } from "./modules";
import {
  officerLearningStaticParams,
  SOURCES_PAGE_BY_SLUG,
} from "./module-sources";

describe("officer learning module sources", () => {
  it("maps every catalog module slug to a PAGE_SOURCE_IDS entry", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const pageId = SOURCES_PAGE_BY_SLUG[meta.slug];
      expect(pageId, meta.slug).toBeDefined();
      expect(PAGE_SOURCE_IDS[pageId], `${meta.slug} → ${pageId}`).toBeDefined();
      expect(PAGE_SOURCE_IDS[pageId]!.length).toBeGreaterThan(0);
    }
  });

  it("generates static params for every catalog module", () => {
    const params = officerLearningStaticParams();
    expect(params.map((p) => p.slug).sort()).toEqual(
      OFFICER_LEARNING_MODULES.map((m) => m.slug).sort(),
    );
  });
});
