import { quoteFactors } from "@/config/content/quote-factors";
import { services } from "@/config/content/services";

export type QuoteEstimate = {
  serviceName: string;
  basePrice: number;
  lineItems: { label: string; amount: number }[];
  total: number;
};

// Pure and side-effect-free so it can run identically on the client (live
// preview as the user fills the form) and on the server (the source of
// truth — the server always recomputes from serviceSlug + selections and
// never trusts a client-submitted total).
export function calculateEstimate(
  serviceSlug: string,
  selections: Record<string, boolean | number>,
): QuoteEstimate | null {
  const service = services.find((candidate) => candidate.slug === serviceSlug);
  if (!service) {
    return null;
  }

  const serviceQuote = quoteFactors.find((quote) => quote.serviceSlug === serviceSlug);
  const basePrice = service.priceFrom ?? 0;
  const lineItems: { label: string; amount: number }[] = [];

  for (const factor of serviceQuote?.factors ?? []) {
    const selection = selections[factor.id];

    if (factor.type === "boolean" && selection === true) {
      lineItems.push({ label: factor.label, amount: factor.price });
    }

    if (factor.type === "quantity" && typeof selection === "number" && selection > 0) {
      const units = Math.min(Math.max(selection, factor.minUnits), factor.maxUnits);
      lineItems.push({
        label: `${factor.label} (${units})`,
        amount: units * factor.pricePerUnit,
      });
    }
  }

  const total = basePrice + lineItems.reduce((sum, item) => sum + item.amount, 0);

  return { serviceName: service.name, basePrice, lineItems, total };
}
