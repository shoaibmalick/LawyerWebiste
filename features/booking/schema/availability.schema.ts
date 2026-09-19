import { z } from "zod";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * What the availability generator accepts.
 *
 * Bounded on purpose: the form multiplies days × times, so a careless range can
 * ask for thousands of rows. The caps below keep a mistake to something a
 * person can look at and delete, rather than a table they have to be rescued
 * from.
 */
export const generateAvailabilitySchema = z
  .object({
    from: z.string().regex(DATE, "Use YYYY-MM-DD"),
    to: z.string().regex(DATE, "Use YYYY-MM-DD"),
    /** 0 = Sunday … 6 = Saturday. */
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one weekday"),
    times: z.array(z.string().regex(TIME, "Use HH:MM")).min(1, "Add at least one time"),
    // How long each slot runs. Services longer than this cannot be booked into
    // it, so it is the business's real appointment granularity.
    slotMinutes: z.number().int().min(5).max(480),
    // Concurrent appointments — chairs, rooms, staff. 1 for a single-operatory
    // practice, which is the case the model is built around.
    capacity: z.number().int().min(1).max(50),
  })
  .strict()
  .refine((value) => value.from <= value.to, {
    path: ["to"],
    message: "End date must not be before the start date",
  })
  .refine(
    (value) => {
      const from = new Date(`${value.from}T00:00:00Z`).getTime();
      const to = new Date(`${value.to}T00:00:00Z`).getTime();
      return (to - from) / 86_400_000 <= 366;
    },
    { path: ["to"], message: "Generate at most a year at a time" },
  );

export type GenerateAvailabilityInput = z.infer<typeof generateAvailabilitySchema>;

export const deleteAvailabilitySchema = z.object({ slotId: z.string().min(1) }).strict();
