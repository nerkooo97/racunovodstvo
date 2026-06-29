import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi.html", "utf8");
const regex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

let match;
let index = 1;
while ((match = regex.exec(html)) !== null) {
  const content = match[1].trim();
  try {
    const json = JSON.parse(content);
    console.log(`\n--- JSON-LD #${index} ---`);
    console.log("Type:", json["@type"]);
    console.log("Name:", json.name);
    if (json.hasDefinedTerm) {
      console.log("hasDefinedTerm count:", json.hasDefinedTerm.length);
      console.log("First term:", json.hasDefinedTerm[0]);
    }
    if (json.itemListElement) {
      console.log("itemListElement count:", json.itemListElement.length);
      console.log("First element:", json.itemListElement[0]);
    }
  } catch (e) {
    console.log(`\n--- JSON-LD #${index} (Raw/Invalid JSON) ---`);
    console.log(content.slice(0, 300) + "...");
  }
  index++;
}
