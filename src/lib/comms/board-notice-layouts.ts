/** Board Notice layout ids (shared by canvas + form). */

export type BoardNoticeLayoutId = "stack" | "band" | "split";

export const BOARD_NOTICE_LAYOUT_ORDER: readonly BoardNoticeLayoutId[] = [
  "stack",
  "band",
  "split",
] as const;

export const DEFAULT_BOARD_NOTICE_LAYOUT: BoardNoticeLayoutId = "stack";

export function isBoardNoticeLayoutId(
  value: unknown,
): value is BoardNoticeLayoutId {
  return value === "stack" || value === "band" || value === "split";
}
