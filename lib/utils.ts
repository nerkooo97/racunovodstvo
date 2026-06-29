import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKM(amount: number | null | undefined): string {
  if (amount == null) return "—"
  return new Intl.NumberFormat("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " KM"
}

/** YYYY-MM-DD bez UTC pomaka (za kalendarne datume) */
export function localDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function localToday(): string {
  const now = new Date()
  return localDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** 1 = ponedjeljak … 7 = nedjelja */
export function localDayOfWeek(year: number, month: number, day: number): number {
  const dow = new Date(year, month - 1, day).getDay()
  return dow === 0 ? 7 : dow
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number)
  return { year, month, day }
}

export function localDayOfWeekFromKey(key: string): number {
  const { year, month, day } = parseDateKey(key)
  return localDayOfWeek(year, month, day)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function formatDateKey(key: string): string {
  const [y, m, d] = key.split("-")
  return `${d}.${m}.${y}`
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—"
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return formatDateKey(date)
  }
  return new Intl.DateTimeFormat("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}
