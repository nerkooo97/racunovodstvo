import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");

// Tražimo pojavljivanje kantonalnog računa, npr. ZZO Tuzlanski kanton koji smo vidjeli u cantonal-accounts.ts
// Broj računa: 338-440-22124691-66
const idx = html.indexOf("338-440-22124691-66");
if (idx !== -1) {
  console.log("Excerpt around ZZO Tuzla account:");
  console.log(html.slice(idx - 400, idx + 400));
} else {
  console.log("Could not find ZZO Tuzla account in HTML, trying to search for Tuzlanski kanton occurrences");
  let idxTk = html.indexOf("Tuzlanski kanton");
  while (idxTk !== -1) {
    console.log(`TK found at: ${idxTk}`);
    console.log(html.slice(idxTk - 100, idxTk + 400));
    idxTk = html.indexOf("Tuzlanski kanton", idxTk + 1);
  }
}
