"use client";

import { useRouter } from "next/navigation";

interface YearSelectProps {
  value: string;
  basePath: string;
  extraParams?: Record<string, string>;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export function YearSelect({ value, basePath, extraParams = {} }: YearSelectProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const y = e.target.value;
    const params = new URLSearchParams(extraParams);
    if (y) params.set("year", y);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <select
      className="border rounded-md px-3 py-1.5 text-sm bg-background"
      value={value}
      onChange={handleChange}
    >
      <option value="">Sve godine</option>
      {YEARS.map((y) => (
        <option key={y} value={String(y)}>
          {y}
        </option>
      ))}
    </select>
  );
}
