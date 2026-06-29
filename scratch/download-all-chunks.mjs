import fs from "fs";
import https from "https";
import path from "path";

// Kreiramo folder za chunkove ako ne postoji
const chunksDir = "scratch/chunks";
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
}

// Funkcija za preuzimanje URL-a kao teksta
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => { resolve(data); });
      res.on("error", (err) => { reject(err); });
    });
  });
}

// Funkcija za preuzimanje i čuvanje fajla
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, (res) => {
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
      file.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  });
}

async function main() {
  const allChunkPaths = new Set();

  // 1. Ekstrakcija iz javni-prihodi-live.html
  if (fs.existsSync("scratch/javni-prihodi-live.html")) {
    const html1 = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");
    const regex = /\/_next\/static\/chunks\/[a-zA-Z0-9_~\-\/]+\.js/g;
    (html1.match(regex) || []).forEach(p => allChunkPaths.add(p));
  }

  // 2. Preuzimanje HTML-a sa prijave-radnika i ekstrakcija
  console.log("Fetching HTML of https://www.poreznikalkulator.ba/prijave-radnika...");
  try {
    const html2 = await fetchText("https://www.poreznikalkulator.ba/prijave-radnika");
    fs.writeFileSync("scratch/prijave-radnika.html", html2);
    const regex = /\/_next\/static\/chunks\/[a-zA-Z0-9_~\-\/]+\.js/g;
    (html2.match(regex) || []).forEach(p => allChunkPaths.add(p));
  } catch (e) {
    console.error("Failed to fetch /prijave-radnika page HTML:", e.message);
  }

  console.log(`\nFound ${allChunkPaths.size} unique JS chunks to download.`);

  for (const chunkPath of allChunkPaths) {
    const url = `https://www.poreznikalkulator.ba${chunkPath}`;
    const filename = path.basename(chunkPath);
    const dest = path.join(chunksDir, filename);
    
    console.log(`Downloading: ${url} -> ${dest}`);
    try {
      await downloadFile(url, dest);
    } catch (e) {
      console.error(`Failed to download ${url}:`, e.message);
    }
  }

  console.log("\nFinished downloading all chunks!");
}

main();
