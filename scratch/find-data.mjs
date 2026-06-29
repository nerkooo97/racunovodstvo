import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi.html", "utf8");

// Tražimo formate žiro računa u BiH (npr. 123-456-78901234-56 ili 123-456-7890123456-78 ili 102-050-00001066-98)
const accountRegex = /\b\d{3}-\d{3}-\d{8}-\d{2}\b/g;
const accounts = Array.from(new Set(html.match(accountRegex) || []));
console.log(`Found ${accounts.length} unique bank account numbers in HTML:`);
console.log(accounts.slice(0, 15));

// Tražimo nazive opština ili šifre opština
// Npr. "Stari Grad" ili "Centar" ili "077"
console.log("\nSearching for Sarajevo or Tuzla occurrences...");
const keywords = ["Stari Grad", "Tuzla", "077", "094", "Centar"];
for (const kw of keywords) {
  const count = (html.match(new RegExp(kw, "gi")) || []).length;
  console.log(`Keyword "${kw}" count: ${count}`);
}

// Hajde da ispišemo dijelove HTML-a oko nekog poznatog općinskog računa ili koda
// Npr. Stari Grad kod je 077
const idx = html.indexOf("077");
if (idx !== -1) {
  console.log("\nExcerpt around '077':");
  console.log(html.slice(Math.max(0, idx - 150), idx + 250));
}

// Pogledajmo i da li postoji neki ugrađeni JSON sa općinama
// Obično Next.js prosleđuje listu općina ili računa kao JSON objekat.
const jsonRegex = /"opcine"\s*:\s*(\[[\s\S]*?\])/i;
const jsonMatch = html.match(jsonRegex);
if (jsonMatch) {
  console.log("\nFound 'opcine' JSON array!");
  console.log(jsonMatch[1].slice(0, 300) + "...");
} else {
  console.log("\nNo direct 'opcine' JSON match.");
}
