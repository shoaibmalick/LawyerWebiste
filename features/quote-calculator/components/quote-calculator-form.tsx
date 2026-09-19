"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Service } from "@/config/schema/content.schema";
import type { ServiceQuoteConfig } from "@/config/schema/quote.schema";
import { calculateEstimate } from "../api/calculate-estimate";
import { useQuoteSubmit } from "../hooks/use-quote-submit";
import { quoteRequestSchema } from "../schema/quote.schema";

type QuoteCalculatorFormProps = {
  services: Service[];
  quoteFactors: ServiceQuoteConfig[];
};

export function QuoteCalculatorForm({ services, quoteFactors }: QuoteCalculatorFormProps) {
  const quotableServices = services.filter((service) =>
    quoteFactors.some((quote) => quote.serviceSlug === service.slug),
  );

  const [serviceSlug, setServiceSlug] = useState(quotableServices[0]?.slug ?? "");
  const [selections, setSelections] = useState<Record<string, boolean | number>>({});
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [validationError, setValidationError] = useState<string | null>(null);
  const { state, submit } = useQuoteSubmit();

  const activeFactors =
    quoteFactors.find((quote) => quote.serviceSlug === serviceSlug)?.factors ?? [];
  const estimate = useMemo(
    () => calculateEstimate(serviceSlug, selections),
    [serviceSlug, selections],
  );

  if (quotableServices.length === 0) {
    return <p className="text-muted-foreground text-sm">No quote calculator configured yet.</p>;
  }

  if (state.status === "success") {
    return (
      <p className="text-foreground text-sm">
        Thanks — we&apos;ve got your estimate request and will follow up shortly.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    const parsed = quoteRequestSchema.safeParse({
      serviceSlug,
      selections,
      name: contact.name,
      email: contact.email,
      phone: contact.phone || undefined,
    });

    if (!parsed.success) {
      setValidationError("Please fill in your name and a valid email.");
      return;
    }

    await submit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="service" className="text-foreground text-sm font-medium">
          Service
        </label>
        <select
          id="service"
          value={serviceSlug}
          onChange={(event) => {
            setServiceSlug(event.target.value);
            setSelections({});
          }}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        >
          {quotableServices.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      {activeFactors.map((factor) =>
        factor.type === "boolean" ? (
          <label key={factor.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(selections[factor.id])}
              onChange={(event) =>
                setSelections((prev) => ({ ...prev, [factor.id]: event.target.checked }))
              }
            />
            {factor.label} (+${factor.price})
          </label>
        ) : (
          <div key={factor.id} className="flex flex-col gap-1.5">
            <label htmlFor={factor.id} className="text-foreground text-sm font-medium">
              {factor.label} (${factor.pricePerUnit}/unit)
            </label>
            <input
              id={factor.id}
              type="number"
              min={factor.minUnits}
              max={factor.maxUnits}
              value={
                typeof selections[factor.id] === "number" ? (selections[factor.id] as number) : ""
              }
              onChange={(event) =>
                setSelections((prev) => ({ ...prev, [factor.id]: Number(event.target.value) }))
              }
              className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        ),
      )}

      {estimate && (
        <div className="border-border rounded-lg border p-4 text-sm">
          <p className="text-foreground font-medium">Estimated total: ${estimate.total}</p>
          <p className="text-muted-foreground">Base price: ${estimate.basePrice}</p>
          {estimate.lineItems.map((item) => (
            <p key={item.label} className="text-muted-foreground">
              {item.label}: ${item.amount}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          value={contact.name}
          onChange={(event) => setContact((prev) => ({ ...prev, name: event.target.value }))}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={contact.email}
          onChange={(event) => setContact((prev) => ({ ...prev, email: event.target.value }))}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-foreground text-sm font-medium">
          Phone (optional)
        </label>
        <input
          id="phone"
          value={contact.phone}
          onChange={(event) => setContact((prev) => ({ ...prev, phone: event.target.value }))}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {validationError && <p className="text-destructive text-sm">{validationError}</p>}
      {state.status === "error" && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={state.status === "submitting"}>
        {state.status === "submitting" ? "Sending…" : "Request this quote"}
      </Button>
    </form>
  );
}
