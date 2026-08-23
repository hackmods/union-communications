import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MembershipUrlsEditor } from "./MembershipUrlsEditor";
import type { MembershipUrl } from "@/types/entities";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const copy: Record<string, string> = {
      title: "Membership application links",
      description: "Typed signup URLs for QR cards.",
      descriptionStatusSplit:
        "College Support uses separate full-time and part-time application forms.",
      audience: "Audience",
      "audiences.all": "All members",
      "audiences.full_time": "Full-time",
      "audiences.part_time": "Part-time",
      linkLabel: "Label",
      linkLabelPlaceholder: "e.g. Full-time membership",
      linkUrl: "Application URL",
      primary: "Primary link",
      addLink: "Add membership link",
      removeLink: "Remove",
    };
    return copy[key] ?? key;
  },
}));

const ALL_MEMBERS_ROW: MembershipUrl = {
  id: "membership-all",
  label: "OPSEU / SEFPO Membership",
  url: "https://hub03.opseu.org/Forms/emaweb",
  audience: "all",
  primary: true,
};

describe("MembershipUrlsEditor", () => {
  it("hides Audience when the sector has one All members form", () => {
    render(
      <MembershipUrlsEditor
        membershipUrls={[ALL_MEMBERS_ROW]}
        onChange={() => {}}
        audienceOptions={["all"]}
      />,
    );
    expect(screen.queryByLabelText("Audience")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Full-time" })).toBeNull();
    expect(
      screen.getByText("Typed signup URLs for QR cards."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/separate full-time and part-time/),
    ).not.toBeInTheDocument();
  });

  it("offers Full-time and Part-time for College Support", () => {
    render(
      <MembershipUrlsEditor
        membershipUrls={[ALL_MEMBERS_ROW]}
        onChange={() => {}}
        audienceOptions={["all", "full_time", "part_time"]}
      />,
    );
    const audience = screen.getByLabelText("Audience");
    expect(audience).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All members" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Full-time" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Part-time" })).toBeInTheDocument();
    expect(
      screen.getByText(/separate full-time and part-time application forms/),
    ).toBeInTheDocument();
  });
});
