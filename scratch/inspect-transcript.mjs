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
    try {
      const step = JSON.parse(line);
      console.log(`Line ${linesCount}: source=${step.source}, type=${step.type}, status=${step.status}, length=${step.content?.length || 0}`);
      if (step.content && step.content.length > 50000) {
        console.log(`  -> Found massive content! Snippet:`, step.content.slice(0, 200));
        fs.writeFileSync("scratch/javni-prihodi-massive.html", step.content);
        console.log("  -> Saved massive content to scratch/javni-prihodi-massive.html");
      }
    } catch (e) {
      console.log(`Line ${linesCount}: JSON error: ${e.message}`);
    }
  }
  console.log(`Total lines: ${linesCount}`);
}

run();
