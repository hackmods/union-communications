import { describe, expect, it } from "vitest";
import {
  buildEventNoticeDocx,
  buildLetterheadDocx,
  buildSimpleLetterDocx,
  buildWelcomeLetterDocx,
} from "./office-docx-builders";
import { transparentPngBytes } from "./brand-logo-bytes";

const palette = {
  primary: "#003366",
  secondary: "#001a33",
  accent: "#c45c26",
};

const logo = {
  bytes: transparentPngBytes(),
  extension: "png" as const,
  widthPx: 120,
  heightPx: 48,
  src: "data:image/png;base64,x",
};

describe("office-docx-builders", () => {
  it("builds a simple letter with logo larger than a stub", async () => {
    const blob = await buildSimpleLetterDocx({
      palette,
      localLabel: "Local 110",
      logo,
      fields: {
        date: "July 15, 2026",
        memberName: "Alex",
        body: "Thank you for your call. We will follow up next week.",
        stewardName: "Jordan",
        contactName: "Chief steward",
      },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(8000);
  });

  it("builds letterhead without logo", async () => {
    const blob = await buildLetterheadDocx({
      palette,
      localLabel: "Local 110",
      logo: null,
      fields: { contactName: "LEC", body: "" },
    });
    expect(blob.size).toBeGreaterThan(5000);
  });

  it("builds event notice", async () => {
    const blob = await buildEventNoticeDocx({
      palette,
      localLabel: "Local 110",
      logo,
      fields: {
        title: "Membership meeting",
        subtitle: "All welcome",
        date: "Aug 12",
        time: "Noon",
        location: "Cafeteria",
        body: "Bring questions.",
        contactName: "LEC",
      },
    });
    expect(blob.size).toBeGreaterThan(8000);
  });

  it("builds welcome letter with membership URL", async () => {
    const blob = await buildWelcomeLetterDocx({
      palette,
      localLabel: "Local 110",
      logo,
      fields: {
        date: "July 18, 2026",
        memberName: "Alex",
        collection: "Part-time Support Staff",
        body: "Welcome to your local.",
        membershipUrl: "https://example.com/join",
        presidentName: "Jordan",
        stewardContact: "steward@example.org",
      },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(8000);
  });
});
