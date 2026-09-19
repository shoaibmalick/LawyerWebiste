import { quoteFactors } from "@/config/content/quote-factors";
import { services } from "@/config/content/services";
import { QuoteCalculatorForm } from "@/features/quote-calculator";

export function QuoteCalculator() {
  return (
    <section id="quote-calculator" className="border-border bg-secondary/30 border-t">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-foreground text-3xl font-semibold tracking-tight">
          Get an instant estimate
        </h2>
        <div className="mt-10">
          <QuoteCalculatorForm services={services} quoteFactors={quoteFactors} />
        </div>
      </div>
    </section>
  );
}
