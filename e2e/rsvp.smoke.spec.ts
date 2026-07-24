import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";

/**
 * Calendar R1 — create UnionMeeting + RSVP token via API, submit public form,
 * confirm hub tallies update.
 */
test.describe("RSVP token flow @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("public RSVP updates hub tallies", async ({ page }) => {
    await loginAsDemoOfficer(page);

    const starts = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const ends = new Date(starts.getTime() + 90 * 60 * 1000);

    const createRes = await page.request.post("/api/meetings/events", {
      data: {
        title: "E2E Membership Meeting",
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString(),
        location: "Board Room",
        hybrid: true,
        quorumNeeded: 5,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { meeting: { id: string } };
    const meetingId = created.meeting.id;

    const tokenRes = await page.request.post(
      `/api/meetings/events/${meetingId}/tokens`,
      { data: {} },
    );
    expect(tokenRes.ok()).toBeTruthy();
    const tokenBody = (await tokenRes.json()) as {
      token: { token: string };
    };
    const rawToken = tokenBody.token.token;

    await page.goto(`/en/r/${rawToken}`);
    await expect(
      page.getByRole("heading", { level: 1, name: /E2E Membership Meeting/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/Your name|Votre nom/i).fill("Sam Steward");
    await page.locator('input[name="attending"]').first().check();
    await page.locator('input[name="joinMode"]').first().check();
    await page.locator('form input[type="checkbox"]').check();
    await page.getByRole("button", { name: /Submit RSVP|Envoyer le RSVP/i }).click();
    await expect(
      page.getByText(/Thank you|Merci/i),
    ).toBeVisible({ timeout: 15_000 });

    const detailRes = await page.request.get(
      `/api/meetings/events/${meetingId}`,
    );
    expect(detailRes.ok()).toBeTruthy();
    const detail = (await detailRes.json()) as {
      tallies: {
        quorumCount: number;
        foodHeads: number;
        responseCount: number;
      };
    };
    expect(detail.tallies.quorumCount).toBeGreaterThanOrEqual(1);
    expect(detail.tallies.foodHeads).toBeGreaterThanOrEqual(1);
    expect(detail.tallies.responseCount).toBeGreaterThanOrEqual(1);
  });

  test("invalid token page is friendly", async ({ page }) => {
    await page.goto("/en/r/not-a-real-token");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /RSVP link not found|Lien RSVP introuvable/i,
      }),
    ).toBeVisible();
  });
});
