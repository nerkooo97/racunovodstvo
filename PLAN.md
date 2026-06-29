# Kompletni flow, pravila i logika — svi moduli

> Dokument nastao direktnom analizom svakog modula na poreznikalkulator.ba.
> Sve stope, formule, polja i pravila su verificirani iz izvornog sistema.

---

## MODUL 1 — Preračun neto/bruto plate

### Pristup
Slobodan kalkulator, bez auth, bez PDF-a. Samo prikaz na ekranu.
Ruta: `/obrasci/preracun-plate`

### Polja
- Smjer: **Bruto → Neto** ili **Neto → Bruto** (toggle, default Bruto→Neto)
- Iznos u KM (veliki input, real-time obračun)
- Porezni koeficijent (default 1 = odbitak 300 KM; koeficijent 1.3 = 390 KM itd.)
  - Prikazuje se helper tekst: "Koeficijent 1 = 300 KM odbitka. Trenutni odbitak: X KM"

### Prikaz rezultata (tabela, real-time)
```
Bruto plata                              2.000,00 KM

DOPRINOSI IZ PLATE (NA TERET ZAPOSLENOG)
PIO / MIO                    17%           340,00 KM
Zdravstveno osiguranje       12,5%         250,00 KM
Osiguranje od nezaposlenosti  1,5%          30,00 KM
Ukupno                       31%           620,00 KM

POREZ NA DOHODAK
Porezna osnovica                         1.080,00 KM   (bruto - doprinosi iz = 2000 - 620)
Porez na dohodak             10%           108,00 KM   (osnovica - lični odbitak × 10%)

NETO PLATA                               1.272,00 KM

DOPRINOSI NA PLATU (NA TERET POSLODAVCA)
PIO / MIO                     2,5%          50,00 KM   ← NAPOMENA: ovo je PRIKAZ po radniku
Zdravstveno osiguranje        2%            40,00 KM   ← Ovo nisu ukupne stope!
Osiguranje od nezaposlenosti  0,5%          10,00 KM   ← Kalkulator dijeli na prikaz po radniku
Ukupno                        5%           100,00 KM

DODATNI DOPRINOSI NA PLATU
Opća vodna naknada            0,5%           6,36 KM   ← 0,5% od neto (ne od bruto!)
Naknada za zaštitu od nesreća 0,5%           6,36 KM

Ukupni trošak poslodavca                 2.112,72 KM
```

**VAŽNA NAPOMENA o stopama u kalkulatoru:**
Kalkulator prikazuje PIO 2.5%, zdravstvo 2%, nezaposlenost 0.5% = 5%.
Ovo je VIZUALNI prikaz koji dijeli stope. Stvarne stope su:
- PIO/MIO na bruto: 6% (ali kalkulator prikazuje 2.5% jer razdvaja na prikaz)
- Zdravstveno na bruto: 4% (prikazano kao 2%)
- Nezaposlenost na bruto: 0.5% (prikazano kao 0.5%)

**Stvarne stope za obračun (verifikovano s opisom stranice):**
- PIO/MIO na bruto: 6%
- Zdravstveno na bruto: 4%
- Nezaposlenost na bruto: 0.5%
- Vodna naknada: 0.5%
- Zaštita od nesreća: 0.5%
- Fond OSI: 0.5% (SAMO d.o.o., obrti izuzeti)

**Vodna naknada i naknada za nesreće se računaju od NETO plate, ne od bruto.**
Primjer: bruto 2000, neto 1272 → vodna = 1272 × 0.005 = 6.36 KM

### Formula (Bruto → Neto)
```
pension_from     = gross × 0.17
health_from      = gross × 0.125
unemp_from       = gross × 0.015
total_from       = gross × 0.31

tax_base         = gross - total_from
personal_ded     = 300 × koeficijent
taxable          = MAX(0, tax_base - personal_ded)
income_tax       = taxable × 0.10

net              = gross - total_from - income_tax

// Poslodavac
pension_on       = gross × 0.06
health_on        = gross × 0.04
unemp_on         = gross × 0.005
water            = net × 0.005     ← OD NETA!
disaster         = net × 0.005     ← OD NETA!
disability       = gross × 0.005   // samo d.o.o.

total_cost       = gross + pension_on + health_on + unemp_on + water + disaster [+ disability]
```

---

## MODUL 2 — PDV Kalkulator

### Pristup
Slobodan kalkulator, bez auth, bez PDF-a.
Ruta: `/obrasci/pdv-kalkulator`

### Polja
- Smjer: **Dodaj PDV** (bez PDV → s PDV) ili **Izvuci PDV** (s PDV → bez PDV)
- Valuta: KM ili EUR (toggle)
- Iznos (real-time)

### Prikaz rezultata
```
Cijena bez PDV-a    100,00 KM
PDV          17%  +  17,00 KM
Cijena s PDV-om     117,00 KM
```

### Formule
```
Dodaj PDV:   cijena_s_pdv = cijena_bez × 1.17
Izvuci PDV:  cijena_bez = cijena_s / 1.17
PDV iznos iz bruto: cijena × (17/117)

EUR kurs: 1 EUR = 1.95583 KM (fiksni currency board)
PDV prag za obaveznu registraciju: 50.000 KM godišnjeg prometa
PDV rok predaje: do 10. u mjesecu za prethodni
e-KUF/e-KIF rok: do 20. u mjesecu za prethodni
```

---

## MODUL 3 — AMS-1035

### Pristup
Slobodan, bez auth. PDF download besplatan.
Ruta: `/obrasci/ams`

### Šta je
Obrazac za akontaciju poreza po odbitku na prihode iz inostranstva
(freelance, honorari, konsultacije za strane naručioce).
Rok predaje: **5 dana od dana primitka dohotka**.

### Polja obrasca

**Dio 1 — Podaci o primaocu**
- 1) Ime i prezime primaoca
- 2) JMBG
- 3) Adresa, Grad
- 4) Datum isplate
- 5) Period — Mjesec (dropdown, Jan-Dec) + Godina

**Dio 2 — Podaci o isplatiocu**
- 6) Naziv (firma iz inostranstva)
- 7) Adresa isplatioca
- Grad isplatioca
- 8) Država

**Dio 3 — Prihodi, porez i doprinosi**
- 9) Iznos dohotka (KM) — ili unos u EUR s konverzijom × 1.95583
- Odbitak (rashodi) % — field za unos + napomena:
  "Pravo na uznavanje rashoda u iznosu od 20% (30% ukoliko se radi o autorskim naknadama)"
- 13) Porezni kredit plaćen u inostranstvu (KM)

**Dio 4 — Izjava**
- Datum popunjavanja

### Izračun (real-time, nije prikazan kao tabela na stranici nego u uplatnicama)
```
iznos_bam         = iznos_eur × 1.95583  (ako je unos u EUR)
rashodi           = iznos_bam × 0.20 (ili 0.30 za autorske)
osnovica          = iznos_bam - rashodi
zdravstvo         = osnovica × 0.04
porezna_osnovica  = osnovica - zdravstvo
porez             = porezna_osnovica × 0.10
kredit            = porez_placen_u_inostranstvu
porez_za_uplatu   = MAX(0, porez - kredit)

// Split zdravstvenog:
zdravstvo_kanton  = zdravstvo × 0.898
zdravstvo_fbih    = zdravstvo × 0.102
// Federalni račun: 102-050-00000640-18
```

### Uplatnice (Dio 5) — 3 uplatnice
Korisnik odabere Kanton i Općinu.
1. Zdravstveno osiguranje — kanton (89.8%) — žiro račun po kantonu
2. Zdravstveno osiguranje — FBiH (10.2%) — `102-050-00000640-18` · ZZO FBiH
3. Porez na dohodak — kantonalni budžet — žiro račun po odabranom kantonu

### Dokumenti
- Preuzmi AMS-1035 PDF
- Preuzmi 3 uplatnice (PDF)
- Sačuvaj na profil (pamti podatke za sljedeći put)

---

## MODUL 4 — SPR-1053

### Pristup
Slobodan, bez auth. PDF download besplatan.
Ruta: `/obrasci/spr`
Rok predaje: **31. marta tekuće godine za prethodnu godinu**.
Prilaže se uz GPD-1051.

### Polja obrasca

**Dio 1 — Podaci o poreznom obvezniku**
- "Popuni podatke" dugme → auto-popuna iz profila
- 1) JMB (vlasnikov JMBG, ne JIB firme)
- 2) Prezime i ime
- 3) Adresa, Grad

**Dio 2 — Podaci o djelatnosti**
- "Popuni djelatnost" dugme → auto-popuna iz organizacije
- 4) JIB/JMB djelatnosti (= organizations.tax_id)
- Brzi odabir godine (dropdown 2019-2026)
- 5) Period od (01.01.GGGG)
- 6) Period do (31.12.GGGG)
- 7) Checkbox: Kontakt podaci izmijenili od prošle godine
- 8) Naziv djelatnosti (= organizations.activity_name)
- 9) Adresa poslovne djelatnosti + Grad djelatnosti
- 10) Vrsta djelatnosti — Šifra + Naziv (= organizations.activity_code + activity_name)

**Dio 3 — Prihodi**
| RBr | Vrsta prihoda |
|---|---|
| 11 | U gotovini shodno poslovnim knjigama |
| 12 | Preko bankovnog računa shodno poslovnim knjigama |
| 13 | U stvarima i uslugama |
| 14 | Izuzimanja ekonomskih dobara (čl. 14. stav 4.) |
| 15 | Izuzimanja usluga (čl. 14. stav 4.) |
| **16** | **Prihodi ukupno = SUM(11:15)** — auto-izračun |

**Dio 4 — Rashodi**
| RBr | Vrsta rashoda |
|---|---|
| 17 | Nabavna vrijednost robe/materijala (s PDV-om; bez PDV-a za PDV obveznike) |
| 18 | Bruto plaće zaposlenika |
| 19 | Plaćeni doprinosi prema osnovici za poslodavca i na teret poslodavca |
| 20 | Ostali rashodi shodno poslovnim knjigama |
| 21 | Vrijednost uloženih ekonomskih dobara i usluga |
| 22 | Amortizacija (iz PLDI-1043) |
| 23 | Knjigovodstvena vrijednost rasknjiženih stalnih sredstava |
| **24** | **Rashodi ukupno = SUM(17:23)** — auto-izračun |

**Dio 5 — Utvrđivanje dohotka**
| RBr | Opis | Formula |
|---|---|---|
| 25 | Prihodi | = R16 |
| 26 | Rashodi | = R24 |
| 27 | Rashodi koje nije moguće odbiti (čl. 15) | ručni unos |
| **28** | **Dohodak** | = R25 - R26 + R27 |
| **29** | **Mjesečna akontacija** | = (R28 × 0.10) / 12 |

### Dokumenti
- Preuzmi SPR-1053 PDF
- Sačuvaj na profil

---

## MODUL 5 — GPD-1051

### Pristup
Slobodan, bez auth. PDF download besplatan.
Ruta: `/obrasci/gpd`
Rok predaje: **31. marta tekuće godine za prethodnu godinu**.

### Polja obrasca

**Dio 1 — Podaci o poreznom obvezniku**
- "Popuni podatke" dugme → auto-popuna
- 1) JMB
- 2) Prezime i ime
- 3) Adresa, Grad
- 4) Checkbox: Kontakt podaci izmijenili od prošle godine
- 5) Porezni period (godina, format "20" + "25" — split field)
- 6) Telefon
- 7) E-mail

**Dio 2 — Prijava prihoda**
| RBr | Vrsta prihoda | Izvor |
|---|---|---|
| 8 | Dohodak od nesamostalne djelatnosti (plate) | Iz GIP-1022 kolona 11 |
| 9 | Dohodak od samostalne djelatnosti | Iz SPR-1053 red 28 |
| 10 | Dohodak od poljoprivrede i šumarstva | Iz SPR-1053 |
| 11 | Dohodak od iznajmljivanja imovine | Iz PRIM-1054 |
| 12 | Dohodak od vremenski ograničenog ustupanja prava | ručno |
| 13 | Dohodak od drugih samostalnih djelatnosti | Iz AUG-1031 i ASD-1032 |
| 14 | Poslovni gubitak iz ranijih godina | ručno (odbitna stavka) |
| **15** | **Ukupno** | auto-izračun |
| 16 | Ukupni gubitak | auto |
| 17 | Ukupna dobit | auto |

**Dio 3 — Lični odbici**
| RBr | Opis |
|---|---|
| 18 | Lični odbitak (300 KM × 12 × koeficijent = min 3600 KM godišnje) |
| 19 | Uvećanje za troškove zdravstvenih usluga i lijekova (uz dokumentaciju) |
| 20 | Uvećanje za kamatu na stambeni kredit (uz dokumentaciju) |
| **21** | **Ukupni odbici = SUM(18:20)** |

**Dio 4 — Obračun porezne obaveze**
| RBr | Formula |
|---|---|
| 22 | Ukupni gubitak za godinu |
| 23 | Ukupan dohodak za godinu |
| 24 | Ukupni odbici (= R21) |
| **25** | **Osnovica = R23 - R22 - R24** |
| **26** | **Porezna obaveza = R25 × 0.10** |
| 27 | Umanjenje poreza (čl. 35 stav 3 i čl. 47) |
| 28 | Porez po odbitku (već plaćen kroz godinu) |
| 29 | Uplaćene akontacije poreza |
| 30 | Plaćeni porez u inostranstvu |
| **31** | **Razlika = R26 - R27 - R28 - R29 - R30** |
| 32 | Opcija: a) preplata kao akontacija ili b) zahtjev za povrat |

### Dodatne informacije
- Ko podnosi: obrtnici, više poslodavaca, prihodi iz inostranstva, prihodi od imovine
- Ko ne mora: radnici s jednim poslodavcem koji nisu koristili dodatne odbitke
- Dokumenti koji se priilažu: SPR-1053, ZO3, GIP-1022 od poslodavaca, PLDI-1043

### Dokument
- Preuzmi GPD-1051 PDF (preporučuje se 2 primjerka)
- Sačuvaj na profil
- Uplatnica za porez (generiše se samo ako R31 > 0)

---

## MODUL 6 — ZO3 obrazac

### Pristup
Slobodan, bez auth. PDF download besplatan.
Ruta: `/obrasci/zo3`
Rok predaje: **8 dana od nastanka promjene** (brak, rođenje, gubitak osiguranja).

### Šta je
Prijava člana porodice na zdravstveno osiguranje.
Ko se može prijaviti: supružnik (bračni/izvanbračni), djeca (maloljetna, punoljetna na školovanju,
s invaliditetom), roditelji koji nemaju zdravstveno po drugom osnovu.

### Dokumentacija uz obrazac
- Supružnik: izvod iz MK vjenčanih + uvjerenje o neosiguranju
- Dijete: rodni list (+ potvrda o školovanju za 15+)
- Roditelj: rodni list osiguranika + uvjerenje roditelja o nezaposlenosti i neosiguranju

### Polja obrasca

**Zaglavlje**
- Kanton FBiH (dropdown 10 kantona)
- Poslovnica / Područni ured

**Podaci o obvezniku uplate doprinosa (poslodavcu)**
- "Popuni djelatnost" → auto-popuna iz org
- Naziv i sjedište obveznika
- 1) JIB (jednoinsteni identifikacioni broj)
- 2) Registarski broj obveznika uplate doprinosa
- 3) Šifra djelatnosti — Šifra + Naziv
- 4) Radno vrijeme obveznika — sedmično

**Podaci o osiguraniku (radniku)**
- "Popuni podatke" → auto-popuna iz profila radnika
- 5) JMBG
- 6) Prezime
- 7) Ime
- 8) Djevojačko prezime (za udate)
- 9) Ulica i broj prebivališta + Grad
- 10) Broj pošte
- 11) Zanimanje + Šifra zanimanja
- 12) Datum stupanja na rad
- 13) Državljanstvo
- 14) Radno vrijeme — sedmično
- 15) Osnov osiguranja + Šifra (2 cifre)
- 16) Datum prestanka rada
- 17) Datum promjene
- 18) Vrsta promjene + Šifra

**Podaci o članovima porodice (tabela, max 10 redova)**
| RBr | JMBG | Prezime i ime | Srodstvo |
|---|---|---|---|
| 19 | | | |
| 20 | | | |
| ... | | | |
| 28 | | | |

**Napomena i potpis**
- Napomena (tekst)
- U (mjesto)
- Dana (datum)

### Dokument
- Preuzmi ZO3 PDF (2 primjerka)
- Sačuvaj na profil

---

## MODUL 7 — PLDI-1043 (Stalna sredstva / Amortizacija)

### Pristup
Slobodan. Čuvanje podataka uz registraciju.
Ruta: `/obrasci/pldi`
Prilaže se uz GPD-1051 i SPR-1053.

### Šta je
Popisna lista dugotrajne imovine. Evidentira sva stalna sredstva i godišnji
obračun amortizacije. Amortizacija je rashod R22 u SPR-1053.

### Polja — zaglavlje (po godini)

**Porezni obveznik**
- 1) JMB
- 2) Prezime i ime
- 3) Adresa, Grad

**Registrovana djelatnost**
- 4) JIB
- 5) Naziv
- 6) Adresa djelatnosti + Grad
- 7) Šifra djelatnosti + Naziv
- Porezna godina
- Checkbox: Ručno unesi period amortizacije

### Tabela stalnih sredstava (red po sredstvu)
| Kolona | Opis |
|---|---|
| 8) RB | Redni broj (auto) |
| 9) Naziv sredstva | Naziv (text) |
| 10) Datum nabavke | Date |
| 11) Br. dokumenta | Text |
| 12) Nabavna vrijednost | Numeric |
| 13) KV početak godine | Numeric (auto iz prethodne godine ili = nabavna za prvu god) |
| 14) Vijek (god.) | Integer |
| 15) Stopa (%) | Numeric (auto = 100/vijek, ili ručno) |
| 16) Iznos amortizacije | = KV_pocetka × stopa / 100 |
| 17) KV na kraju | = KV_pocetka - amortizacija |
| Datum prodaje | Date (opcionalno) |
| Otpis | Checkbox |

### Stope amortizacije (porezno priznate, FBiH)
| Vrsta sredstva | Stopa | Vijek |
|---|---|---|
| Računari i softver | 33.33% | 3 god |
| Putnička vozila | 20% | 5 god |
| Oprema i mašine | 14.29% | 7 god |
| Namještaj | 10% | 10 god |
| Poslovni objekti | 2.5%–4% | 25–40 god |
| Nematerijalna imovina | prema ugovornom roku | — |

### Logika
- Linearna metoda (jedina porezno priznata u FBiH)
- Stopa se ne mijenja iz godine u godinu
- Prenos u sljedeću godinu: KV kraj → KV početak (kolona 13 → kolona 4 naredne godine)
- Prodano/otpisano sredstvo ne prenosi se u narednu godinu
- Amortizacija se računa proporcionalno za godinu nabavke (broj mjeseci od nabavke)

### Dokument
- Preuzmi PLDI-1043 PDF
- Sačuvaj na profil
- Prenesi u narednu godinu (dugme)
- Dodaj sredstvo (dugme)

---

## MODUL 8 — JS3100 prijava/odjava radnika

### Pristup
Dio modula `/prijave-radnika`. Pro plan (dodavanje radnika).
Ruta: `/zaposlenici` → tab JS3100 ili direktno iz profila radnika.

### Šta je
Obrazac za prijavu, odjavu ili promjenu podataka osiguranika
u Jedinstvenom sistemu registracije, kontrole i naplate doprinosa.

### Rokovi (ZAKONSKI OBAVEZNI)
- Prijava: **najkasnije dan PRIJE početka rada**
- Odjava: **u roku 7 dana od prestanka radnog odnosa**
- Promjena podataka: u zakonskom roku od nastanka promjene

### Tipovi prijave (radio buttons)
- Prijava osiguranja
- Promjena podataka
- Odjava osiguranja

### Polja obrasca

**Vrsta prijave**
- Tip (radio)
- Datum prijave (Date, default danas)

**Dio 1 — Podaci o obvezniku uplate doprinosa (poslodavac)**
- "Popuni djelatnost" dugme → auto-popuna iz org
- 1) JIB
- 7) Telefon
- 2) Naziv obveznika uplate doprinosa
- 3) Adresa obveznika
- 4) Grad i poštanski broj
- 8) Email

**Dio 2 — Podaci o osiguraniku (radnik)**
- "Popuni podatke" dugme → auto-popuna iz profila radnika
- JMBG
- Datum rođenja
- Prezime
- Ime
- Djevojačko prezime
- Spol (Muški/Ženski)
- Adresa prebivališta
- Mjesto / Grad
- Kontakt adresa (popuniti samo ako se razlikuje od adrese)
- Email osiguranika
- Stručna sprema (dropdown): DR, MR, VSS, VŠS, SSS, Niža, VKV, KV, PK, NK

**Dio 3 — Podaci o osiguranju**
- Dnevno radno vrijeme — Sati (default 8)
- Dnevno radno vrijeme — Minuta (default 0)
- Osnov osiguranja, Opis (dropdown):
  - Zaposleni, puno radno vrijeme
  - Zaposleni, nepuno radno vrijeme
  - Direktor / član uprave
  - Vlasnik obrta
  - Stručno osposobljavanje
  - Sezonski radnik
  - Penzioner, povratak na rad
  - Stranac, radna dozvola
  - Ostalo 1
  - Ostalo 2
- Osnov osiguranja, Šifra (2 cifre)
- Zanimanje, Opis (text)
- Zanimanje, Šifra (7 cifara)
- Stručna sprema koja se traži na radnom mjestu (dropdown, isti kao gore)
- Datum prijave / odjave / promjene osiguranja
- Napomena (uz datum)
- Osnov za uplatu doprinosa, Opis
- Osnov za uplatu doprinosa, Šifra (2 cifre)
- Šifra radnog mjesta (4 cifre)
- Stepen uvećanja (X / 12) — za nepuno radno vrijeme

**Dio 4 — Lice koje je popunilo prijavu**
- "Popuni podatke" dugme
- Ime i prezime lica
- Telefonski broj
- Datum popunjavanja

### Dokumenti
- Sačuvaj na profil
- Preuzmi PDF
- **Samo prijavi radnika** — klik na ovo → radnik mijenja status iz `draft` u `active`
  i pojavljuje se u "Aktivni radnici" i obračunu plata

---

## MODUL 9 — Šihterica

### Pristup
Pro plan. Unos besplatan nakon registracije. PDF uz pretplatu.
Ruta: `/sihterica`

### Struktura
- Organizacija (dropdown)
- Radnici (lista, klik prebacuje na šihtaricu tog radnika)
- Godine (tabs: 2026, + Nova godina, Obriši godinu)
- Mjeseci (tabs: Jan–Dec, aktivan je tekući)

### Auto-popuna mjeseca (panel na vrhu)
- Početak (time, default 08:00)
- Kraj (time, default 16:00)
- Pauza (h, default 1h)
- Slobodni dani (toggle dani u sedmici: Pon/Uto/Sri/Čet/Pet/**Sub**/**Ned** — default Sub+Ned)
- Praznici u mjesecu (9.2), dani — text field, npr. "1, 2, 25"
- Checkbox: Pregazi već upisana polja
- RAČUNAJ ODSUSTVO U UKUPNE SATE ZA:
  - Godišnji (9.1) — checkbox
  - Praznik (9.2) — checkbox
  - Bolovanje (9.3) — checkbox
- Godišnji odmor (9.1): od ___ do ___ (date range)
- Bolovanje (9.3): od ___ do ___ (date range)
- Dugme: **Popuni mjesec →**

### Tabela šihterice (kolone)
| Kolona | Opis |
|---|---|
| Rbr | Redni broj |
| Datum | DD.MM.GGGG. Dan |
| Početak | HH:MM (time input) |
| Kraj | HH:MM (time input) |
| Zastoj/Prekid/Pauza (h) | Numeric |
| Uk. dnevnih sati | Auto-izračun: (Kraj - Početak) - Pauza |
| Terenski (h) | Numeric (zasebno, ne dodaje se u ukupne) |
| Pripravnost (h) | Numeric (zasebno, ne dodaje se u ukupne) |
| Odsustvo (šifra) | Text — šifra 9.1–9.10 |
| Ostalo (šifra) | Text — za noćni rad, prekovremeni, smjenski itd. |
| Uk. sati | Konačni zbir za taj dan |

**Na dnu: Ukupno radnih sati u mjesecu**

### Pravila izračuna sati
1. Radni dan: `ukupni_sati = (Kraj − Početak) − Pauza`
2. Ručno upisana vremena uvijek pobjeđuju — ako upišeš Početak i Kraj, dan se računa po vremenima bez obzira na šifru odsustva
3. Plaćena odsustva BEZ upisanih vremena (9.1, 9.2, 9.3, 9.4, 9.5) = puni radni dan (ovisno o checkboxu)
4. Sedmični odmor (9.1 na danima označenim kao slobodni) = UVIJEK 0 sati
5. Neplaćena odsustva (9.6, 9.7, 9.8, 9.9, 9.10) = 0 sati, ne ulaze u zbir
6. Terenski rad i pripravnost se evidentiraju zasebno i **ne dodaju se** na ukupni fond sati
7. Postavka "Računaj odsustvo u ukupne sate" pamti se po korisniku

### Šifre odsustva
| Šifra | Opis | Ulazi u sate |
|---|---|---|
| 9.1 | Godišnji ili sedmični odmor | Da (ako nije slobodan dan) |
| 9.2 | Državni praznik | Da (checkbox) |
| 9.3 | Bolovanje (prvih 42 dana, na teret poslodavca) | Da (checkbox) |
| 9.4 | Porodiljsko / roditeljsko odsustvo | Uvijek da |
| 9.5 | Plaćeno odsustvo | Uvijek da |
| 9.6 | Neplaćeno odsustvo | Ne (0 sati) |
| 9.7 | Neprisutnost po zahtjevu radnika | Ne |
| 9.8 | Neprisutnost krivicom radnika | Ne |
| 9.9 | Štrajk | Ne |
| 9.10 | Lockout (isključenje s rada) | Ne |

Kolona "Ostalo" za:
- Noćni rad
- Prekovremeni rad
- Smjenski rad
- Dvokratni rad
- Rad u dane praznika
- Rad u neradne dane

### Zakonska napomena
Prekovremeni rad ne smije prelaziti **8 sati sedmično** niti **32 sata mjesečno**
(Zakon o radu FBiH). Šihterica automatski razdvaja redovne i prekovremene sate.

### Dokumenti
- Preuzmi PDF (pojedinačno, za jednog radnika)
- Sve radnike (PDF) — multipage za sve radnike
- ZIP — zaseban fajl po radniku
- Podaci se automatski čuvaju i dostupni su za naredne posjete

---

## MODUL 10 — Obračun plata

### Pristup
Pro plan.
Ruta: `/obracuni-plata`

### Tok obračuna (9 koraka)

**Korak 1 — Postavi radnika**
U Aktivni radnici ili `/zaposlenici` dodaj radnika:
(ime, JMB, adresa, bruto plata, datum prijave, ugovorene sate)
Generiši JS3100 za prijavu u PU FBiH.

**Korak 2 — Otvori obračun za period**
Tab "Obračun plata" → odaberi organizaciju, godinu, mjesec.
Prikazuje se lista aktivnih radnika za taj period.

**Korak 3 — Unesi satnicu i dodatke (po radniku)**
Klik na radnika → otvori detalj:
- Bruto osnovica (iz ugovora, pre-populated)
- Neto (preračunava se automatski)
- Broj radnih sati (iz šihterice ako postoji, ili iz ugovora)
- Bolovanje (sati)
- Prekovremeni rad (sati)
- Noćni rad (sati)
- Nedjelje (sati)
- Praznici (sati)
- **Neoporezivi dodaci:**
  - Topli obrok (max 1% prosječne neto plate FBiH dnevno)
  - Regres (max 50% prosječne neto plate FBiH kvartalno)
  - Putni trošak
- Klik "Obračunaj" → sistem računa doprinose i porez

**Korak 4 — Obračunaj sve**
Klik "Obračunaj sve" → obračuna sve radnike odjednom.
Prikaže sumarni prikaz: ukupni bruto, neto, doprinosi, porez, trošak poslodavca.

**Korak 5 — Postavi datum isplate**
Default: posljednji dan u mjesecu.
Datum ide u: uplatnice, platne listiće, Obrazac 2001.

**Korak 6 — Preuzmi dokumente ZA BANKU**
- Platni listići — jedan PDF, stranica po radniku, za potpis
- Uplatnice — sve uplatnice za doprinose i poreze
- Lista naloga — rekapitulacija svih isplata za banku
- Specifikacije po radniku — ko prima koliko po vrsti isplate

**Korak 7 — Preuzmi obrasce ZA POREZNU UPRAVU**
Rok: **do 10. u mjesecu za prethodni**.
- Obrazac 2001 (za radnike)
- Obrazac 2002 (za vlasnika obrta)
- MIP-1023 PDF (do 5 radnika po stranici, multi-page)
- MIP-1023 XML (za nPIS paketni uvoz)

**Korak 8 — Označi kao isplaćeno**
"Označi sve obračune kao isplaćene" → status: Obračunato → **Isplaćeno**

**Korak 9 — Krajem godine: GIP-1022**
Rok: **28. februara naredne godine**.
- GIP-1022 PDF (kombinovani za sve radnike)
- GIP-1022 ZIP (zasebni fajlovi po radniku)
- GIP-1022 XML (za nPIS)
- Vlasnici obrta su **IZUZETI** iz GIP-a

### Dokumenti koje generiše obračun

**Za banku:**

*Lista naloga za plaćanje* — rekapitulacija svih naloga:
- Doprinosi po vrstama (PIO, zdravstveno kant./fed., nezaposlenost kant./fed., porez, fond invalida, vodna, nesreće)
- Međuzbir doprinosa
- Zbirne isplate radnicima (neto plate, topli obrok, regres, putni trošak)
- Konačni ukupan zbir

Za obrt: doprinosi se razdvajaju na set za vlasnika i set za radnike.

*Specifikacije po radniku* — detaljan popis ko prima koliko i na koji žiro račun:
- Neto plate (sa žiro računom svakog radnika)
- Topli obrok
- Putni trošak
- Regres
- Međuzbir po sekciji, ukupan zbir na kraju

**Za Poreznu upravu:**

*MIP-1023* — sadrži:
- Zaglavlje: JIB poslodavca, šifra djelatnosti, broj zaposlenih, period (godina/mjesec)
- Red po radniku: JMBG, ime i prezime, bruto, doprinosi iz plate, lični odbitak,
  oporeziva osnovica, iznos poreza na dohodak, neto, ukupna isplata, broj sati,
  općina prebivališta radnika
- Zbirni red na dnu
- Format: PDF (do 5 radnika po stranici, automatski multi-page) i XML za nPIS

*GIP-1022* — sadrži (po radniku):
- Zaglavlje: JIB poslodavca, JMBG radnika, ime i prezime
- Tabela 12 redova (jan-dec) + kumulativni godišnji zbir
- Kolone: ukupan prihod, doprinosi iz, lični odbitak, oporeziva osnovica,
  porez na dohodak, neto isplata
- Format: kombinovani PDF / ZIP (jedan fajl po radniku) / XML za nPIS
- Vlasnici obrta su IZUZETI

*Obrazac 2001* — mjesečna specifikacija isplata za radnike (PU FBiH)
*Obrazac 2002* — za vlasnike obrta i samostalne djelatnosti, do 10. u mjesecu

### Raspoređivanje poreza na dohodak po općinama
Porez na dohodak se uplaćuje prema **općini RADNIKA** (ne poslodavca).
Svaka općina ima vlastiti žiro račun za porez na dohodak.

Primjer: poslodavac u Sarajevu, radnik iz Tuzle →
porez na dohodak ide na tuzlanski kantonalni račun.

Zato `salary_items` mora snimiti snapshot: `municipality_code`, `municipality_name`,
`canton` radnika u trenutku obračuna — jer se adresa radnika može promijeniti.

### Zdravstveni doprinos — split kantonalno/federalno
```
zdravstvo_kanton  = zdravstveni_doprinos × 0.898   // 89.8% kantonu
zdravstvo_fbih    = zdravstveni_doprinos × 0.102   // 10.2% FZO FBiH
// Federalni račun je uvijek isti: 102-050-00000640-18
```

### Nezaposlenost — split kantonalno/federalno
```
nezaposlenost_kanton  = doprinos_nezaposlenosti × 0.70  // 70% kantonu
nezaposlenost_fbih    = doprinos_nezaposlenosti × 0.30  // 30% federalnoj službi
```

### Šifre vrsta prihoda za uplatnice
| Doprinos | Šifra vrste prihoda |
|---|---|
| PIO/MIO (iz + na zajedno) | 712112 |
| Zdravstveno (iz + na zajedno) | 712111 |
| Nezaposlenost (iz + na zajedno) | 712113 |
| Porez na dohodak | 716111 |
| Opća vodna naknada | 722529 |
| Zaštita od prirodnih nesreća | 722581 |
| Zdravstveno — UoD (ugovor o djelu) | 712116 |
| Porez na dohodak — UoD | 716116 |
| PIO/MIO — UoD (na teret naručioca) | 712126 |
| Zaštita od nesreća — UoD | 722582 |

---

## MODUL 11 — Ugovor o djelu

### Pristup
Kalkulator slobodan, bez auth.
Generator ugovora (DOCX/PDF) i uplatnice: Business plan.
Ruta: `/obrasci/ugovor-o-djelu` (slobodni kalkulator) ili
`/zaposlenici/[id]/ugovori/djelo` (s auto-popunom iz profila radnika)

### Polja

**Iznos naknade**
- Rezidentnost: FBiH (rezident) ili Nerezident (toggle)
- Vrsta naknade (dropdown):
  - Standardna naknada (20% troškovi)
  - Autorsko djelo (30% troškovi)
  - Komisija / nadzorni odbor (0% troškovi)
- Smjer: Poznat NETO ili Poznat BRUTO (toggle)
- Iznos u KM

### Obračun (real-time tabela)
```
1   Neto iznos naknade                              1.000,00 KM
2   Bruto iznos UoD (rb.1 × 1,122083)              1.122,08 KM
3   Priznati troškovi 20%                             224,42 KM
4   Bruto naknada umanjena za troškove                897,66 KM
5   Doprinos za zdravstveno 4%                         35,91 KM
6   Osnovica za porez                                 861,75 KM
7   Porez na dohodak 10%                               86,18 KM
8   Naknada po odbitku zdravstva i poreza              775,57 KM
9   Priznati troškovi (vraćeni)                        224,42 KM
10  Naknada za isplatu                               1.000,00 KM
11  PIO 6% (na teret naručioca)                        53,86 KM  ← od neto
12  Zaštita od prirodnih nepogoda 0,5%                  5,00 KM  ← od neto
13  Opšta vodna naknada 0,5%                            5,00 KM  ← od neto
14  Ukupni troškovi naručioca                        1.185,94 KM
15  Isplata izvršiocu                                1.000,00 KM
16  Porezi i doprinosi (% na neto)                      18,59%
```

**Multiplier za Neto → Bruto: 1.122083**
Ovo je fiksan koeficijent za standardnu naknadu (20% troškovi).
Za autorsku naknadu (30%): drugačiji koeficijent.
Za komisiju (0%): drugačiji koeficijent.

### Ugovorne strane

**Naručilac (poslodavac)**
- "Popuni naručioca" → auto-popuna iz profila org
- Naziv / Ime i prezime
- Adresa
- JIB / ID broj

**Izvršilac (radnik)**
- "Popuni izvršioca" → auto-popuna iz profila radnika
- Ime i prezime
- Adresa
- JMBG
- Žiro račun (transakcijski)

**Predmet ugovora i rokovi**
- Opis posla (tekst koji se nadovezuje na "Izvršilac posla prihvata..." — počinje glagolom)
- Datum zaključenja
- Rok izvršenja

**Detalji ugovora**
- Broj ugovora
- Mjesto zaključenja
- Iznos slovima (auto)
- Nadležni sud (u slučaju spora)

### Uplatnice — 6 uplatnica
Korisnik odabere Kanton i Općinu (poslodavca).

| # | Naziv | Račun | Šifra | Iznos |
|---|---|---|---|---|
| 1 | Zdravstveno — kanton | žiro po kantonu | 712116 | 89.8% zdravstvenog |
| 2 | Zdravstveno — FBiH | 102-050-00000640-18 | 712116 | 10.2% zdravstvenog |
| 3 | Porez na dohodak | kantonalni budžet po kantonu | 716116 | iznos poreza |
| 4 | PIO/MIO doprinos | 102-050-00001066-98 · Budžet FBiH | 712126 | 6% od neto |
| 5 | Zaštita od prirodnih nepogoda | kantonalni budžet | 722582 | 0.5% od neto |
| 6 | Opšta vodna naknada | kantonalni budžet | 722582 | 0.5% od neto |

**Rok uplate:** isti dan kada se isplaćuje neto iznos izvršiocu.
Naručilac podnosi i **AUG-1031** obrazac (automatski se generiše).

### Dokumenti
- Preuzmi ugovor (DOCX) — Business plan
- Preuzmi ugovor (PDF) — Business plan
- Preuzmi AUG-1031 (PDF)
- Preuzmi 6 uplatnica (PDF) — Business plan

### Pravno upozorenje
Inspekcija rada može preklasifikovati UoD u ugovor o radu ako se ustanovi
da posao ima karakteristike radnog odnosa (fiksno radno vrijeme, subordinacija, dugotrajnost).
UoD mora biti ograničen vremenski i predmetno.

---

## MODUL 12 — Ugovor o radu i otkaz

### Pristup
Business plan.
Ruta: `/zaposlenici/[id]/ugovori/rad`

### Šta generiše
1. Ugovor o radu (DOCX + PDF)
2. Odluka o prestanku radnog odnosa (DOCX + PDF)
3. Automatski kreira JS3100 odjavu pri kreiranju odluke o otkazu

### Polja ugovora o radu
Auto-popuna iz profila radnika i organizacije:
- Podaci poslodavca: naziv, adresa, JIB, zastupnik
- Podaci radnika: ime, prezime, JMBG, adresa, stručna sprema
- Radno mjesto: naziv, opis poslova, šifra radnog mjesta
- Vrsta radnog odnosa: neodređeno / određeno (+ datum završetka)
- Probni rad: da/ne, trajanje
- Radno vrijeme: puno / nepuno radno vrijeme, sati
- Bruto/neto plata, datum isplate
- Pravo na godišnji odmor (min 20 radnih dana po zakonu)
- Otkazni rok (default 30 dana)
- Datum zaključenja ugovora
- Datum stupanja na rad
- Numeracija ugovora (auto, po organizaciji)

### Odluka o prestanku radnog odnosa
- Razlog prestanka: sporazumni / otkaz od strane radnika / otkaz od strane poslodavca
- Datum prestanka
- Otkazni rok
- Otpremnina (ako postoji)
- Potpis i pečat

---

## MODUL 13 — Ugovor o pozajmici

### Pristup
Slobodan, bez auth. PDF/DOCX besplatno.
Ruta: `/obrasci/ugovor-o-pozajmici`

### Polja obrasca

**Opći podaci**
- Vrsta pozajmice: Kratkoročno / Dugoročno (toggle)
- Datum zaključenja (Date)
- Ugovor se zaključuje u (Grad, default Sarajevo)

**Ugovorne strane**
- "Popuni zajmodavca" → auto-popuna iz profila
- "Popuni zajmoprimca" → auto-popuna iz profila
- Zajmodavac — Ime/naziv, Adresa, LK/ID broj
- Zajmoprimac — Ime/naziv, Adresa, LK/ID broj

**Član 1 — Iznos pozajmice**
- Iznos pozajmice (samo cifra u KM)

**Član 2 — Uvjeti i svrha**
- Tip: kratkoročno/dugoročno (auto iz odabira)
- Svrha pozajmice (text)

**Član 3 — Žiro račun**
- Broj žiro računa na koji se uplaćuje
- Banka

**Član 4 — Kamatna stopa**
- Kamatna stopa (number, može biti 0 za beskamatnu)

**Član 5 — Napomene**
- Slobodan tekst napomene
- Nadležni sud (u slučaju spora)

**Član 6 — Broj primjeraka**
- Ukupan broj primjeraka (dropdown 1-10)
- Kopije po strani (dropdown 1-10)

### Porezni tretman
- Sama pozajmica nije oporeziva
- Kamata za fizičko lice → porez na dohodak od kapitala 10% → prijava kroz GPD-1051
- Kamata za pravno lice → ulazi u prihode od kapitala → porez na dobit
- Pozajmice između povezanih lica (firma ↔ vlasnik) → PU može primijeniti tržišnu kamatnu stopu

### Dokumenti
- Sačuvaj kao DOCX
- Sačuvaj kao PDF

---

## MODUL 14 — Fakture i predračuni

### Pristup
Pro plan.
Ruta: `/fakture` (lista), `/fakture/nova` (kreiranje)

### Tipovi dokumenata
- `invoice` — faktura (porezni dokument)
- `proforma` — predračun (nije porezni dokument)
- `credit_note` — knjižno odobrenje (stornira fakturu)
- `advance` — avansna faktura

### Numeracija
- Format: `GGGG-RBR` (npr. `2026-001`)
- Zasebni niz za fakture i zasebni za predračune
- Sekvencijalni broj se ne može preskočiti ni promijeniti (zakonska obaveza)
- Storniranje → generiše se knjižno odobrenje s novim brojem;
  originalna faktura ostaje u bazi sa status = `cancelled`

### Polja forme za novu fakturu

**Tip i podešavanja (header)**
- Toggle: Faktura / Predračun
- Checkbox: Obračunavam PDV (default = iz profila org)
- Valuta: KM / EUR (toggle)
  - Ako EUR → iznosi se prikazuju u EUR i KM po kursu 1.95583
- Datum izdavanja (Date, default danas)
- Datum dospijeća (Date, default danas + 30 dana)

**Prodavac** — "Popuni iz profila" dugme → auto-popuna:
- Naziv
- Adresa
- Grad
- Telefon
- Email
- ID broj (JIB)
- PDV broj
- Žiro račun
- Logo (iz Supabase Storage, ako je uploadovan)

**Kupac** — "Popuni iz profila" dugme ili ručni unos:
- Naziv / Ime i prezime
- Adresa
- Grad
- Poštanski broj
- ID broj
- PDV broj (ako je obveznik)
- Email
- Telefon
- Opcija: "Sačuvaj kao novog partnera"

**Stavke fakture** (dodaj neograničen broj):
- Naziv robe/usluge
- Jedinica mjere (kom, sat, m², kg, paušal...)
- Količina
- Jedinična cijena bez PDV-a
- Rabat % (opcionalno)
- PDV % (17% standardno, 0% za izvoz)
- Iznos bez PDV-a (auto)
- PDV iznos (auto)
- Ukupno (auto)

**Zbir**
- Osnovica (bez PDV)
- Rabat (ako postoji)
- PDV
- **Ukupno za plaćanje**

**Napomena** (opcionalno, slobodan tekst)

### Obavezni elementi fakture (Zakon o PDV-u BiH)
1. Broj fakture i datum izdavanja (uzlazna numeracija, bez praznina)
2. Datum isporuke robe ili izvršenja usluge
3. Naziv, adresa, JIB i PDV broj prodavca
4. Naziv, adresa i JIB kupca (+ PDV broj ako je obveznik)
5. Količina i naziv robe/usluge
6. Jedinična cijena bez PDV-a
7. Rabat (ako postoji)
8. Oporeziva osnovica po stopi
9. Stopa PDV-a i iznos PDV-a
10. Ukupan iznos s PDV-om
11. Način plaćanja i žiro račun

### Statusi fakture
| Status | Opis |
|---|---|
| `draft` | Kreirana, nije izdata, broj nije dodijeljen |
| `open` | Izdata, čeka plaćanje |
| `paid` | Plaćena (ručno ili auto-match iz bankovnog izvoda) |
| `overdue` | Prošao datum dospijeća, nije plaćena |
| `cancelled` | Stornirana, postoji knjižno odobrenje |

### Snapshot pravilo
Svaka faktura mora snimiti snapshot podataka prodavca i kupca u trenutku
izdavanja. Ne smije referencirati organizaciju direktno jer se podaci mogu
promijeniti. Snapshot kolone u `invoices` tabeli (seller_name, seller_address,
buyer_name, buyer_address itd.) su zbog toga.

---

## MODUL 15 — Partneri

### Pristup
Pro plan.
Ruta: `/partneri`

### Tipovi
- `customer` — kupac
- `supplier` — dobavljač
- `both` — i kupac i dobavljač

### Polja
- Naziv
- Tip (kupac/dobavljač/oboje)
- JIB / PDV broj
- Adresa, Grad, Email, Telefon
- Žiro račun, Banka
- Napomena
- `keywords[]` — ključne riječi za auto-match s bankovnim izvodom

### Keywords — auto-match logika
Svaki partner ima niz ključnih riječi koje se pojavljuju u opisu transakcija.
Primjer: partner "Veletrgovina d.o.o." → keywords: `["veletrgovina", "VLD", "1234567890123"]`
Kada se parsira bankovni izvod, sistem traži te ključne riječi u opisu
transakcije i automatski prijedlaže sparivanje s `match_score` (0-100).

---

## MODUL 16 — Bankovni izvodi

### Pristup
Pro plan.
Ruta: `/bankovni-izvodi`

### Podržane banke
UniCredit, Raiffeisen, Sparkasse, KIB, BBI, MF banka, Ziraат, Manual

### Flow
1. Upload PDF izvoda banke
2. Sistem parsira i ekstrahuje transakcije (datum, iznos, smjer, opis, kontrastrana)
3. Prikaz ekstrahiranih transakcija za pregled
4. Korisnik potvrdi → snimanje u `transactions` tabelu

### Auto-sparivanje transakcija
Za svaku transakciju:
1. Traži keywords partnera u opisu → prijedlog `partner_id`
2. Ako je kredit → traži otvorene fakture istog iznosa → prijedlog `invoice_id`
3. Dodjeljuje `match_score` (0-100) i status `review`
4. Korisnik potvrdi ili promijeni → status `confirmed`

### Auto-knjiženje u KPR
Potvrđena transakcija → automatski kreira red u `kpr_entries`:
- Kredit (uplata) → prihod u KPR
- Debit (isplata) → rashod u KPR, kategorija se određuje po partneru/opisu

---

## MODUL 17 — KPR-1041

### Pristup
Pro plan.
Ruta: `/kpr`

### Šta je
Knjiga prometa radnji — zakonski obavezna evidencija svih prihoda
i rashoda obrta za kalendarsku godinu.

### Dva načina popunjavanja
1. **Automatski** → svaka potvrđena transakcija iz bankovnog izvoda
   automatski se proknjižava (prihod ili rashod prema smjeru i kategoriji)
2. **Ručni unos** → korisnik dodaje red direktno (gotovinske transakcije i sl.)

### Struktura unosa
Svaki red sadrži:
- Datum
- Redni broj (auto-inkrement po org + godini)
- Prihodi: gotovina, banka, ostalo, ukupno
- Rashodi: roba, plate, doprinosi, ostali, ukupno
- Veza s izvorom: `transaction_id` ili `invoice_id`

### Pregledi i export
- Pregled po godini (sve transakcije)
- Pregled po kvartalu
- Kumulativni zbir za godinu
- Export u PDF (KPR-1041 obrazac)

---

## MODUL 18 — PDV evidencije (e-KUF / e-KIF)

### Pristup
Pro plan.
Ruta: `/pdv`

### Šta su
- **e-KUF** — knjiga ulaznih faktura (fakture koje org prima od dobavljača)
- **e-KIF** — knjiga izlaznih faktura (fakture koje org izdaje kupcima)

Rok predaje UINO-u: **do 20. u mjesecu za prethodni**.

### Auto-populacija
- Izdata faktura (status = `open`) → automatski kreira red u e-KIF
- Ručni unos ulazne fakture → kreira red u e-KUF
- Iz potvrđenih transakcija bankovnog izvoda → može se kreirati KUF zapis

### Polja po zapisu
- Tip: KUF ili KIF
- Godina, Mjesec
- Naziv partnera, PDV broj partnera
- Broj fakture, Datum fakture, Datum knjiženja
- Osnovica 17%, PDV 17%
- Osnovica 0%, ukupno
- Odbitnost (da/ne), procenat odbitnosti
- Veza s fakturom (invoice_id, opcionalno)

### Export
- XML format kompatibilan s UINO sistemom
- PDF pregled za arhiviranje

---

## GLOBALNA PRAVILA KOJA VRIJEDE U SVIM MODULIMA

### 1. Auto-popuna iz profila
Svaki modul koji generiše dokument ima dugme "Popuni iz profila" ili
"Popuni djelatnost" / "Popuni podatke".

Mapiranje — organizacija → obrazac:
```
organizations.tax_id          → JIB/JMB djelatnosti (SPR R4, ZO3, JS3100)
organizations.name            → Naziv obveznika
organizations.address         → Adresa obveznika
organizations.city            → Grad
organizations.municipality    → Općina
organizations.municipality_code → Šifra općine (za uplatnice)
organizations.canton          → Kanton
organizations.activity_code   → Šifra djelatnosti (SPR R10, ZO3)
organizations.activity_name   → Naziv djelatnosti
organizations.phone           → Telefon
organizations.email           → Email
organizations.bank_account    → Žiro račun
organizations.logo_url        → Logo na fakturama
```

Mapiranje — radnik → obrazac:
```
employees.jmbg               → JMBG osiguranika (JS3100, ZO3)
employees.first_name         → Ime
employees.last_name          → Prezime
employees.maiden_name        → Djevojačko prezime
employees.address            → Adresa
employees.city               → Grad
employees.municipality_code  → Šifra općine (za uplatnice poreza na dohodak)
employees.education_level    → Stručna sprema (JS3100)
employees.occupation_name    → Zanimanje opis (JS3100)
employees.occupation_code    → Zanimanje šifra (JS3100)
employees.insurance_basis_name  → Osnov osiguranja opis
employees.insurance_basis_code  → Osnov osiguranja šifra
employees.payment_basis_name    → Osnov za uplatu opis
employees.payment_basis_code    → Osnov za uplatu šifra
employees.job_position_code  → Šifra radnog mjesta (JS3100)
employees.work_hours_per_day → Dnevno radno vrijeme
employees.gross_salary       → Bruto plata
employees.bank_account       → Žiro račun radnika
employees.hire_date          → Datum stupanja na rad
```

### 2. Snapshot podaci
Svaka faktura, obračun plate i ugovor snima snapshot podataka u trenutku
kreiranja. Razlog: podaci organizacije i radnika se mogu promijeniti,
ali historijski dokumenti moraju ostati nepromijenjeni.

### 3. Sačuvaj na profil
Gotovo svaki obrazac ima dugme "Sačuvaj na profil".
Klik → podaci se snimaju u bazu i dostupni su pri sljedećem posjetu.
Bez toga → podaci se gube pri zatvaranju stranice.
Arhiva dokumenata dostupna je samo registrovanim korisnicima.

### 4. Planovi pretplate — detaljno

| Funkcija | Plan |
|---|---|
| Preračun neto/bruto | Besplatno, bez registracije |
| PDV kalkulator | Besplatno, bez registracije |
| SPR-1053, GPD-1051, ZO3, AMS-1035, PLDI-1043 | Besplatno uz registraciju |
| Ugovor o pozajmici | Besplatno uz registraciju |
| Sačuvaj na profil (svi obrasci) | Besplatno uz registraciju |
| Historija dokumenata po godinama | Besplatno uz registraciju |
| Šihterica — unos | Besplatno uz registraciju |
| Šihterica — PDF preuzimanje i ZIP | **Pro** |
| Fakture i predračuni | **Pro** |
| Obračun plata (JS3100, MIP, GIP, 2001, 2002) | **Pro** |
| Aktivni radnici — dodavanje | **Pro** |
| Bankovni izvodi i transakcije | **Pro** |
| KPR-1041 | **Pro** |
| PDV evidencije (e-KUF/e-KIF) | **Pro** |
| Višestruke djelatnosti | **Pro** |
| Do 20 klijenata (za knjigovođe) | **Pro** |
| Neograničeni klijenti | **Business** |
| Ugovor o djelu — generator + uplatnice | **Business** |
| Ugovor o radu i otkaz | **Business** |
| Višekorisnički pristup (tim za knjigovođe) | **Business** |
| Dodavanje radnika na klijente | **Business** |

**Cijene (godišnje, + PDV):**
- Pro: 200 KM/god (= ~16.67 KM/mjes)
- Business: 500 KM/god (= ~41.67 KM/mjes)
- Trial: 30 dana Pro besplatno za sve nove korisnike, bez kartice

**Logika provjere plana:**
```
function checkPlan(org, requiredPlan):
  // Trial period — tretira se kao Pro
  if org.trial_ends_at > NOW():
    effectivePlan = 'pro'
  // Aktivna pretplata
  else if org.plan_expires_at > NOW():
    effectivePlan = org.plan
  else:
    effectivePlan = 'free'  // istekla pretplata

  hierarchy = { free: 0, pro: 1, business: 2 }
  return hierarchy[effectivePlan] >= hierarchy[requiredPlan]
```

Provjera se radi na **Server Action nivou**, ne samo na UI.

### 5. Formati prikaza
- Novčani iznosi: `1.234,56 KM` (BH format, tačka = separator hiljada, zarez = decimale)
- Datumi: `DD.MM.GGGG.` (prikaz) / ISO 8601 `2026-06-28` (baza)
- JMBG: 13 cifara, validacija checksum algoritmom
- JIB: 13 cifara
- PDV broj: format BA + 12 cifara

### 6. Fizičko brisanje
- Radnici se ne brišu — status = `terminated`
- Fakture se ne brišu — status = `cancelled`, kreira se knjižno odobrenje
- Obračuni plata se ne brišu — status = `cancelled`
- Fizičko brisanje SAMO za `draft` dokumente koji nikad nisu izdani

### 7. Rokovi predaje dokumenata (porezni kalendar)
| Rok | Dokument | Institucija |
|---|---|---|
| Do 10. u mjes. | MIP-1023, Obr. 2001, Obr. 2002 | PU FBiH |
| Do 10. u mjes. | PDV prijava i uplata | UINO |
| Do 20. u mjes. | e-KUF i e-KIF | UINO |
| Dan prije rada | JS3100 prijava | PU FBiH |
| 7 dana od otkaza | JS3100 odjava | PU FBiH |
| 5 dana od primitka | AMS-1035 | PU FBiH ispostava |
| 31. marta | SPR-1053 + GPD-1051 | PU FBiH |
| 28. februara | GIP-1022 | PU FBiH |

---

## Redoslijed implementacije (ažurirani)

| # | Modul | Plan | Ovisi o |
|---|---|---|---|
| 5 | Radnici (CRUD, profil) | Pro | Org |
| 6 | Šihterica | Pro | Radnici |
| 7 | Obračun plata + JS3100 + MIP/GIP | Pro | Radnici + Šihterica |
| 8 | Obrasci (preračun, PDV, SPR, GPD, ZO3, AMS, PLDI) | Free | Org profil |
| 9 | Ugovor o djelu | Business | Radnici |
| 10 | Ugovor o radu | Business | Radnici |
| 11 | Ugovor o pozajmici | Free | — |
| 12 | Fakture i predračuni | Pro | Org profil |
| 13 | Partneri | Pro | — |
| 14 | Bankovni izvodi + transakcije | Pro | Partneri + Fakture |
| 15 | KPR-1041 | Pro | Transakcije |
| 16 | PDV evidencije | Pro | Fakture |
| 17 | Stalna sredstva (PLDI) | Free | Org profil |
| 18 | Pretplata i plan provjera | — | Sve |

