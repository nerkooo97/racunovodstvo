import fs from "fs";
import path from "path";

const chunksDir = "scratch/chunks";
const files = fs.readdirSync(chunksDir);

const keywords = ["koeficijent", "licni_odbitak", "bruto", "neto", "obracun", "doprinos", "faktor", "topli_obrok", "prevoz", "minuli_rad"];

console.log("Analyzing downloaded chunks for keywords:");
for (const file of files) {
  if (!file.endsWith(".js")) continue;
  const filePath = path.join(chunksDir, file);
  const size = fs.statSync(filePath).size;
  const content = fs.readFileSync(filePath, "utf8");
  
  const foundKeywords = [];
  for (const kw of keywords) {
    if (content.toLowerCase().includes(kw)) {
      foundKeywords.push(kw);
    }
  }
  
  if (foundKeywords.length > 0) {
    console.log(`- ${file} (${(size / 1024).toFixed(1)} KB): matches [${foundKeywords.join(", ")}]`);
  }
}
