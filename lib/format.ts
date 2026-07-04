const php = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

/** Monetary values are stored in centavos — display as ₱. */
export function formatCentavos(centavos: number | null | undefined) {
  return php.format((centavos ?? 0) / 100);
}

/** Parse a peso amount typed by the user (e.g. "1,500.50") into centavos. */
export function parsePesosToCentavos(input: FormDataEntryValue | null): number {
  const n = parseFloat(String(input ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const ORDER_STATUSES = [
  "new",
  "design",
  "revision",
  "approved",
  "sent_to_production",
  "printing",
  "done",
  "ready",
  "completed",
  "cancelled",
] as const;

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "approved",
  "expired",
  "converted",
] as const;

export function statusLabel(status: string) {
  return status
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
