import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");

const idx = html.indexOf('id="opcina-109"');
if (idx !== -1) {
  console.log("Excerpt around id=\"opcina-109\":");
  console.log(html.slice(idx, idx + 1000));
} else {
  console.log("Could not find id=\"opcina-109\"");
}
