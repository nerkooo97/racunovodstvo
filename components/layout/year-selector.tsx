"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveYear } from "@/app/actions/year";
import { IconCalendar } from "@tabler/icons-react";

export function YearSelector({ value }: { value: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i);

  return (
    <div className="flex items-center gap-1.5">
      <IconCalendar className="size-3.5 text-muted-foreground shrink-0" />
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => {
          const y = parseInt(e.target.value, 10);
          startTransition(async () => {
            await setActiveYear(y);
            router.refresh();
          });
        }}
        className="h-7 rounded-md border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}.
          </option>
        ))}
      </select>
    </div>
  );
}
