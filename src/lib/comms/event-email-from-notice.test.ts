import { describe, expect, it } from "vitest";
import { fieldsFromBoardNotice } from "@/lib/comms/event-email-from-notice";

describe("fieldsFromBoardNotice", () => {
  it("maps headline to title and contact to contactName", () => {
    expect(
      fieldsFromBoardNotice({
        headline: "GENERAL MEMBERSHIP MEETING",
        date: "Wednesday, March 20",
        time: "5:30 PM",
        location: "Union office",
        contact: "Email your steward",
        quorumNeeded: "8",
      }),
    ).toEqual({
      title: "GENERAL MEMBERSHIP MEETING",
      date: "Wednesday, March 20",
      time: "5:30 PM",
      location: "Union office",
      contactName: "Email your steward",
      quorumNeeded: "8",
    });
  });

  it("passes through empty optional quorum", () => {
    const fields = fieldsFromBoardNotice({
      headline: "Event",
      date: "",
      time: "",
      location: "",
      contact: "",
    });
    expect(fields.quorumNeeded).toBeUndefined();
    expect(fields.title).toBe("Event");
  });
});
