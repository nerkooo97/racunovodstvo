import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi.html", "utf8");

// Next.js chunks se šalju kao self.__next_f.push([1, "sadržaj"]) ili slično
// Prikupimo sve stringove unutar push() poziva
const regex = /self\.__next_f\.push\(\[\d+,\s*"([\s\S]*?)"\]\)/g;
let match;
let fullText = "";

while ((match = regex.exec(html)) !== null) {
  // Dekodiramo string (Next.js eskejpira navodnike i nove redove)
  let content = match[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
  fullText += content;
}

fs.writeFileSync("scratch/next-payload.txt", fullText);
console.log(`Reconstructed payload. Length: ${fullText.length}`);

// Tražimo sve što izgleda kao žiro račun u celom rekonstruisanom tekstu
// Format žiro računa u BiH može imati crtice, npr. 123-456-78901234-56 ili 1234567890123456
const accountRegex = /\b\d{3}-\d{3,10}-\d{6,10}-\d{2}\b/g;
const accounts = Array.from(new Set(fullText.match(accountRegex) || []));
console.log(`Found ${accounts.length} unique accounts in reconstructed payload:`);
console.log(accounts);

// Provjerimo da li možemo naći neke opštine
const opcinaKeywords = ["Sarajevo", "Ilidža", "Novi Grad", "Tuzla", "Zenica", "Mostar"];
for (const kw of opcinaKeywords) {
  const count = (fullText.match(new RegExp(kw, "gi")) || []).length;
  console.log(`Payload keyword "${kw}" count: ${count}`);
}

// Hajde da vidimo ima li JSON nizova sa opštinskim ili kantonalnim računima
// Ponekad su definisani kao objekat sa ključevima "opcine" ili "racuni"
const idx = fullText.indexOf("Sarajevo Centar");
if (idx !== -1) {
  console.log("\nExcerpt around 'Sarajevo Centar':");
  console.log(fullText.slice(Math.max(0, idx - 200), idx + 400));
}
