import fs from "fs";
import https from "https";

const html = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");

// Tražimo sve Next.js chunkove u HTML-u
// Npr. /_next/static/chunks/38875-...js ili slično
const chunkRegex = /\/_next\/static\/chunks\/[a-zA-Z0-9_~\-]+\.js/g;
const chunks = Array.from(new Set(html.match(chunkRegex) || []));
console.log(`Found ${chunks.length} chunks to inspect.`);

// Funkcija za preuzimanje fajla preko https
function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => { resolve(data); });
      res.on("error", (err) => { reject(err); });
    });
  });
}

async function run() {
  for (const chunkPath of chunks) {
    const url = `https://www.poreznikalkulator.ba${chunkPath}`;
    console.log(`Downloading and inspecting: ${url}`);
    try {
      const content = await downloadUrl(url);
      
      // Pretražujemo da li ovaj chunk sadrži neku od šifri uplatnih računa
      // Npr. zdravstveni kanton Sarajevo: 141-196-22090081-13 ili 1411962209008113
      // Ili PIO račun: 102-050-00001066-98
      if (content.includes("102-050-00001066-98") || content.includes("1020500000106698") || 
          content.includes("FEDERALNI_RACUNI") || content.includes("KANTONALNI_BUDZETI")) {
        console.log(`\n>>> FOUND TARGET MODULE IN CHUNK: ${chunkPath} <<<`);
        
        // Sačuvajmo ovaj chunk
        fs.writeFileSync("scratch/target-chunk.js", content);
        console.log("Saved target chunk to scratch/target-chunk.js");
        
        // Hajde da pretražimo sve brojeve računa u njemu
        const accountsRegex = /\b\d{3}-\d{3}-\d{8}-\d{2}\b/g;
        const foundAccs = Array.from(new Set(content.match(accountsRegex) || []));
        console.log(`Found ${foundAccs.length} accounts in this chunk:`);
        console.log(foundAccs);
        return;
      }
    } catch (e) {
      console.error(`Failed to download ${url}:`, e.message);
    }
  }
  console.log("Finished searching chunks. Target module not found in downloaded chunks.");
}

run();
