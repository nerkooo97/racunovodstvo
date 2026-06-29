import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi-live.html", "utf8");

// Tražimo sve stringove koji liče na API pozive ili JSON fajlove
const paths = html.match(/"\/[^"]+?\.(?:json|js)"/g) || [];
console.log("JSON/JS paths in HTML:");
console.log(Array.from(new Set(paths)).slice(0, 50));

// Tražimo sve /api/ pozive
const apiCalls = html.match(/"\/api\/[^"]+?"/g) || [];
console.log("\nAPI calls in HTML:");
console.log(Array.from(new Set(apiCalls)));
