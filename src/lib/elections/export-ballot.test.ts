import { describe, expect, it } from "vitest";
import { buildElectionBallotDocxBlob } from "./export-ballot";
import { listEmbeddedOoxmlFonts } from "@/lib/export/ooxml-font-embed";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import type { ElectionCycle } from "@/types/elections";

const sampleCycle: ElectionCycle = {
  id: "elec-1",
  unionId: "union-1",
  localId: "local-1",
  title: "2026 Officer Elections",
  positions: ["President", "Chief Steward"],
  status: "open",
  nominations: [
    {
      id: "nom-1",
      position: "President",
      nomineeName: "Alex Tremblay",
      status: "accepted",
    },
    {
      id: "nom-2",
      position: "President",
      nomineeName: "Jordan Lee",
      status: "accepted",
    },
    {
      id: "nom-3",
      position: "Chief Steward",
      nomineeName: "Sam Rivera",
      status: "pending",
    },
  ],
  tallies: [],
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-01T12:00:00.000Z",
};

const logo = {
  bytes: transparentPngBytes(),
  extension: "png" as const,
  widthPx: 120,
  heightPx: 48,
  src: "data:image/png;base64,x",
};

describe("buildElectionBallotDocxBlob", () => {
  it("builds a non-empty ballot DOCX with Brand Kit style", async () => {
    const blob = await buildElectionBallotDocxBlob(
      sampleCycle,
      "Local 243",
      {
        headlineFont: "Montserrat",
        bodyFont: "Source Sans 3",
        primaryColor: "#003366",
        logo,
        locale: "en",
      },
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("builds a French-localized ballot without logo", async () => {
    const blob = await buildElectionBallotDocxBlob(
      sampleCycle,
      "Section locale 243",
      { locale: "fr" },
    );
    expect(blob.size).toBeGreaterThan(1000);
  });


  it("embeds Brand Kit OFL faces for offline Word", async () => {
    const blob = await buildElectionBallotDocxBlob(sampleCycle, "Local 243", {
      headlineFont: "Montserrat",
      bodyFont: "Source Sans 3",
      headlineFontId: "montserrat",
      bodyFontId: "sourceSans",
      primaryColor: "#003366",
      locale: "en",
    });
    const embedded = await listEmbeddedOoxmlFonts(blob);
    expect(embedded.length).toBeGreaterThan(0);
  });
});
