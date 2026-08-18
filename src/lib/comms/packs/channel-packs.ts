/**
 * Channel feature packs — presets / related-link constants only.
 * No capture engines. Tools keep per-tool layout IDs.
 *
 * @see docs/modules/COMMS_VISUAL_SYSTEM.md (Channel packs)
 */

export const COMMS_CHANNEL_PACKS = {
  print: {
    id: "print",
    tools: ["flyer-maker", "document-generator"] as const,
  },
  social: {
    id: "social",
    tools: [
      "graphic-maker",
      "quote-card",
      "resizer",
      "meeting-background",
      "alt-text",
    ] as const,
  },
  board: {
    id: "board",
    tools: [
      "board-notice",
      "board-banner",
      "solidarity-poster",
      "qr-board",
    ] as const,
  },
  wallet: {
    id: "wallet",
    tools: ["qr-card", "action-card", "pulse-poll"] as const,
  },
} as const;

export type CommsChannelPackId = keyof typeof COMMS_CHANNEL_PACKS;
