import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");

// 1. Pronađimo sve uplatne račune koji se pominju u HTML-u
const accRegex = /\b\d{3}-\d{3}-\d{8}-\d{2}\b/g;
const accounts = Array.from(new Set(html.match(accRegex) || []));
console.log(`Found ${accounts.length} unique accounts:`);
console.log(accounts.slice(0, 40));

// 2. Provjerimo da li su općinski računi negdje u Next.js payload-u kao JSON
// Pretražimo sve Next.js payload chunkove
const regex = /self\.__next_f\.push\(\[\d+,\s*"([\s\S]*?)"\]\)/g;
let match;
let payload = "";
while ((match = regex.exec(html)) !== null) {
  payload += match[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

// Sačuvajmo payload za dublju pretragu
fs.writeFileSync("scratch/live-payload.txt", payload);
console.log("Payload length:", payload.length);

// Tražimo ključne riječi u payload-u
const opcineMatch = payload.match(/"opcine"\s*:\s*(\[[\s\S]*?\])/i);
if (opcineMatch) {
  console.log("Found 'opcine' list in payload!");
  fs.writeFileSync("scratch/opcine-payload.json", opcineMatch[1]);
  console.log("Saved opcine payload to scratch/opcine-payload.json");
} else {
  // Možda su samo nanizani objekti, hajde da pretražimo sve objekte koji sadrže šifru opštine i žiro račun
  // Npr. "Centar" ili "077"
  const idx = payload.indexOf("Stari Grad");
  if (idx !== -1) {
    console.log("Snippet around 'Stari Grad' in payload:");
    console.log(payload.slice(idx - 100, idx + 300));
  }
}
