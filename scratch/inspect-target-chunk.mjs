import fs from "fs";

const content = fs.readFileSync("scratch/target-chunk.js", "utf8");

const terms = ["FEDERALNI_RACUNI", "KANTONALNI_BUDZETI", "KANTONALNI_ZZO", "KANTONALNE_SLUZBE_ZAPOSLJAVANJE"];

for (const term of terms) {
  const idx = content.indexOf(term);
  if (idx !== -1) {
    console.log(`\nExcerpt around target term '${term}':`);
    console.log(content.slice(Math.max(0, idx - 100), idx + 800));
  } else {
    console.log(`Could not find term '${term}'`);
  }
}
