import fs from "fs";

// Učitavamo sirovi JS fajl koji nam je korisnik obezbedio
const jsCode = fs.readFileSync("scratch/javni-prihodi.js", "utf8");

// Pomoćna funkcija za izvlačenje niza/objekta koji počinje sa let X = [ i završava se sa ];
function extractArray(varName) {
  const startPattern = new RegExp(`(?:let|,|const|var)\\s+${varName}\\s*=\\s*\\[`);
  const match = jsCode.match(startPattern);
  if (!match) {
    console.error(`Could not find start of variable: ${varName}`);
    return null;
  }

  const startIndex = match.index + match[0].length - 1; // Pozicija otvarajuće uglaste zagrade '['
  
  // Brojimo otvorene i zatvorene zagrade da bismo našli kraj niza
  let braceCount = 0;
  let inString = false;
  let stringChar = "";
  let i = startIndex;

  for (; i < jsCode.length; i++) {
    const char = jsCode[i];
    
    // Rukovanje stringovima da ne bismo brojali zagrade unutar stringova
    if ((char === '"' || char === "'") && jsCode[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      if (char === '[') {
        braceCount++;
      } else if (char === ']') {
        braceCount--;
        if (braceCount === 0) {
          break;
        }
      }
    }
  }

  const arrayString = jsCode.substring(startIndex, i + 1);
  
  // Pretvaramo neformalni JS kod (bez navodnika oko ključeva itd.) u čist JSON
  // Najlakši način u Node.js je da pokrenemo eval unutar bezbednog konteksta
  try {
    const fn = new Function(`return ${arrayString};`);
    return fn();
  } catch (e) {
    console.error(`Failed to eval extracted string for ${varName}:`, e.message);
    return null;
  }
}

// 1. Izvlačimo vrste prihoda 'r'
const vrstePrihoda = extractArray("r");
if (vrstePrihoda) {
  console.log(`Successfully extracted ${vrstePrihoda.length} revenue groups (r)`);
  // Ravan niz svih pojedinačnih šifri vrsta prihoda
  const flatVrstePrihoda = [];
  for (const group of vrstePrihoda) {
    for (const item of group.items) {
      flatVrstePrihoda.push({
        code: item.code,
        name: item.name,
        categoryCode: group.code,
        categoryName: group.name,
        section: item.section || ""
      });
    }
  }
  flatVrstePrihoda.sort((a, b) => a.code.localeCompare(b.code));
  fs.writeFileSync("lib/constants/vrste-prihoda.json", JSON.stringify(flatVrstePrihoda, null, 2));
  console.log(`Saved ${flatVrstePrihoda.length} revenue codes to lib/constants/vrste-prihoda.json`);
}

// 2. Izvlačimo općine po kantonima 'd'
const kantoniOpcine = extractArray("d");
if (kantoniOpcine) {
  console.log(`Successfully extracted ${kantoniOpcine.length} cantons (d)`);
  // Ravan niz svih općina za lakše pretraživanje i uvoz
  const flatOpcine = [];
  for (const k of kantoniOpcine) {
    for (const o of k.opcine) {
      flatOpcine.push({
        name: o.name,
        code: o.kod,
        postalCode: o.postalCode || "",
        bankName: o.banka || "",
        // Neke opštine imaju više računa, uzimamo prvi ili sve
        accounts: o.racuni || [],
        cantonCode: k.kanton,
        cantonName: k.kantonNaziv
      });
    }
  }
  flatOpcine.sort((a, b) => a.code.localeCompare(b.code));
  fs.writeFileSync("lib/constants/opcine.json", JSON.stringify(flatOpcine, null, 2));
  console.log(`Saved ${flatOpcine.length} municipalities to lib/constants/opcine.json`);
}

// 3. Izvlačimo budžetske organizacije 'o'
const budzetskeOrg = extractArray("o");
if (budzetskeOrg) {
  console.log(`Successfully extracted ${budzetskeOrg.length} budget organizations (o)`);
  fs.writeFileSync("lib/constants/budzetske-organizacije.json", JSON.stringify(budzetskeOrg, null, 2));
  console.log(`Saved ${budzetskeOrg.length} budget organizations to lib/constants/budzetske-organizacije.json`);
}
