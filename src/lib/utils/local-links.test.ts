import { describe, expect, it } from "vitest";
import {
  applyBrandKitProfile,
  listSavedLinks,
  normalizeBrandKit,
  resolveLocalWebsiteUrl,
  resolvePresetDestination,
} from "./local-links";
import { OPSEU_CAAT_SUPPORT_PT_ID } from "@/lib/brand/collection-profiles";

describe("normalizeBrandKit", () => {
  it("upgrades a 1.0 kit to 2.0 with empty links", () => {
    const kit = normalizeBrandKit({
      version: "1.0",
      local: { id: "x", localNumber: "100", subText: "Staff" },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(kit.version).toBe("2.0");
    expect(kit.local.localNumber).toBe("100");
    expect(kit.customLinks).toEqual([]);
    expect(kit.websiteUrl).toBeUndefined();
    expect(kit.membershipUrls).toEqual([]);
    expect(kit.profiles).toHaveLength(1);
    expect(kit.profiles?.[0].id).toBe("profile-local");
  });

  it("does not default membershipUrls to OPSEU seed forms", () => {
    const kit = normalizeBrandKit(undefined);
    expect(kit.membershipUrls).toEqual([]);
    expect(
      JSON.stringify(kit.membershipUrls).toLowerCase(),
    ).not.toContain("opseu");
  });

  it("keeps website, facebook, and custom links", () => {
    const kit = normalizeBrandKit({
      version: "1.1",
      local: { id: "x", localNumber: "243", subText: "Support" },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: false,
      websiteUrl: " https://local243.org ",
      facebookUrl: "https://facebook.com/groups/example",
      customLinks: [
        { id: "ig", label: "Instagram", url: "https://instagram.com/example" },
        { id: "bad", label: "Empty", url: "  " },
      ],
      membershipUrls: [
        {
          id: "ft",
          label: "FT",
          url: " https://example.com/ft ",
          audience: "full_time",
          primary: true,
        },
        { id: "bad", label: "Empty", url: " ", audience: "all" },
      ],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(kit.websiteUrl).toBe("https://local243.org");
    expect(kit.facebookUrl).toBe("https://facebook.com/groups/example");
    expect(kit.customLinks).toHaveLength(1);
    expect(kit.customLinks?.[0].label).toBe("Instagram");
    expect(kit.membershipUrls).toHaveLength(1);
    expect(kit.membershipUrls?.[0].url).toBe("https://example.com/ft");
  });

  it("falls back empty or invalid colours to host defaults", () => {
    const kit = normalizeBrandKit({
      version: "1.0",
      local: { id: "x", localNumber: "100", subText: "Staff" },
      primaryColor: "",
      secondaryColor: "not-a-colour",
      accentColor: "  ",
      useOfficialLogo: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(kit.primaryColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(kit.secondaryColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(kit.accentColor).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("migrates legacy CUPE kits to the starter collection list", () => {
    const kit = normalizeBrandKit({
      version: "1.1",
      unionPresetId: "cupe",
      local: { id: "x", localNumber: "3902", subText: "Support" },
      primaryColor: "#E5007D",
      secondaryColor: "#FFFFFF",
      accentColor: "#B80063",
      useOfficialLogo: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(kit.profiles).toHaveLength(4);
    expect(kit.activeProfileId).toBe("profile-cupe-ft");
  });

  it("migrates legacy OPSEU kits to CAAT Support collections", () => {
    const kit = normalizeBrandKit({
      version: "1.1",
      unionPresetId: "opseu",
      local: { id: "x", localNumber: "243", subText: "Support" },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(kit.profiles).toHaveLength(2);
    expect(kit.local.bargainingUnitCode).toBe("ft");
  });

  it("keeps an explicit empty profiles list", () => {
    const kit = normalizeBrandKit({
      version: "2.0",
      profiles: [],
      local: { id: "x", localNumber: "100", subText: "Staff" },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(kit.profiles).toEqual([]);
  });

  it("reconciles a missing activeProfileId onto the first profile", () => {
    const kit = normalizeBrandKit({
      version: "2.0",
      unionPresetId: "opseu",
      activeProfileId: "profile-does-not-exist",
      local: { id: "x", localNumber: "243", subText: "Support" },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(kit.activeProfileId).toBe("profile-caat-s-ft");
  });
});

describe("applyBrandKitProfile", () => {
  it("copies the selected collection onto local identity fields", () => {
    const base = normalizeBrandKit({
      version: "2.0",
      unionPresetId: "opseu",
      local: { id: "x", localNumber: "243", subText: "Support" },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const switched = applyBrandKitProfile(base, OPSEU_CAAT_SUPPORT_PT_ID);
    expect(switched.activeProfileId).toBe(OPSEU_CAAT_SUPPORT_PT_ID);
    expect(switched.local.bargainingUnitCode).toBe("pt");
    expect(switched.local.subText).toBe("College Support Part-time");
  });
});

describe("listSavedLinks / resolve helpers", () => {
  const kit = normalizeBrandKit({
    version: "1.1",
    local: { id: "x", localNumber: "243", subText: "Support" },
    primaryColor: "#003DA5",
    secondaryColor: "#FFFFFF",
    accentColor: "#002868",
    useOfficialLogo: false,
    websiteUrl: "https://local243.org",
    facebookUrl: "https://facebook.com/groups/example",
    customLinks: [{ id: "c1", label: "Campaign", url: "https://example.com/promo" }],
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  it("lists website, facebook, and custom", () => {
    const links = listSavedLinks(kit);
    expect(links.map((l) => l.kind)).toEqual(["website", "facebook", "custom"]);
  });

  it("resolves website with origin fallback", () => {
    expect(resolveLocalWebsiteUrl(kit, "https://hub.example")).toBe(
      "https://local243.org",
    );
    const empty = normalizeBrandKit({
      version: "1.0",
      local: { id: "x", localNumber: "", subText: "" },
      primaryColor: "#000",
      secondaryColor: "#fff",
      accentColor: "#000",
      useOfficialLogo: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(resolveLocalWebsiteUrl(empty, "https://hub.example")).toBe(
      "https://hub.example",
    );
  });

  it("resolves follow-us to facebook when set", () => {
    expect(resolvePresetDestination("followUs", kit, "https://hub")).toBe(
      "https://facebook.com/groups/example",
    );
    expect(resolvePresetDestination("localWebsite", kit, "https://hub")).toBe(
      "https://local243.org",
    );
  });

  it("resolves right-to-refuse to the Ontario guide path", () => {
    expect(
      resolvePresetDestination("rightToRefuse", kit, "https://hub"),
    ).toMatch(/\/en\/guide\/right-to-refuse$/);
  });

  it("resolves membership presets from typed membershipUrls", () => {
    const withMembership = normalizeBrandKit({
      ...kit,
      membershipUrls: [
        {
          id: "ft",
          label: "Full-time",
          url: "https://example.com/join-ft",
          audience: "full_time",
          primary: true,
        },
        {
          id: "pt",
          label: "Part-time",
          url: "https://example.com/join-pt",
          audience: "part_time",
        },
      ],
    });
    expect(
      resolvePresetDestination("joinUnion", withMembership, "https://hub"),
    ).toBe("https://example.com/join-ft");
    expect(
      resolvePresetDestination(
        "membership-part-time",
        withMembership,
        "https://hub",
      ),
    ).toBe("https://example.com/join-pt");
  });
});
