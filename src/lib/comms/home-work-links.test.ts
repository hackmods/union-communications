import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "@/app/sitemap";
import { HOME_MORE_WORK_LINKS, HOME_WORK_LINKS } from "@/lib/comms/home-work-links";

describe("Home task links", () => {
  it("points every featured task to a current public catalog route", () => {
    for (const item of [...HOME_WORK_LINKS, ...HOME_MORE_WORK_LINKS]) {
      expect(PUBLIC_PATHS, item.href).toContain(item.href);
    }
  });
});
