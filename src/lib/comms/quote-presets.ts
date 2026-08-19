import type { ExampleAspect } from "@/lib/constants/examples";
import type { QuoteLayoutId } from "@/lib/comms/quote-layouts";

export const QUOTE_PRESET_ORDER = [
  "bargaining",
  "solidarity",
  "member",
] as const;

export type QuotePresetKey = (typeof QUOTE_PRESET_ORDER)[number];

export interface QuotePreset {
  id: QuotePresetKey;
  layout: QuoteLayoutId;
  aspect: ExampleAspect;
  quote: string;
  author: string;
  role: string;
}

export const QUOTE_PRESETS: Record<QuotePresetKey, QuotePreset> = {
  bargaining: {
    id: "bargaining",
    layout: "stripe",
    aspect: "square",
    quote: "We will not accept anything less than a fair deal for our members.",
    author: "Local President",
    role: "Bargaining committee",
  },
  solidarity: {
    id: "solidarity",
    layout: "mark",
    aspect: "square",
    quote: "An injury to one is an injury to all.",
    author: "Shop steward",
    role: "",
  },
  member: {
    id: "member",
    layout: "centered",
    aspect: "portrait",
    quote: "I joined because no one should face the employer alone.",
    author: "Member",
    role: "Support staff",
  },
};

export function isQuotePresetKey(value: string): value is QuotePresetKey {
  return (QUOTE_PRESET_ORDER as readonly string[]).includes(value);
}
