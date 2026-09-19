import { quoteConfigSchema } from "../schema/quote.schema";

export const quoteFactors = quoteConfigSchema.parse([
  {
    serviceSlug: "teeth-whitening",
    factors: [
      {
        type: "boolean",
        id: "sensitive-teeth-treatment",
        label: "Sensitive-teeth treatment add-on",
        price: 40,
      },
    ],
  },
  {
    serviceSlug: "invisalign",
    factors: [
      {
        type: "quantity",
        id: "aligner-sets",
        label: "Number of aligner sets",
        pricePerUnit: 150,
        minUnits: 1,
        maxUnits: 6,
      },
      {
        type: "boolean",
        id: "retainers",
        label: "Include retainers after treatment",
        price: 200,
      },
    ],
  },
]);
