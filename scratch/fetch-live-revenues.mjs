import fs from "fs";

async function run() {
  console.log("Fetching live public revenues...");
  const res = await fetch("https://poreznikalkulator.ba/javni-prihodi");
  const html = await res.text();
  console.log("Live HTML Length:", html.length);
  
  // Provjerimo da li unutra ima DefinedTermSet
  const idx = html.indexOf("Šifre vrsta prihoda FBiH");
  console.log("Found 'Šifre vrsta prihoda FBiH' at index:", idx);
  
  // Sačuvajmo live HTML
  fs.writeFileSync("scratch/javni-prihodi-live.html", html);
  console.log("Saved live HTML to scratch/javni-prihodi-live.html");
}

run();
