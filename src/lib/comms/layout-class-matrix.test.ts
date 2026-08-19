import { describe, expect, it } from "vitest";
import { ACTION_CARD_PRESETS } from "@/lib/constants/action-card-presets";
import { FLYER_PRESETS } from "@/lib/comms/flyer-presets";
import { MEETING_BACKGROUND_PRESETS } from "@/lib/constants/meeting-background-presets";
import { QR_BOARD_PRESETS } from "@/lib/constants/qr-board-presets";
import { QR_CARD_PRESETS } from "@/lib/constants/qr-card-presets";
import { SOLIDARITY_SLOGANS } from "@/lib/constants/solidarity-slogans";
import { QUOTE_PRESETS } from "@/lib/comms/quote-presets";
import { TOOL_PRESETS } from "@/lib/constants/presets";
import {
  LAYOUT_CLASS_ACTION_CARD,
  LAYOUT_CLASS_FLYER,
  LAYOUT_CLASS_GRAPHIC,
  LAYOUT_CLASS_GRAPHIC_LAYOUT,
  LAYOUT_CLASS_MEETING,
  LAYOUT_CLASS_QR_BOARD,
  LAYOUT_CLASS_QR_CARD,
  LAYOUT_CLASS_QUOTE,
  LAYOUT_CLASS_SOLIDARITY,
} from "./layout-class-matrix";

describe("layout-class matrix ids exist in source constants", () => {
  it("QR Board preset ids", () => {
    const ids = new Set(QR_BOARD_PRESETS.map((p) => p.id));
    for (const row of LAYOUT_CLASS_QR_BOARD) {
      expect(ids.has(row.id), row.id).toBe(true);
    }
  });

  it("QR Card link + reference ids", () => {
    const ids = new Set(QR_CARD_PRESETS.map((p) => p.id));
    for (const id of LAYOUT_CLASS_QR_CARD) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(QR_CARD_PRESETS.find((p) => p.id === "rightToRefuse")?.layoutMode).toBe(
      "reference",
    );
  });

  it("Action Card default id", () => {
    const ids = new Set(ACTION_CARD_PRESETS.map((p) => p.id));
    for (const id of LAYOUT_CLASS_ACTION_CARD) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(ACTION_CARD_PRESETS[0].id).toBe("signPetition");
  });

  it("Flyer Maker preset ids", () => {
    for (const id of LAYOUT_CLASS_FLYER) {
      expect(FLYER_PRESETS[id], id).toBeDefined();
    }
    expect(FLYER_PRESETS.picket.layout).toBe("band");
    expect(FLYER_PRESETS.rally.layout).toBe("stack");
    expect(FLYER_PRESETS.meeting.layout).toBe("stack");
    expect(FLYER_PRESETS.walkabout.layout).toBe("split");
  });

  it("Graphic Maker TOOL_PRESETS keys", () => {
    for (const id of LAYOUT_CLASS_GRAPHIC) {
      expect(TOOL_PRESETS[id], id).toBeDefined();
      expect(LAYOUT_CLASS_GRAPHIC_LAYOUT[id]).toBeTruthy();
    }
  });

  it("Solidarity one slogan per layout", () => {
    const byId = new Map(SOLIDARITY_SLOGANS.map((s) => [s.id, s]));
    for (const row of LAYOUT_CLASS_SOLIDARITY) {
      const slogan = byId.get(row.id);
      expect(slogan, row.id).toBeDefined();
      expect(slogan?.layout).toBe(row.layout);
    }
  });

  it("Meeting Background bold/minimal pair", () => {
    const preset = MEETING_BACKGROUND_PRESETS.find(
      (p) => p.id === LAYOUT_CLASS_MEETING,
    );
    expect(preset).toBeDefined();
    expect(preset?.layout).toBe("lower-third");
    expect(preset?.minimalLayout).toBe("footer");
  });

  it("Quote Card preset ids map to unique layouts", () => {
    expect(QUOTE_PRESETS.bargaining.layout).toBe("stripe");
    expect(QUOTE_PRESETS.solidarity.layout).toBe("mark");
    expect(QUOTE_PRESETS.member.layout).toBe("centered");
    for (const id of LAYOUT_CLASS_QUOTE) {
      expect(QUOTE_PRESETS[id], id).toBeDefined();
    }
  });
});
