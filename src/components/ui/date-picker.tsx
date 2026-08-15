import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BANGLADESH_TIME_ZONE,
  bangladeshDateTimeToUtc,
  formatYmd,
  getBangladeshParts,
  parseYmd,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

function formatPickerLabel(value: string) {
  const { year, month, day } = parseYmd(value);

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? bangladeshDateTimeToUtc(value, "12:00") : undefined;
  const today = getBangladeshParts();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        render={
          <Button
            type="button"
            variant="outline"
            data-empty={!selected}
            className={cn(
              "w-full justify-between font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        {value ? formatPickerLabel(value) : placeholder}
        <ChevronDownIcon />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          timeZone={BANGLADESH_TIME_ZONE}
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(today.year, 0)}
          endMonth={new Date(today.year + 2, 11)}
          onSelect={(date) => {
            if (!date) {
              return;
            }

            onChange(formatYmd(getBangladeshParts(date)));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
