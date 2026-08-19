/** Quote Card layout ids — per-tool; not Flyer `band` / Graphic `quote`. */

export const QUOTE_LAYOUT_ORDER = ["stripe", "centered", "mark"] as const;

export type QuoteLayoutId = (typeof QUOTE_LAYOUT_ORDER)[number];

export const DEFAULT_QUOTE_LAYOUT: QuoteLayoutId = "stripe";

export function isQuoteLayoutId(value: string): value is QuoteLayoutId {
  return (QUOTE_LAYOUT_ORDER as readonly string[]).includes(value);
}

/** `?layout=` from Quote Card, else `fallback`. */
export function quoteLayoutFromQuery(
  searchParams: { get(name: string): string | null },
  fallback: QuoteLayoutId,
): QuoteLayoutId {
  const raw = searchParams.get("layout");
  return raw && isQuoteLayoutId(raw) ? raw : fallback;
}
