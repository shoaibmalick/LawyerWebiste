"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

/**
 * DayPicker wearing this project's tokens.
 *
 * The library's own stylesheet is deliberately not imported: it ships its own
 * colours and spacing, which would make this the one component whose look came
 * from somewhere other than the theme. Everything below is expressed in the
 * same utilities the rest of the UI uses, so a client changing their palette in
 * config/theme.config.ts changes the calendar with it.
 */
export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const navButton = cn(
    "text-muted-foreground hover:text-foreground hover:bg-secondary",
    "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
    "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-40",
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-foreground text-sm font-semibold",
        nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
        button_previous: navButton,
        button_next: navButton,
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 sm:w-10 text-center text-xs font-medium uppercase",
        week: "mt-1 flex w-full",
        day: "p-0 text-center",
        // 36px on a phone, 40px from `sm`. Seven columns of 40px is 280px, and
        // a 360px screen has 264px inside the booking card's padding — so the
        // full-size grid pushed the whole page into horizontal scroll on any
        // viewport under 376px. Seven 36px columns is 252px, which fits with
        // room to spare.
        //
        // 36px is below the 44px touch-target guideline and deliberately so:
        // 44px × 7 needs 308px of grid before any card padding, which a 360px
        // screen does not have. It clears the WCAG 2.2 AA minimum (24px)
        // comfortably. A calendar that scrolls sideways is the worse failure.
        day_button: cn(
          "text-foreground size-9 sm:size-10 rounded-lg text-sm transition-colors",
          "hover:bg-secondary focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
          // A day with no openings is not merely dimmed — it is not a target.
          "disabled:pointer-events-none disabled:opacity-30",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        // Ring rather than fill, so today never reads as "already chosen".
        today: "[&>button]:ring-border [&>button]:ring-1",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
        disabled: "opacity-30",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft aria-hidden className="size-4" {...rest} />
          ) : (
            <ChevronRight aria-hidden className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
