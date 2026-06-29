import fs from "fs";
import readline from "readline";

async function run() {
  const fileStream = fs.createReadStream("/Users/nermin.karic/.gemini/antigravity-ide/brain/33646aa7-6635-4a58-97f7-2a9509540068/.system_generated/logs/transcript_full.jsonl");

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let linesCount = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    linesCount++;
    if (linesCount === 1563) {
      try {
        const step = JSON.parse(line);
        const text = step.content || "";
        // Nađimo početak HTML-a
        const idx = text.indexOf("<!DOCTYPE html>");
        if (idx !== -1) {
          const htmlOnly = text.substring(idx);
          fs.writeFileSync("scratch/javni-prihodi-user.html", htmlOnly);
          console.log(`Successfully saved HTML from line 1563. Size: ${htmlOnly.length}`);
        } else {
          fs.writeFileSync("scratch/javni-prihodi-user.html", text);
          console.log(`Saved raw text from line 1563. Size: ${text.length}`);
        }
      } catch (e) {
        console.error("JSON parsing error on line 1563:", e);
      }
      break;
    }
  }
}

run();
