# Plan implementacije e-KIF / e-KUF (UIO BiH)

> **Status:** planiranje · **Cilj:** puni modul u skladu sa Zakonom o PDV-u, Uputom SG 83/19 i Tehničkim uputstvom UIO (ukl. izmjene 09/2023)  
> **Referenca u kodu danas:** `pdv_records` + `/pdv` (skeleton) · auto-KIF pri `invoice.status → open`

---

## 1. Sažetak — šta imamo vs šta treba

| Oblast | Danas | Cilj |
|--------|-------|------|
| KIF auto iz faktura | Djelimično (17%, issue_date, bez tipova) | Pun mapping na UIO kolone + svi tipovi prometa |
| KUF | Ne postoji | Ručni unos, JCI, neobveznici, odbitnost |
| Porezni period | `issue_date` mjesec | **`delivery_date` / datum prijema** (ključno) |
| CSV export | Ne | UTF-8, `;`, slog 1/2/3, ime fajla `PDV12YYMM{1\|2}ZZ` |
| Validacija | Ne | Blokada exporta + checklist |
| Zaključavanje perioda | Ne | Immutable nakon „Zaključaj mj X“ |
| Tip dokumenta UIO | `document_type` free text | Enum `01`–`09` (2023+) |
| Finansijska polja | 4 kolone | 10+ kolona po UIO specifikaciji |
| Credit note / storno | Tip na fakturi, ne u KIF | Negativni KIF red, veza na original |
| Interna potrošnja | Ne | Poseban KIF tip `02` |
| Reconciliation GK | Ne | Faza 2 (zahtijeva kontni plan) |

**Pravni okvir (obavezno citirati u kodu/komentarima):**
- [Uputa SG 83/19](https://www.uino.gov.ba/portal/wp-content/uploads/PROPISI/2_Porezi/1_PDV/5_Uputstva/H/H-15-Uputstvo-o-dostavljanju-podataka-iz-knjigovodstvenih-evidencija-elektronskim-putem-sl-glasnik-83-19-20-12-19-b-h-s.pdf) — čl. 7, 10, 11
- [Tehničko uputstvo e-KIF/e-KUF](https://www.uino.gov.ba/portal/wp-content/uploads/8-E-PROPISI/1-ePDV/3-Tehnicko-uputstvo-Dostavljanje-podataka-iz-knjigovodstvenih-evidencija.pdf)
- [Izmjene 09/2023](https://www.uino.gov.ba/portal/hr/e-usluge-hr/e-portal-2/) — tipovi dokumenata `01`–`09`

**Rokovi:** e-evidencija do **20.** u mjesecu za prethodni · porezno razdoblje = **kalendarski mjesec**

---

## 2. Arhitektura modula

```
lib/pdv/
  constants.ts          # tipovi dokumenata, kodovi partnera, PDV stope
  period.ts             # izračun period_year/month iz delivery/receipt date
  partner-ids.ts        # validacija JIB (13), PDV ID (12), strani/uvoz kodovi
  kif-mapper.ts         # Invoice → KIF zapis
  kuf-mapper.ts         # PurchaseInvoice → KUF zapis
  amounts.ts            # split po kolonama, zaokruživanje 2 dec
  validation/
    kif-rules.ts
    kuf-rules.ts
    export-gate.ts      # agregirane greške prije CSV
  export/
    csv-format.ts       # separator, decimal point, escape ;
    kif-csv.ts          # slog 1 + N×2 + slog 3
    kuf-csv.ts
    filename.ts         # XXXXXXXXXXXX YYMM 1 ZZ

app/actions/pdv/
  kif.ts                # CRUD, sync iz faktura
  kuf.ts                # CRUD ulaznih
  periods.ts            # lock/unlock, status
  export.ts             # generisanje + download

app/(dashboard)/pdv/
  page.tsx              # dashboard perioda
  [year]/[month]/
    page.tsx            # KIF + KUF tabele
    kif/novi/
    kuf/novi/
    export/
    zakljucaj/
```

**Princip:** `pdv_records` postaje **canonical ledger** za export; fakture i ulazni računi su **izvori** koji generišu/update-uju zapise, ali KUF ulazni često dolazi bez naše izlazne fakture.

---

## 3. Baza podataka

### 3.1 Migracija: proširiti `pdv_records` → `pdv_ledger_entries`

Preporuka: **rename + expand** (ili nova tabela + migracija podataka) da izbjegnemo konfuziju sa starim poljima.

```sql
-- Ključna polja (KIF + KUF zajednička)
record_type           text CHECK (kif | kuf)
period_year           int NOT NULL
period_month          int NOT NULL          -- porezni period (YYMM logika)
serial_number         int NOT NULL          -- redni br. u knjizi (1..N u periodu)

uio_document_type     text NOT NULL         -- '01'..'09'
document_number       text NOT NULL         -- broj fakture / JCI / interni doc
document_date         date NOT NULL         -- datum fakture ili JCI
receipt_date          date                  -- KUF: datum prijema (obavezno za KUF)

-- Partner snapshot (immutable nakon knjiženja)
partner_name          text NOT NULL
partner_address       text                  -- sjedište
partner_vat_id        text                  -- 12 cifara UIO ID
partner_jib           text                  -- 13 cifara
partner_kind          text                  -- domestic_vat | domestic_jib | foreign | import | physical_person

-- KIF finansijska polja (UIO kolone 11–21)
amount_total          numeric(14,2) DEFAULT 0
amount_internal_use   numeric(14,2) DEFAULT 0   -- vanposlovna / interna potrošnja
amount_export         numeric(14,2) DEFAULT 0   -- izvoz (JCI)
amount_exempt         numeric(14,2) DEFAULT 0   -- ostalo oslobođeno
base_vat_registered   numeric(14,2) DEFAULT 0   -- osnovica → PDV obveznik
vat_output_registered numeric(14,2) DEFAULT 0
base_vat_unregistered numeric(14,2) DEFAULT 0   -- osnovica → neobveznik / građanin
vat_output_unregistered numeric(14,2) DEFAULT 0
vat_field_32          numeric(14,2) DEFAULT 0   -- mapiranje na PDV prijavu
vat_field_33          numeric(14,2) DEFAULT 0
vat_field_34          numeric(14,2) DEFAULT 0

-- KUF finansijska polja (UIO kolone 12–20)
amount_without_vat    numeric(14,2) DEFAULT 0
amount_with_vat       numeric(14,2) DEFAULT 0
amount_flat_fee       numeric(14,2) DEFAULT 0   -- paušal poljoprivrednik
vat_input_total       numeric(14,2) DEFAULT 0
vat_deductible        numeric(14,2) DEFAULT 0
vat_non_deductible    numeric(14,2) DEFAULT 0
vat_non_deductible_32 numeric(14,2) DEFAULT 0
vat_non_deductible_33 numeric(14,2) DEFAULT 0
vat_non_deductible_34 numeric(14,2) DEFAULT 0

-- Odbitnost (KUF)
is_deductible         boolean DEFAULT true
deductible_percent    numeric(5,2) DEFAULT 100  -- srazmjerni odbitak
non_deductible_reason text                      -- reprezentacija, vozilo...

-- Veze
source_type           text  -- invoice_out | invoice_cn | purchase | jci | internal | manual | bank
source_id             uuid
related_entry_id      uuid REFERENCES pdv_ledger_entries(id)  -- credit note → original

-- Kontrola
status                text DEFAULT 'draft' CHECK (draft | posted | locked)
locked_at             timestamptz
created_by            uuid
notes                 text

UNIQUE (organization_id, record_type, period_year, period_month, serial_number)
```

### 3.2 Nova tabela: `purchase_invoices` (ulazni računi)

Odvojeno od `invoices` (izlazne):

```sql
purchase_invoices (
  id, organization_id, partner_id,
  supplier_invoice_number, supplier_invoice_date, receipt_date,
  supplier_is_vat_registered boolean,
  uio_document_type,           -- default '01'
  amounts...,                   -- mirror KUF kolona
  attachment_url,               -- sken PDF
  status draft|posted|cancelled,
  pdv_entry_id uuid
)
```

### 3.3 `pdv_periods` — zaključavanje

```sql
pdv_periods (
  organization_id, year, month,
  status open | locked | submitted,
  locked_at, locked_by,
  kif_exported_at, kuf_exported_at,
  kif_file_seq int DEFAULT 1,   -- ZZ u imenu fajla
  kuf_file_seq int DEFAULT 1
)
```

### 3.4 Proširenje `partners`

```sql
partner_category     text  -- domestic_company | foreign | individual | uio_customs
default_vat_treatment text -- standard | exempt | export | non_deductible_representation ...
jib_validated_at     timestamptz
vat_id_validated_at  timestamptz
```

### 3.5 Proširenje `invoices` (izlazne)

```sql
sale_category        text  -- domestic_b2b | domestic_b2c | export_goods | export_services | exempt_medical | exempt_financial | internal_use
tax_point_date       date  -- datum isporuke (default delivery_date ?? issue_date)
jci_number           text  -- za izvoz
jci_date             date
```

---

## 4. Tipovi dokumenata UIO (enum)

### KUF (`record_type = kuf`) — original + izmjene 2023

| Kod | Naziv | Izvor u app-u |
|-----|-------|---------------|
| 01 | Ulazna faktura roba/usluge (domaći) | `purchase_invoices` |
| 02 | Vlastita potrošnja (vanposlovno) | ručni / interni dokument |
| 03 | Avans primljen (dati avans) | kasnije: avans modul |
| 04 | JCI (uvoz) | forma JCI, partner = UIO, JIB/PDV = nule |
| 05 | Usluge iz inostranstva | reverse charge / usluga ino |
| 06 | KO odobrenje (dom + ino) | faza 2 |
| 07–09 | Donacije hrane, posrednik… | faza 2 (rijetko) |

### KIF (`record_type = kif`)

| Kod | Naziv | Izvor u app-u |
|-----|-------|---------------|
| 01 | Izlazna faktura | `invoices` status `open` |
| 02 | Interna / vanposlovna potrošnja | interni KIF generator |
| 03 | Avans izdat | avansna faktura `advance` |
| 04 | Izvoz (JCI) | faktura + `jci_number/date` |
| 05 | Usluge stranim licima / ostalo oslobođeno | `sale_category` |
| 06–09 | KO, donacije… | faza 2 |

---

## 5. Logika KIF — svi slučajevi

### 5.1 Trigger: kada nastaje KIF red

| Događaj | Akcija |
|---------|--------|
| Faktura `draft → open` | Kreiraj/update KIF (`source_type=invoice_out`) |
| Faktura `open → cancelled` | Storno: negativan KIF ili obriši ako period otvoren |
| Credit note `open` | KIF s **minus** iznosima, `related_entry_id` → original |
| Interna potrošnja potvrđena | KIF tip `02`, kolona `amount_internal_use` + PDV |
| Avans faktura `open` | KIF tip `03` |
| Period **locked** | Blokiraj sve izmjene; novi događaj → sljedeći otvoreni period |

### 5.2 Određivanje poreznog perioda (KIF)

```
tax_period = month(delivery_date ?? tax_point_date ?? issue_date)
```

**Pravilo:** ako je `issue_date` u julu a `delivery_date` u junu → KIF ide u **jun** (`period_month=6`).

Implementacija: `lib/pdv/period.ts` — jedna funkcija, koristi se svuda.

### 5.3 Mapiranje finansija po kategoriji prodaje

| `sale_category` | Kolone KIF |
|-----------------|------------|
| `domestic_b2b` (kupac PDV obveznik) | `base_vat_registered`, `vat_output_registered` |
| `domestic_b2c` (nije PDV obveznik) | `base_vat_unregistered`, `vat_output_unregistered` |
| `export_goods` | `amount_export`; broj/datum = **JCI** |
| `export_services` / exempt | `amount_exempt` ili `amount_export` po pravilu |
| `internal_use` | `amount_internal_use` + PDV kao prodaja sebi |

### 5.4 Partner identifikacija (KIF)

| Kupac | PDV kolona (9) | JIB kolona (10) |
|-------|----------------|-----------------|
| PDV obveznik BiH | 12-cifreni ID | prazno |
| Samo JIB | prazno | 13 cifara |
| Strani / izvoz | prazno ili po uputstvu | `999...` / prazno |
| Fizičko lice | prazno | prazno (iznos u odgovarajućoj koloni) |

Validacija: `lib/pdv/partner-ids.ts` — checksum JIB ako implementiramo, min dužina, regex.

### 5.5 Credit / debit notes

- `invoices.type = credit_note`, `credit_note_for` → obavezna veza
- Iznosi u KIF sa **negativnim predznakom** (UIO CSV format)
- `document_number` = broj knjižne obavijesti
- Ne smije preći sumu originala bez upozorenja

---

## 6. Logika KUF — svi slučajevi

### 6.1 Unos ulaznog računa (UI `/pdv/.../kuf/novi`)

Obavezna polja:
- Tip dokumenta (01 default)
- Broj i datum dobavljačeve fakture
- **Datum prijema** (≠ od datuma fakture ako knjiženje kasni)
- Partner (iz šifrarnika ili brzi unos)
- Finansijski split

### 6.2 Pravo na odbitak pretporeza

| Kategorija troška | `is_deductible` | Kolona |
|-------------------|-----------------|--------|
| Standardna nabavka | true 100% | `vat_deductible` |
| Reprezentacija, pokloni | false | `vat_non_deductible` → mapirati na 32/33/34 |
| Putnička vozila (osim rent/taxi) | false | isto |
| Mješovita upotreba | `deductible_percent` < 100 | **srazmjerni odbitak** |

UI: checkbox „PDV se odbija“ + dropdown razlog + % slider.

### 6.3 JCI uvoz (tip 04)

- `document_number` = broj JCI (ne broj ino fakture)
- `document_date` = datum JCI
- `partner_name` = „Uprava za indirektno oporezivanje“ (ili iz šifrarnika)
- `partner_vat_id` = `000000000000`, `partner_jib` = `0000000000000`
- `amount_without_vat`, `vat_input_total`, `vat_deductible` sa carinskog računa
- Ino faktura dobavljača = **prilog**, ne KUF red (ili tip 05 ako usluga)

### 6.4 Neobveznik PDV-a (mali obrt)

- `vat_input_total` = 0
- Cijeli iznos u `amount_without_vat` / `amount_with_vat` (= isti ako nema PDV)
- PDV polje partnera prazno

### 6.5 Paušal poljoprivrednik

- Posebno polje `amount_flat_fee` (UIO kolona 14 KUF)
- PDV odbitak po pravilu za otkup

### 6.6 Usluge iz inostranstva (tip 05)

- Reverse charge: PDV se **obračunava i odbija** u istom periodu (dva logička koraka u PDV prijavi; u KUF-u po uputstvu)

---

## 7. CSV export (e-Porezi)

### 7.1 Tehnička pravila (UIO)

- Format: **CSV**, ekstenzija `.csv`
- Encoding: **UTF-8**
- Separator: **`;`** (tačka-zarez zabranjen u podacima)
- Decimale: **tačka** `.`, 2 decimale (`1234.56`)
- Max veličina: **5 MB** → paginacija u više fajlova (`ZZ` = 01, 02…)
- Struktura: **slog 1** (zaglavlje) + **N × slog 2** (stavke) + **slog 3** (suma)

### 7.2 Ime datoteke

```
{PDV12}_{YYMM}_{1|2}_{ZZ}.csv
```

Primjeri iz uputstva: `123456789101_2001_1_01.csv` (KUF), `123456789102_2101_2_01.csv` (KIF).

- Separator u **imenu** je donja crta `_` (ne razmak)
- `1` = nabavke (KUF), `2` = isporuke (KIF)
- `ZZ` = redni broj datoteke u periodu (`01`, `02`…)
- PDV broj u imenu **mora se slagati** sa PDV brojem u slogu zaglavlju

### 7.3 Implementacija

```typescript
// lib/pdv/export/kuf-csv.ts
buildKufCsv(org, period, entries, fileSeq): { filename, content, warnings }

// Redoslijed polja TAČNO po Tehničkom uputstvu (Tabela 1 / 2)
// Unit test: golden file — jedan KUF i jedan KIF primjer uporediti s ručno prihvaćenim CSV-om s portala
```

### 7.4 Obaveza dostave (business rule)

- Ako nema stavki **i** PDV prijava ima nule u relevantnim poljima → **ne mora** se dostaviti taj fajl (čl. 7 st. 6–7)
- App: pri exportu pitati „Nema prometa — preskoči generisanje?“

---

## 8. Validacija prije exporta

### 8.1 Blokirajuće greške (error)

- Period zaključan bez admin override
- Nedostaje JIB/PDV gdje je obavezan
- Pogrešan format datuma
- `;` u nazivu partnera
- Zbir stavki ≠ prateći slog
- Serial number rupe (1,2,4) — upozorenje ili auto-renumber
- KUF bez `receipt_date`
- Export za budući period (prije 1. sljedećeg mjeseca)

### 8.2 Upozorenja (warning, ne blokira)

- Faktura izdana u periodu X, isporuka u periodu Y — potvrda korisnika
- Credit note bez veze na original
- Partner bez adrese (sjedište prazno)

### 8.3 UI: „Provjera prije exporta“

Stranica `/pdv/[year]/[month]/export`:
- Checklist sa greškama (crveno) i upozorenjima (žuto)
- Dugme „Preuzmi e-KIF.csv“ / „Preuzmi e-KUF.csv“ disabled dok ima errors
- Preview prvih 5 redova CSV

---

## 9. Zaključavanje poreznog perioda

### 9.1 Flow

1. Računovođa pregleda KIF/KUF + usklađenost sa PDV prijavom
2. Klik **„Zaključaj [Mjesec YYYY]“**
3. `pdv_periods.status = locked`
4. Trigger/RLS: `UPDATE/DELETE` na `pdv_ledger_entries` za taj period → odbij
5. Fakture s `tax_point_date` u locked periodu → ne mogu `open` bez override-a
6. Naknadni račun → automatski `period` = prvi otvoreni mjesec

### 9.2 Otključavanje

- Samo admin / „Ispravka greške“ s audit logom (UIO čl. 8 — ispravljena evidencija)

---

## 10. UI / rute

| Ruta | Svrha |
|------|-------|
| `/pdv` | Lista perioda (12 mj), status open/locked, brzi zbrojevi |
| `/pdv/2026/6` | Tab KIF \| KUF, sume, dugme export |
| `/pdv/2026/6/kuf/novi` | Forma ulaznog računa |
| `/pdv/2026/6/kuf/jci` | Wizard JCI uvoz |
| `/pdv/2026/6/kif/interna` | Interna potrošnja |
| `/pdv/2026/6/export` | Validacija + download |
| `/pdv/2026/6/zakljucaj` | Potvrda + lock |

Sidebar: „PDV evidencije“ samo ako `org.is_vat_registered` (pored `hasFeature('pdv')`).

---

## 11. Integracije s postojećim modulima

| Modul | Integracija |
|-------|-------------|
| **Fakture (izlazne)** | Na `open`: sync KIF; proširiti formu: kategorija prodaje, delivery_date, JCI |
| **Partneri** | JIB/PDV validacija; kategorija partnera |
| **Bankovni izvodi** | Opciono: predlog KUF iz debit transakcije (ne auto-knjizi) |
| **Organizacija** | `vat_number` (12 cifara) obavezan za export |
| **Režim d.o.o./obrt** | PDV dostupan oba tipa ako su PDV obveznici |

---

## 12. Križna provjera (faza 2)

Zahtijeva **glavnu knjigu** (konta 4700/2700…). Do tada:

- Mini izvještaj: suma KIF PDV − suma KUF odbitni = **očekivana obaveza** (poredi s `/pdv` karticom)
- Export PDF „Interni pregled KIF/KUF“ za arhivu (PLAN.md spominjao XML — **ispravka: UIO traži CSV, ne XML**)

---

## 13. Test strategija

1. **Unit:** mapiranje iznosa, period iz datuma, JIB validacija, CSV red format
2. **Golden files:** 3 KIF + 3 KUF CSV-a (domaći B2B, izvoz JCI, neobveznik KUF) — ručno testirati import na e-Porezi test okruženju
3. **Integration:** faktura open → KIF red → export → checksum slog 3
4. **E2E:** lock period → pokušaj izmjene → odbijeno

---

## 14. Faze isporuke (preporučeni redoslijed)

### Faza A — Temelj (2–3 sedmice)
- [ ] Migracija `pdv_ledger_entries` + `pdv_periods`
- [ ] `lib/pdv/period.ts`, `amounts.ts`, enums
- [ ] Refaktor auto-KIF iz faktura (delivery_date, serial_number)
- [ ] `/pdv/[year]/[month]` s izborom perioda

### Faza B — KUF jezgro (2–3 sedmice)
- [ ] `purchase_invoices` + forma unosa
- [ ] Odbitnost PDV-a (deductible / non-deductible)
- [ ] Neobveznik dobavljač
- [ ] Ručni KUF list + edit

### Faza C — KIF napredno (2 sedmice)
- [ ] Kategorije prodaje na fakturi (B2B/B2C/izvoz/oslobođeno)
- [ ] Credit note → negativni KIF
- [ ] Interna potrošnja (tip 02)
- [ ] JCI izvoz (tip 04)

### Faza D — Export (1–2 sedmice)
- [ ] KUF CSV generator + ime fajla
- [ ] KIF CSV generator
- [ ] Validaciona kapija + UI export

### Faza E — Kontrola (1 sedmica)
- [ ] Zaključavanje perioda
- [ ] Audit log
- [ ] Ispravka / re-export

### Faza F — Napredno (backlog)
- [ ] JCI uvoz KUF (tip 04) full wizard
- [ ] Tipovi 06–09 (2023)
- [ ] Srazmjerni odbitak automatski
- [ ] Usklađivanje s glavnom knjigom
- [ ] Bankovni predlozi KUF

---

## 15. Ispravke u odnosu na postojeći PLAN.md

- **Export format:** CSV (UIO), ne XML
- **`pdv_records`:** zamijeniti proširenom shemom
- **Period:** `delivery_date` / `receipt_date`, ne samo `issue_date`
- **KUF:** obavezan cjelovit modul, ne samo auto iz banke

---

## 16. Otvorena pitanja (za odluku prije Faze C)

1. Da li podržavamo **oba entiteta** (FBiH/RS/BD) ili samo BiH-wide UIO format? (trenutno: jedan UIO format)
2. Da li avansne fakture (`advance`) ulaze u MVP ili Faza F?
3. Ko smije otključati period — samo vlasnik org ili i računovođa (uloga)?
4. Da li sken ulazne fakture (Storage) ide u MVP KUF formu?

---

## 17. Analiza službenog Tehničkog uputstva UIO

> Izvor: [3-Tehnicko-uputstvo-Dostavljanje-podataka-iz-knjigovodstvenih-evidencija.pdf](https://www.uino.gov.ba/portal/wp-content/uploads/8-E-PROPISI/1-ePDV/3-Tehnicko-uputstvo-Dostavljanje-podataka-iz-knjigovodstvenih-evidencija.pdf)  
> Nadopuna: [Izmjene 09/2023](https://www.uino.gov.ba/portal/hr/e-usluge-hr/e-portal-2/) — tipovi dokumenata `01`–`09`

### 17.1 Opća pravila datoteke

| Pravilo | Vrijednost | Implikacija za app |
|---------|------------|-------------------|
| Format | `.csv` only | API route vraća `text/csv; charset=utf-8` |
| Encoding | **UTF-8** (obavezno) | Ne Windows-1250 — portal odbija pogrešan encoding |
| Separator polja | `;` (tačka-zarez) | Sanitizacija: zabraniti `;` u nazivu partnera/adresi |
| Decimalni separator | `.` (tačka) | `1234.56`, nikad zarez |
| Zaokruživanje | 2 decimale | `lib/pdv/amounts.ts` — banker's rounding ili standard half-up, konzistentno |
| Max veličina | 5 MB | Paginacija: više fajlova `_01`, `_02`… |
| Nabavke / isporuke | **Odvojeni fajlovi** | Dva export dugmeta; nikad jedan CSV |
| Više fajlova / period | Dozvoljeno | `pdv_periods.kif_file_seq`, `kuf_file_seq` |

### 17.2 Struktura CSV — tri tipa slogova

Svaki fajl = **tačno**:

```
RED 1:   slog zaglavlja  (vrsta = 1)
RED 2..N: slog stavke    (vrsta = 2)  × broj dokumenata
RED N+1: slog prateći     (vrsta = 3)
```

#### Slog zaglavlja (7 polja, KUF i KIF)

| # | Polje | KUF | KIF |
|---|-------|-----|-----|
| 1 | Vrsta sloga | `1` | `1` |
| 2 | PDV broj podnositelja | 12 cifara | 12 cifara |
| 3 | Poreski period | `YYMM` (npr. jun 2025 → `2506`) | isto |
| 4 | Tip datoteke | `1` = nabavke | `2` = isporuke |
| 5 | Redni br. datoteke u periodu | `01`, `02`… | isto |
| 6 | Datum kreiranja | `YYYY-MM-DD` | isto |
| 7 | Vrijeme kreiranja | `HH:MM:SS` | isto |

**Validacija:** polja 2, 3, 4, 5 moraju biti **identična** nazivu fajla i periodu koji korisnik bira na portalu.

#### Poreski period `YYMM`

- Prve 2 cifre = godina (`25` = 2025.)
- Zadnje 2 cifre = mjesec (`06` = juni)
- Primjer: januar 2021. = `2101`

---

### 17.3 e-KUF — slog stavke (20 polja)

| # | Polje | Max | Napomena UIO |
|---|-------|-----|--------------|
| 1 | Vrsta sloga | 1 | `2` |
| 2 | Poreski period | 4 | `YYMM` — period **prijema/evidentiranja** |
| 3 | Redni broj iz knjige | 10 | Serijski; bez vodećih nula obavezno |
| 4 | Tip dokumenta | 2 | `01`–`05` (2023+: `01`–`09`) |
| 5 | Broj fakture/dokumenta | 100 | Tip 04 → **broj JCI**; tip 05 → broj iz poslovnih knjiga |
| 6 | Datum fakture/dokumenta | 10 | Tip 04 → **datum JCI** |
| 7 | **Datum prijema** | 10 | Kad je faktura stvarno zaprimljena/evidentirana |
| 8 | Naziv dobavljača | 100 | Kao na fakturi |
| 9 | Sjedište dobavljača | 100 | Adresa |
| 10 | PDV broj dobavljača | 12 | Registrovan: UIO ID; uvoz: `000000000000`; neobveznik: **prazno** |
| 11 | JIB dobavljača | 13 | Ima JIB: 13 cifara; uvoz: `0000000000000`; nema: **prazno** |
| 12 | Iznos **bez** PDV-a | 25 | Prazno ako nema vrijednosti |
| 13 | Iznos **sa** PDV-om | 25 | |
| 14 | Paušalna naknada | 25 | Poljoprivredni otkup |
| 15 | Ulazni PDV (ukupno) | 25 | Cijeli PDV sa fakture |
| 16 | Ulazni PDV **odbitni** | 25 | |
| 17 | Ulazni PDV **neodbitni** | 25 | |
| 18 | Neodbitni → polje **32** PDV prijave | 25 | |
| 19 | Neodbitni → polje **33** | 25 | |
| 20 | Neodbitni → polje **34** | 25 | |

#### Tip dokumenta KUF (bazno uputstvo)

| Kod | Značenje |
|-----|----------|
| 01 | Ulazne fakture roba/usluge iz zemlje |
| 02 | Vlastita potrošnja (vanposlovno) |
| 03 | Avansna (dati avans) |
| 04 | **JCI (uvoz)** |
| 05 | Usluge iz inostranstva / ostalo |

#### Slog prateći KUF (11 polja)

- Polje 1 = `3`
- Polja 2–10 = **suma** kolona 12–20 svih stavki
- Polje 11 = ukupan broj stavki (slogova tipa 2)

---

### 17.4 e-KIF — slog stavke (21 polja)

**Bitna razlika od KUF:** nema kolone „datum prijema“ — samo datum fakture/JCI.

| # | Polje | Max | Napomena |
|---|-------|-----|----------|
| 1 | Vrsta sloga | 1 | `2` |
| 2 | Poreski period | 4 | `YYMM` |
| 3 | Redni broj iz knjige | 10 | |
| 4 | Tip dokumenta | 2 | `01`–`05` (2023+: `01`–`09`) |
| 5 | Broj fakture/dokumenta | 100 | Tip 04 → **broj JCI** (izvoz) |
| 6 | Datum fakture/dokumenta | 10 | Tip 04 → **datum JCI** |
| 7 | Naziv kupca | 100 | |
| 8 | Sjedište kupca | 100 | |
| 9 | PDV broj kupca | 12 | PDV obveznik: UIO ID; izvoz: `000000000000`; inače prazno |
| 10 | JIB kupca | 13 | Ima JIB: 13 cifara; izvoz: `0000000000000`; više PJ → JIB **one jedinice kojoj je faktura** |
| 11 | Iznos fakture/dokumenta | 25 | Ukupan iznos računa |
| 12 | Interna faktura (vanposlovno) | 25 | Tip 02 |
| 13 | Izvoz (carinske isprave) | 25 | Tip 04 |
| 14 | Ostalo oslobođeno PDV-a | 25 | |
| 15 | Osnovica → PDV obveznik | 25 | B2B domaći |
| 16 | Izlazni PDV → PDV obveznik | 25 | |
| 17 | Osnovica → nije PDV obveznik | 25 | B2C / neobveznik |
| 18 | Izlazni PDV → nije PDV obveznik | 25 | |
| 19 | Izlazni PDV → polje 32 prijave | 25 | |
| 20 | → polje 33 | 25 | |
| 21 | → polje 34 | 25 | |

#### Tip dokumenta KIF

| Kod | Značenje |
|-----|----------|
| 01 | Izlazna faktura roba/usluge |
| 02 | Vlastita potrošnja |
| 03 | Avansna (primljeni avans) |
| 04 | **JCI (izvoz)** |
| 05 | Usluge stranom licu / ostalo oslobođeno |

#### Slog prateći KIF (13 polja)

- Polje 1 = `3`
- Polja 2–12 = suma kolona 11–21 stavki
- Polje 13 = broj stavki

---

### 17.5 Pravila koja UIO eksplicitno validira

1. **PDV/JIB partnera** — fiksne nule za uvoz/izvoz; prazno za neobveznike
2. **Prazna numerička polja** — dozvoljena ako nema prometa u toj kategoriji
3. **Prateći slog** — zbirovi moraju tačno odgovarati stavkama (portal prijavljuje red + kolonu)
4. **Zabrana `;`** u tekstualnim poljima
5. **Ime fajla** ↔ zaglavlje — PDV, period, tip (1/2), redni broj datoteke

---

### 17.6 Srazmjerni odbitak (UIO „Moguće nedoumice“)

Za KUF, UIO propisuje **tri kolone**, ne samo postotak:

```
a) iznos ulaznog PDV-a     = CIJELI PDV sa fakture        (kol. 15)
b) ulazni PDV odbitni      = PDV × % srazmjernog odbitka  (kol. 16)
c) ulazni PDV neodbitni    = a − b                         (kol. 17)
```

Razlika ide u krajnju potrošnju + mapiranje na polja 32/33/34 ako je propisano.

---

### 17.7 Isporuke fizičkim licima (B2C)

UIO dozvoljava:

- **Pojedinačno** — broj = broj računa, datum = datum računa
- **Zbirno po danu** — broj = broj dnevnog fiskalnog izvještaja, datum = taj dan
- **Zbirno po mjesecu** — broj = broj mjesečnog fiskalnog izvještaja, datum = **posljednji dan mjeseca**

→ Za MVP: pojedinačne fakture; faza 2: zbirni KIF red za maloprodaju/fiskalnu kasu.

---

### 17.8 Portal e-Porezi — workflow (bitno za UX)

```
Učitaj CSV → status "Obrađeno" → (može obrisati)
           → "Podnesi" → status "Podneseno" (aktivno)
```

**Ispravka greške:** link „Izmjena postojećeg podnesenog perioda“ — ako je bilo **više fajlova** za period, pri ispravci moraju se učitati **svi novi**; stari gube status aktivne.

→ Naš app: verzionisanje exporta + upozorenje „ispravka zamjenjuje cijeli set datoteka za period“.

---

### 17.9 Šta bazno uputstvo NE pokriva (treba 2023. dopunu)

| Tema | Bazni PDF | Izmjene 09/2023 |
|------|-----------|----------------|
| Tip dokumenta | `01`–`05` | Prošireno na `01`–`09` (KO, donacije hrane…) |
| KUF tip 05 | „Ostalo / inostranstvo“ | Preciziran tekst |
| KIF tip 05 | Usluge stranom licu | Isto + novi tipovi 06–09 |

Implementacija: `lib/pdv/constants.ts` — verzionirati enum; default `01`–`05` u MVP, `06`–`09` u Fazi F.

---

### 17.10 Mapiranje: naš `pdv_records` → UIO

| Danas (`pdv_records`) | UIO polje | Status |
|-----------------------|-----------|--------|
| `base_17`, `vat_17` | KIF kol. 15–16 ili 17–18 | Nedovoljno — ne razlikuje B2B/B2C |
| `base_0` | KIF kol. 13–14 | Grubo |
| `total` | KIF kol. 11 | Djelimično |
| `partner_tax_id` | JIB ili PDV | Ne razlikuje koja kolona |
| `entry_date` | KIF kol. 6 / KUF kol. 6–7 | KUF nema `receipt_date` |
| `document_type` free text | Kol. 4 (`01`–`09`) | Ne |
| `deductible`, `deductible_pct` | KUF kol. 15–17 | Postoji u DB, nema logike |
| — | Paušal kol. 14 | Ne |
| — | Polja 32/33/34 | Ne |
| — | Slog zaglavlje/prateći | Ne |

---

### 17.11 Checklist validacije prije exporta (iz uputstva)

- [ ] PDV broj org = 12 cifara, isti u imenu fajla i slogu 1
- [ ] Period `YYMM` konzistentan u zaglavlju, svim stavkama i imenu fajla
- [ ] Redni brojevi u knjizi (kol. 3) jedinstveni u fajlu
- [ ] Tip dokumenta odgovara broju/datumu (JCI za tip 04)
- [ ] PDV/JIB partnera po pravilima (nule/prazno)
- [ ] Nijedno polje ne sadrži `;`
- [ ] Svi iznosi format `999999999.99`
- [ ] Prateći slog = suma stavki
- [ ] Broj redova u pratećem slogu = broj stavki
- [ ] Fajl < 5 MB; inače split na `_02`, `_03`…

---

*Dokument generisan za implementaciju u repo `racunovodstvo`. Sljedeći korak: Faza A migracija + `lib/pdv/`.*
