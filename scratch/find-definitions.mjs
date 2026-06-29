import fs from "fs";

const content = fs.readFileSync("scratch/target-chunk.js", "utf8");

// Tražimo definicije promenljivih unutar modula
// Pošto se radi o minifikovanom kodu, obično su u obliku `let n = "..."`, `let e = "..."`, `let i = "..."`, `let d = "..."`, `let m = [...]`, `let v = [...]`, `let u = [...]`, `let s = [...]`
// Potražimo tekst koji sadrži definiciju uplatnih računa
const searchTerms = [
  '="102-050-00001066-98"',
  '="102-050-00000640-18"',
  '="161-000-00285700-03"',
  '="338-690-22963585-21"'
];

for (const term of searchTerms) {
  const idx = content.indexOf(term);
  if (idx !== -1) {
    console.log(`\nFound definition for '${term}' at index ${idx}:`);
    console.log(content.slice(idx - 100, idx + 400));
  } else {
    console.log(`Could not find definition for '${term}'`);
  }
}
