import fs from "fs";

async function run() {
  console.log("Fetching activity codes...");
  const res = await fetch("https://poreznikalkulator.ba/sifre-djelatnosti");
  const html = await res.text();

  // Pokušavamo da izvučemo sve "DefinedTerm" objekte direktno iz JSON-a ili teksta
  // Koristimo regex jer Next.js može slati dijelove koda u chunks
  const terms = [];
  const termRegex = /\{"@type":"DefinedTerm"[^}]+?"identifier":"([^"]+?)"[^}]+?"name":"([^"]+?)"/g;
  
  let m;
  while ((m = termRegex.exec(html)) !== null) {
    terms.push({ code: m[1], name: m[2] });
  }

  if (terms.length === 0) {
    // Alternativni regex za Next.js format
    const altRegex = /"identifier":"([^"]+?)"[^}]+?"name":"([^"]+?)"/g;
    while ((m = altRegex.exec(html)) !== null) {
      if (m[1].match(/^\d/)) { // Samo one koje počinju cifrom (šifre)
        terms.push({ code: m[1], name: m[2] });
      }
    }
  }

  if (terms.length > 0) {
    writeCodes(terms);
  } else {
    console.error("Could not extract any activity codes from HTML content.");
  }
}

function writeCodes(codes) {
  const uniqueCodes = [];
  const seen = new Set();
  
  for (const c of codes) {
    const cleanCode = c.code.trim();
    // Čišćenje unicode i html escape karaktera
    let cleanName = c.name
      .replace(/\\u0026/g, "&")
      .replace(/\\u0027/g, "'")
      .replace(/\\u0022/g, '"')
      .replace(/\\u003c/g, "<")
      .replace(/\\u003e/g, ">")
      .replace(/\\u0161/g, "š")
      .replace(/\\u0160/g, "Š")
      .replace(/\\u0107/g, "ć")
      .replace(/\\u0106/g, "Ć")
      .replace(/\\u010d/g, "č")
      .replace(/\\u010c/g, "Č")
      .replace(/\\u0111/g, "đ")
      .replace(/\\u0110/g, "Đ")
      .replace(/\\u017e/g, "ž")
      .replace(/\\u017d/g, "Ž")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
      
    if (cleanCode && cleanName && !seen.has(cleanCode)) {
      seen.add(cleanCode);
      uniqueCodes.push({ code: cleanCode, name: cleanName });
    }
  }

  uniqueCodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  console.log(`Found ${uniqueCodes.length} activity codes.`);

  // 1. Zapisujemo JSON fajl
  fs.writeFileSync("lib/constants/activity-codes.json", JSON.stringify(uniqueCodes, null, 2));
  console.log("Successfully wrote lib/constants/activity-codes.json!");

  // 2. Zapisujemo TS fajl sa uvozom iz JSON-a
  const tsContent = `import activityCodesData from "./activity-codes.json";

export interface ActivityCode {
  code: string;
  name: string;
}

export const activityCodes = activityCodesData as ActivityCode[];

export function searchActivityCodes(query: string): ActivityCode[] {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  return activityCodes.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q)
  ).slice(0, 30); // Limiting suggestions for performance
}
`;

  fs.writeFileSync("lib/constants/activity-codes.ts", tsContent);
  console.log("Successfully wrote lib/constants/activity-codes.ts!");
}

run();
