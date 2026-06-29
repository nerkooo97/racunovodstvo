import fs from "fs";

const html = fs.readFileSync("scratch/javni-prihodi-user.html", "utf8");
console.log("HTML Length:", html.length);
console.log("\nLast 500 characters of user HTML:");
console.log(html.slice(-500));
