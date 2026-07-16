import type { Page } from "@playwright/test";

const HYDRATION_ERROR =
  /hydrat|Minified React error #(?:418|423|425)|did not match|Text content does not match/i;

/**
 * Collect pageerrors and hydration-related console errors from the moment
 * listeners are attached until assertClean() is called.
 */
export function attachPageErrorGuard(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (err) => {
    errors.push(String(err));
  });

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (HYDRATION_ERROR.test(text)) {
      errors.push(text);
    }
  });

  return {
    assertClean() {
      if (errors.length === 0) return;
      throw new Error(
        `Unexpected page / hydration errors:\n${errors.join("\n---\n")}`,
      );
    },
  };
}
