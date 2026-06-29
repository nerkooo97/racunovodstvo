import fs from "fs";

const content = fs.readFileSync("scratch/target-chunk.js", "utf8");

console.log("Chunk slice from 1 to 4100:");
console.log(content.slice(1, 4100));
