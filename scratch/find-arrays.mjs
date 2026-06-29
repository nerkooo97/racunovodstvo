import fs from "fs";

const content = fs.readFileSync("scratch/target-chunk.js", "utf8");

// Ispisujemo veći dio fajla poslije definicije bankovnih računa
console.log("Chunk slice from 4100 to 12000:");
console.log(content.slice(4100, 12000));
