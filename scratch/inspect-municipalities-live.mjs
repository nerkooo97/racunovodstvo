import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");

// Tražimo sve trocifrene šifre općina i njihove nazive
// Npr. "Sarajevo Centar = 077" ili slično
// Istražimo da li postoji niz sa svim opštinama
const searchTerms = ["Stari Grad", "Centar", "Novo Sarajevo", "Ilidža", "Tuzla", "Zenica", "Mostar"];
console.log("Searching occurrences of municipalities in live HTML:");
for (const term of searchTerms) {
  const indices = [];
  let idx = html.indexOf(term);
  while (idx !== -1) {
    indices.push(idx);
    idx = html.indexOf(term, idx + 1);
  }
  console.log(`- "${term}": found ${indices.length} times`);
  if (indices.length > 0) {
    console.log(`  -> Excerpt around first match:`);
    console.log(html.slice(Math.max(0, indices[0] - 100), indices[0] + 250));
  }
}
