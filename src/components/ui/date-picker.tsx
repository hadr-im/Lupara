import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Parse an ISO "YYYY-MM-DD" string into a *local* Date (no timezone shift). */
function parseISODate(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Format a Date back into a local "YYYY-MM-DD" string. */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type DatePickerProps = {
  /** ISO date string, e.g. "2025-10-24" */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Constrain selectable range */
  fromYear?: number;
  toYear?: number;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  fromYear = 2000,
  toYear = 2035,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseISODate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {selected ? format(selected, "dd MMM yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          defaultMonth={selected}
          selected={selected}
          onSelect={(date) => {
            if (date) onChange(toISODate(date));
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
