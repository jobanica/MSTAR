import type { QuoteItem } from "./types";

/** Safely read line items out of a quote's `specs` JSON. */
export function readQuoteItems(specs: unknown): QuoteItem[] {
  if (!specs || typeof specs !== "object") return [];
  const items = (specs as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (i): i is { name: unknown; qty: unknown; unit_price_centavos: unknown } =>
        !!i && typeof i === "object" && typeof (i as { name?: unknown }).name === "string",
    )
    .map((i) => ({
      name: String(i.name),
      qty: Number(i.qty) || 1,
      unit_price_centavos: Math.round(Number(i.unit_price_centavos) || 0),
    }));
}

/** Line total (qty × unit price) in centavos. */
export function lineTotal(item: QuoteItem): number {
  return Math.round(item.qty * item.unit_price_centavos);
}
