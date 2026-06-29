import fs from "fs";
import readline from "readline";

async function run() {
  const fileStream = fs.createReadStream("/Users/nermin.karic/.gemini/antigravity-ide/brain/33646aa7-6635-4a58-97f7-2a9509540068/.system_generated/logs/transcript_full.jsonl");

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let userHtml = "";
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const step = JSON.parse(line);
      // Tražimo poslednju USER poruku koja sadrži <!DOCTYPE html> i naslov "Uplatni računi"
      if (step.source === "USER_EXPLICIT" || step.type === "USER_INPUT") {
        const text = step.content || "";
        if (text.includes("Uplatni računi javnih prihoda FBiH")) {
          // Našli smo!
          // U Next.js logovima sadržaj može biti unutar step.content
          userHtml = text;
        }
      }
    } catch (e) {
      // Ignorišemo greške parsiranja linija
    }
  }

  if (userHtml) {
    // Izvlačimo sam HTML dio (počevši od <!DOCTYPE html> ili slično)
    const idx = userHtml.indexOf("<!DOCTYPE html>");
    if (idx !== -1) {
      const htmlOnly = userHtml.substring(idx);
      fs.writeFileSync("scratch/javni-prihodi-user.html", htmlOnly);
      console.log("Successfully extracted HTML to scratch/javni-prihodi-user.html. Size:", htmlOnly.length);
    } else {
      fs.writeFileSync("scratch/javni-prihodi-user.html", userHtml);
      console.log("Wrote full text (no <!DOCTYPE html> found). Size:", userHtml.length);
    }
  } else {
    console.error("Could not find the public revenues message in transcript_full.jsonl!");
  }
}

run();
