"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/field";
import type { SiteConfig } from "@/config/schema/site.schema";

import { saveBusinessAction } from "../api/save-business";
import type { SiteSettingsActionResult } from "../api/set-theme-preset";

type HoursRow = { day: string; opens: string; closes: string };

type Props = {
  /** What is stored as an override. Empty string means "not overridden". */
  stored: {
    phone: string;
    email: string;
    addressStreet: string;
    addressCity: string;
    addressState: string;
    addressZip: string;
    addressCountry: string;
    hours: HoursRow[] | null;
  };
  /**
   * The configured values, shown as placeholders.
   *
   * Without them an empty box looks like missing data rather than "inheriting
   * from config", which is the single most confusing thing about an
   * override-shaped form.
   */
  fallback: SiteConfig["business"];
};

const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * Contact details and opening hours, editable by the business.
 *
 * Every text field is an override: leave it blank and the value from
 * `config/site.config.ts` shows through, which is what the placeholders are
 * telling you. That is also the only way back once something has been saved.
 *
 * Hours are all-or-nothing by design — the form always posts the full week, and
 * a closed day is `{ opens: null, closes: null }` rather than a missing entry.
 * A partial week would merge against the configured one unpredictably.
 */
export function BusinessSettingsForm({ stored, fallback }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SiteSettingsActionResult | null>(null);

  const [phone, setPhone] = useState(stored.phone);
  const [email, setEmail] = useState(stored.email);
  const [street, setStreet] = useState(stored.addressStreet);
  const [city, setCity] = useState(stored.addressCity);
  const [state, setState] = useState(stored.addressState);
  const [zip, setZip] = useState(stored.addressZip);
  const [country, setCountry] = useState(stored.addressCountry);

  const [hours, setHours] = useState<HoursRow[]>(
    stored.hours ??
      WEEK.map((day) => {
        const configured = fallback.hours.find((h) => h.day === day);
        return { day, opens: configured?.opens ?? "", closes: configured?.closes ?? "" };
      }),
  );

  function setDay(day: string, patch: Partial<HoursRow>) {
    setHours((rows) => rows.map((row) => (row.day === day ? { ...row, ...patch } : row)));
  }

  function save() {
    setResult(null);
    startTransition(async () => {
      const outcome = await saveBusinessAction({
        phone,
        email,
        addressStreet: street,
        addressCity: city,
        addressState: state,
        addressZip: zip,
        addressCountry: country,
        // A blank pair is a closed day, which the schema expects as explicit
        // nulls rather than an omitted entry.
        hours: hours.map((row) => ({
          day: row.day,
          opens: row.opens.trim() === "" ? null : row.opens.trim(),
          closes: row.closes.trim() === "" ? null : row.closes.trim(),
        })),
      });
      setResult(outcome);
      router.refresh();
    });
  }

  const text = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-foreground font-medium">{label}</span>
      <input
        className={FIELD}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );

  return (
    <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
      <div>
        <h2 className="text-foreground text-lg font-medium">Contact details</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          What visitors see on the site, and what search engines are told. Leave a box empty to keep
          the value the site was set up with — the greyed-out text shows what that is.
        </p>
      </div>

      {/* The only confirmation that anything happened, announced as well as shown. */}
      <p aria-live="polite" className="sr-only">
        {result ? (result.ok ? result.message : result.error) : ""}
      </p>
      {result && (
        <p
          aria-hidden="true"
          className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}
        >
          {result.ok ? result.message : result.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {text("Phone", phone, setPhone, fallback.phone)}
        {text("Email", email, setEmail, fallback.email)}
      </div>
      <p className="text-muted-foreground -mt-2 text-xs">
        Booking and enquiry notifications are sent to this address, so a typo here means you stop
        hearing about new customers.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {text("Street", street, setStreet, fallback.address.street)}
        {text("City", city, setCity, fallback.address.city)}
        {text("Province or state", state, setState, fallback.address.state)}
        {text("Postal code", zip, setZip, fallback.address.zip)}
        {text("Country", country, setCountry, fallback.address.country)}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-foreground text-sm font-medium">Opening hours</h3>
        <p className="text-muted-foreground text-xs">
          Times as 24-hour, like 09:00. Clear both boxes for a day you are closed — it is then left
          out of the site and out of what search engines are told, rather than shown as closed.
        </p>
        <ul className="flex flex-col gap-2">
          {hours.map((row) => (
            <li key={row.day} className="flex flex-wrap items-center gap-2">
              <span className="text-foreground w-24 shrink-0 text-sm">
                {DAY_LABEL[row.day] ?? row.day}
              </span>
              <input
                aria-label={`${DAY_LABEL[row.day] ?? row.day} opens`}
                className={`${FIELD} w-28`}
                value={row.opens}
                placeholder="09:00"
                onChange={(e) => setDay(row.day, { opens: e.target.value })}
              />
              <span className="text-muted-foreground text-sm">to</span>
              <input
                aria-label={`${DAY_LABEL[row.day] ?? row.day} closes`}
                className={`${FIELD} w-28`}
                value={row.closes}
                placeholder="17:00"
                onChange={(e) => setDay(row.day, { closes: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDay(row.day, { opens: "", closes: "" })}
                disabled={pending}
              >
                Closed
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save contact details"}
        </Button>
      </div>
    </section>
  );
}
