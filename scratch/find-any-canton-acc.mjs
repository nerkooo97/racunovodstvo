import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");

// Tražimo gde se spominje "Kanton Sarajevo"
let pos = 0;
while (true) {
  const idx = html.indexOf("Kanton Sarajevo", pos);
  if (idx === -1) break;
  console.log(`\nFound 'Kanton Sarajevo' at index ${idx}:`);
  console.log(html.slice(idx - 100, idx + 400));
  pos = idx + 1;
}

// Tražimo uplatne račune koji počinju sa 141 (BBI banka, često za Sarajevo)
const regexBbi = /141-\d{3}-\d{8}-\d{2}/g;
console.log("\nSearching for accounts starting with 141:");
console.log(html.match(regexBbi));
