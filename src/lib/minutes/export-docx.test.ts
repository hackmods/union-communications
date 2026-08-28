import { describe, expect, it } from "vitest";
import { buildMinutesDocxBlob } from "./export-docx";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import type { MeetingMinutes } from "@/types/minutes";

const sampleMinutes: MeetingMinutes = {
  id: "min-1",
  unionId: "union-1",
  localId: "local-1",
  meetingDate: "2026-08-15T18:00:00.000Z",
  meetingType: "exec",
  attendees: ["Alex", "Jordan"],
  motions: [
    {
      text: "Approve the agenda.",
      movedBy: "Alex",
      secondedBy: "Jordan",
      vote: { for: 5, against: 0, abstain: 1 },
      result: "carried",
    },
  ],
  notes: "Quorum confirmed.\nNext meeting in September.",
  recordedById: "user-1",
  recordedByName: "Alex Steward",
  status: "approved",
  approvedAt: "2026-08-16T12:00:00.000Z",
  createdAt: "2026-08-15T19:00:00.000Z",
  updatedAt: "2026-08-16T12:00:00.000Z",
};

const logo = {
  bytes: transparentPngBytes(),
  extension: "png" as const,
  widthPx: 120,
  heightPx: 48,
  src: "data:image/png;base64,x",
};

describe("buildMinutesDocxBlob", () => {
  it("builds a non-empty DOCX with Brand Kit style", async () => {
    const blob = await buildMinutesDocxBlob(sampleMinutes, "Local 243", {
      headlineFont: "Montserrat",
      bodyFont: "Source Sans 3",
      primaryColor: "#003366",
      logo,
      locale: "en",
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("builds a French-localized DOCX without logo", async () => {
    const blob = await buildMinutesDocxBlob(sampleMinutes, "Section locale 243", {
      locale: "fr",
    });
    expect(blob.size).toBeGreaterThan(1000);
  });
});
