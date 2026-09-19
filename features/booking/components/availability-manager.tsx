"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Service } from "@/config/schema/content.schema";
import {
  deleteAvailabilityAction,
  generateAvailabilityAction,
  type AvailabilityActionResult,
} from "../api/manage-availability";

type UpcomingSlot = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  activeBookings: number;
};

type AvailabilityManagerProps = {
  services: Service[];
  slots: UpcomingSlot[];
  timezone: string;
};

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function AvailabilityManager({ services, slots, timezone }: AvailabilityManagerProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AvailabilityActionResult | null>(null);

  // Default to the longest service so every service is bookable into what this
  // generates; a shorter slot silently excludes the treatments that don't fit.
  const longestService = Math.max(...services.map((service) => service.durationMinutes));
  const [slotMinutes, setSlotMinutes] = useState(longestService);
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(plusDaysIso(28));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [times, setTimes] = useState<string[]>(["09:00", "10:00", "11:00", "13:00", "14:00"]);
  const [capacity, setCapacity] = useState(1);
  const [newTime, setNewTime] = useState("");

  const dayCount = countMatchingDays(from, to, weekdays);
  const projected = dayCount * times.length;
  const excluded = services.filter((service) => service.durationMinutes > slotMinutes);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function onGenerate() {
    setResult(null);
    startTransition(async () => {
      const outcome = await generateAvailabilityAction({
        from,
        to,
        weekdays,
        times,
        slotMinutes,
        capacity,
      });
      setResult(outcome);
    });
  }

  function onDelete(slotId: string) {
    setResult(null);
    startTransition(async () => {
      setResult(await deleteAvailabilityAction({ slotId }));
    });
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="border-border flex flex-col gap-5 rounded-lg border p-5">
        <div>
          <h2 className="text-foreground text-lg font-medium">Add availability</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Times are {timezone.replace("_", " ")} local. Generating a range you already have is
            safe — existing slots are skipped, never duplicated.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground font-medium">Appointment length</span>
            <select
              value={slotMinutes}
              onChange={(event) => setSlotMinutes(Number(event.target.value))}
              className="border-border rounded-md border px-3 py-2"
            >
              {[15, 20, 30, 45, 60, 90, 120].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground font-medium">From</span>
            <input
              type="date"
              value={from}
              min={todayIso()}
              onChange={(event) => setFrom(event.target.value)}
              className="border-border rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground font-medium">To</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className="border-border rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground font-medium">Capacity per slot</span>
            <input
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(event) => setCapacity(Math.max(1, Number(event.target.value) || 1))}
              className="border-border w-28 rounded-md border px-3 py-2"
            />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-foreground mb-2 text-sm font-medium">Days of the week</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <label
                key={day.value}
                className="border-border flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={weekdays.includes(day.value)}
                  onChange={() => setWeekdays((current) => toggle(current, day.value))}
                />
                {day.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-foreground mb-2 text-sm font-medium">Start times</legend>
          <div className="flex flex-wrap items-center gap-2">
            {times.map((time) => (
              <span
                key={time}
                className="border-border flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                {time}
                {/* A bare "×" was roughly a 10px target — the smallest thing
                    on the site. icon-sm plus the primitive's coarse-pointer
                    minimum makes it 44px under a thumb. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setTimes((current) => current.filter((t) => t !== time))}
                  className="text-destructive"
                  aria-label={`Remove ${time}`}
                >
                  ×
                </Button>
              </span>
            ))}
            <input
              type="time"
              value={newTime}
              onChange={(event) => setNewTime(event.target.value)}
              className="border-border rounded-md border px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!newTime || times.includes(newTime)) return;
                setTimes((current) => [...current, newTime].sort());
                setNewTime("");
              }}
            >
              Add time
            </Button>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" onClick={onGenerate} disabled={pending || projected === 0}>
            {pending ? "Working…" : "Add these slots"}
          </Button>
          <p className="text-muted-foreground text-sm">
            {projected === 0
              ? "Nothing selected yet."
              : `Will create up to ${projected} slots (${dayCount} days × ${times.length} times).`}
          </p>
        </div>

        {excluded.length > 0 && (
          <p className="text-muted-foreground text-sm">
            At {slotMinutes} minutes, these can&apos;t be booked into these slots:{" "}
            {excluded.map((service) => service.name).join(", ")}.
          </p>
        )}

        {result && (
          <p className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}>
            {result.ok ? result.message : result.error}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-medium">
          Upcoming slots{" "}
          <span className="text-muted-foreground text-sm font-normal">({slots.length})</span>
        </h2>

        {slots.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No upcoming availability — the booking calendar on the site is empty until you add some.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="text-foreground font-medium">
                    {formatter.format(slot.startsAt)}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000)} min
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {slot.activeBookings} of {slot.capacity} booked
                  </p>
                </div>
                {slot.activeBookings > 0 ? (
                  <span className="text-muted-foreground">Booked</span>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(slot.id)}
                    disabled={pending}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** How many days in [from, to] fall on one of the selected weekdays. */
function countMatchingDays(from: string, to: string, weekdays: number[]): number {
  if (!from || !to || from > to || weekdays.length === 0) return 0;

  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;

  const wanted = new Set(weekdays);
  let count = 0;
  for (let t = start; t <= end; t += 86_400_000) {
    if (wanted.has(new Date(t).getUTCDay())) count += 1;
  }
  return count;
}
