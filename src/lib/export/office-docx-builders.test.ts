import { describe, expect, it } from "vitest";
import {
  buildEventNoticeDocx,
  buildLetterheadDocx,
  buildSimpleLetterDocx,
  buildWelcomeLetterDocx,
  buildLecDirectoryDocx,
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

  it("writes Brand Kit Office face names into OOXML", async () => {
    const blob = await buildSimpleLetterDocx({
      palette,
      localLabel: "Local 110",
      logo,
      headlineFont: "Oswald",
      bodyFont: "Source Sans 3",
      fields: {
        date: "July 15, 2026",
        memberName: "Alex",
        body: "Thank you for your call.",
        stewardName: "Jordan",
        contactName: "Chief steward",
      },
    });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const headerXml = await zip.file("word/header1.xml")!.async("string");
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("Oswald");
    expect(docXml).toContain("Source Sans 3");
    expect(headerXml).toBeTruthy();
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

  it("builds an LEC directory from live roster rows", async () => {
    const blob = await buildLecDirectoryDocx({
      palette,
      localLabel: "Local 110",
      logo,
      sheetTitle: "Local directory",
      rows: [
        { position: "President", name: "Alex Steward", location: "Main" },
        { position: "Stewards", name: "Jordan Lee", location: "North" },
      ],
      fields: {
        officeEmail: "local@example.org",
        officePhone: "555-0100",
        officeAddress: "1 Union Hall",
      },
    });
    expect(blob.size).toBeGreaterThan(4000);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("Local directory");
    expect(docXml).toContain("Alex Steward");
    expect(docXml).toContain("Jordan Lee");
    expect(docXml).toContain("local@example.org");
  });

  it("builds a blank LEC directory with placeholder rows and brand tokens", async () => {
    const blob = await buildLecDirectoryDocx({
      palette,
      localLabel: "Local 110",
      logo,
      fields: {
        termYears: "2026–2028",
        subtitle: "Board copy",
        officeEmail: "local@example.org",
      },
    });
    expect(blob.size).toBeGreaterThan(5000);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("LOCAL EXECUTIVE COMMITTEE");
    expect(docXml).toContain("Position");
    expect(docXml).toContain("President");
  });

  it("builds a formal grievance pack with intake and snippets", async () => {
    const { buildFormalGrievanceDocx } = await import("./office-docx-builders");
    const blob = await buildFormalGrievanceDocx({
      palette,
      localLabel: "Local 110",
      logo,
      fields: {},
      labels: {
        title: "Formal grievance",
        fileNumber: "File number",
        local: "Local",
        filedAt: "Date filed",
        members: "Member name(s)",
        summary: "Summary",
        intakeHeading: "Intake (6 W's)",
        who: "Who",
        what: "What",
        when: "When",
        where: "Where",
        why: "Why",
        how: "How",
        remedy: "Remedy",
        snippetsHeading: "Linked CA clauses",
        brandNote: "Brand Kit colours and logo.",
      },
      data: {
        fileNumber: "GRV-2026-0001",
        localLabel: "Local 110",
        memberNames: ["Alex Member"],
        summary: "Scheduling dispute.",
        filedAt: "September 23, 2026",
        intake: { who: "Alex", what: "Denied OT", why: "Past practice" },
        linkedSnippets: [
          {
            clauseRef: "12.01",
            title: "Overtime",
            bodySnapshot: "Overtime is offered by seniority.",
          },
        ],
      },
    });
    expect(blob.size).toBeGreaterThan(5000);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("GRV-2026-0001");
    expect(docXml).toContain("Alex Member");
    expect(docXml).toContain("12.01");
    expect(docXml).toContain("Brand Kit colours");
  });

  it("puts a full-width fixed letterhead in the letter body for mobile viewers", async () => {
    const largeLogo = {
      ...logo,
      widthPx: 400,
      heightPx: 160,
    };
    const blob = await buildSimpleLetterDocx({
      palette,
      localLabel: "Local 110",
      logo: largeLogo,
      fields: {
        date: "July 15, 2026",
        memberName: "Alex",
        body: "I am writing on behalf of the member named above regarding return-to-work and/or accommodation.",
        stewardName: "Jordan",
        contactName: "Chief steward",
      },
    });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toMatch(/w:tblLayout[^>]*w:type="fixed"/);
    expect(docXml).toMatch(/w:tblW[^>]*w:type="pct"/);
    expect(docXml).toContain("003366");
    expect(docXml).toContain("Local 110");
    expect(docXml).toContain("Chief steward");
    expect(docXml).toContain("return-to-work");
    const extents = [...docXml.matchAll(/cx="(\d+)" cy="(\d+)"/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    expect(extents.length).toBeGreaterThan(0);
    const [cx, cy] = extents[0]!;
    expect(Math.max(cx, cy)).toBeGreaterThan(56 * 9525);
    expect(cx / cy).toBeCloseTo(400 / 160, 2);

    const event = await buildEventNoticeDocx({
      palette,
      localLabel: "Local 110",
      logo: largeLogo,
      fields: {
        title: "Membership meeting",
        date: "Aug 12",
        time: "Noon",
        location: "Cafeteria",
        contactName: "LEC",
      },
    });
    const eventZip = await JSZip.loadAsync(await event.arrayBuffer());
    const headerXml = await eventZip.file("word/header1.xml")!.async("string");
    expect(headerXml).toMatch(/w:tblLayout[^>]*w:type="fixed"/);
    expect(headerXml).toMatch(/w:tblW[^>]*w:type="pct"/);
  });
});
