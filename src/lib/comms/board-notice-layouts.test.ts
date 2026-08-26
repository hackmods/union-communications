import { describe, expect, it } from "vitest";
import {
  BOARD_NOTICE_LAYOUT_ORDER,
  DEFAULT_BOARD_NOTICE_LAYOUT,
  isBoardNoticeLayoutId,
} from "@/lib/comms/board-notice-layouts";

describe("board-notice-layouts", () => {
  it("defaults to stack", () => {
    expect(DEFAULT_BOARD_NOTICE_LAYOUT).toBe("stack");
  });

  it("lists stack, band, and split", () => {
    expect(BOARD_NOTICE_LAYOUT_ORDER).toEqual(["stack", "band", "split"]);
  });

  it("guards layout ids", () => {
    expect(isBoardNoticeLayoutId("stack")).toBe(true);
    expect(isBoardNoticeLayoutId("photoHero")).toBe(false);
  });
});
