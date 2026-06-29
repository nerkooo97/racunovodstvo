import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");

// Fleksibilan regex za uplatne račune u BiH (obično 16 cifara, mogu imati 2 ili 3 crtice)
const accountRegex = /\b\d{3}[-\s]?\d{3}[-\s]?\d{6,10}[-\s]?\d{2}\b/g;
const accounts = Array.from(new Set(html.match(accountRegex) || []));
console.log(`Found ${accounts.length} potential accounts:`);
console.log(accounts.slice(0, 50));

// Tražimo primere gde se spominju reči "Zavod zdravstvenog" ili "ZZO" ili "služba zapošljavanja"
const healthTerms = ["zdravstven", "ZZO", "zapošlja", "nezaposlen"];
for (const term of healthTerms) {
  const count = (html.match(new RegExp(term, "gi")) || []).length;
  console.log(`Term "${term}" count: ${count}`);
}

// Ispišimo deo HTML-a oko prvih nekoliko pojava reči "zdravstven"
const idx = html.indexOf("zdravstven");
if (idx !== -1) {
  console.log("\nExcerpt around 'zdravstven':");
  console.log(html.slice(idx - 100, idx + 400));
}
