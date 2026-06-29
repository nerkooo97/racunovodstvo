/** Formatiranje ćelija za službeni obrazac šihterice (FBiH). */

export function formatOfficialDate(dateKey: string, dayName: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}.${m}.${y}. ${dayName}`;
}

export function formatBreakTime(minutes: number | null | undefined): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function formatHourValue(h: number): string {
  if (h <= 0) return "";
  const rounded = Math.round(h * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace(".", ",");
}

/** Šifra neprisustva: 9.1 → 1 */
export function officialAbsenceNumber(code: string): string {
  return code.replace(/^9\./, "");
}

/** Kolona 9: samo vrijeme neprisustva (sati); šifra vrste ide u napomenu / ručni unos. */
export function formatAbsenceCell(hours: number, code: string): string {
  if (!code) return "";
  if (hours > 0) return formatHourValue(hours);
  return officialAbsenceNumber(code);
}

/** Kolona 10: prekovremeni = oznaka 2 */
export function formatOtherCell(overtimeHours: number, note: string): string {
  if (overtimeHours > 0) return `${formatHourValue(overtimeHours)} 2`;
  return note.trim();
}

export function monthPeriodLabel(monthName: string, month: number, year: number): string {
  return `${monthName} (${String(month).padStart(2, "0")}) ${year}`;
}

export const SIHTERICA_NAPOMENA = `- U kolonu 9) Vrijeme neprisustva na poslu, potrebno je evidentirati vrijeme neprisustva i oznaku (broj) vrste neprisustva:
1 - vrijeme korištenja odmora (sedmičnog i godišnjeg),
2 - vrijeme za dane u koje se ne radi i praznike utvrđene posebnim propisom,
3 - vrijeme spriječenosti za rad zbog privremene nesposobnosti za rad,
4 - vrijeme porođajnog odsustva, roditeljskih dopusta, mirovanja radnog odnosa ili korištenja drugih prava u skladu s posebnim propisom,
5 - vrijeme plaćenog odsustva,
6 - vrijeme neplaćenog odsustva,
7 - vrijeme neprisutnosti u toku dnevnog rasporeda radnog vremena po zahtjevu radnika,
8 - vrijeme neprisutnosti u toku dnevnog rasporeda radnog vremena u kojima radnik svojom krivnjom ne obavlja ugovorene poslove,
9 - vrijeme provedeno u štrajku,
10 - vrijeme isključenja s rada (lockout).
- U kolonu 10) Ostali podaci o radnom vremenu, potrebno je evidentirati vrijeme i oznaku (broj) za sljedeće podatke:
1 - noćni rad,
2 - prekovremeni rad,
3 - smjenski rad,
4 - dvokratni rad,
5 - rad u dane praznika
6 - neradnih dana utvrđene posebnim propisom
7 - drugo_____________`;
