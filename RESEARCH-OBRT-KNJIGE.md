# Research: Knjige za samostalne djelatnosti (FBiH) — Gap analiza

> Datum: 2026-06-30  
> Izvor: Analiza Excel predloška `1.Knjige za samostalne djelatnosti.xls` + web istraživanje FBiH propisa (obrt.ba, pufbih.ba, advokat-prnjavorac.com, finprofi.ba, chronos.ba, orfis.ba) + analiza koda i baze podataka

---

## Pregled

Excel predložak koji koristimo kao referencu sadrži 4 obavezne poslovne knjige propisane **Pravilnikom o primjeni Zakona o porezu na dohodak FBiH** (Sl. novine FBiH br. **67/08**, izmjene: 4/10, 86/10, 10/11, 53/11, 20/12, 27/13, 71/13, 90/13, 45/14, 52/16, 59/16, prečišćeni tekst **48/21**) donesenim temeljem **Zakona o porezu na dohodak FBiH** (Sl. novine FBiH br. 10/08, 9/10, 44/11, 7/13, 65/13, 1/17, 75/21).

> **Važna ispravka:** U Excel predlošku se koriste nazivi PSS-1043 i PLDI-1043 naizmjenično. Verifikacijom na pufbih.ba i u Pravilniku potvrđeno je da **PSS-1043 nije zvanični naziv** — jedini ispravni i pravno obavezujući naziv je **PLDI-1043** (Popisna lista dugotrajne imovine). "PSS" je neslužbeni skraćenica koja kruži u praksi.

| # | Obrazac | Naziv | Obavezni za |
|---|---------|-------|-------------|
| 1 | KPR-1041 | Knjiga prihoda i rashoda | Obrtnici na stvarnom dohotku |
| 2 | KP-1042 | Knjiga prometa | Paušalni obrtnici |
| 3 | PSS-1043 / PLDI-1043 | Popis stalnih sredstava / Popisna lista dugotrajne imovine | Svi obrtnici s dugotrajnom imovinom |
| 4 | EPO-1044 | Evidencija potraživanja i obaveza | Svi obrtnici koji ne naplaćuju odmah |

---

## 1. KPR-1041 — Knjiga prihoda i rashoda

### Pravni temelj
- **Zakon o porezu na dohodak FBiH**, čl. 17 — obaveza vođenja poslovnih knjiga  
- **Pravilnik**, čl. 45(3) i čl. 48 — sadržaj i forma KPR-1041  
- Obavezna za sve obrtnike na **stvarnom dohotku**
- Ažurnost: mora se popuniti **do 15. u mjesecu** za prethodni mjesec (čl. 46)

### Kolone obrasca (zvanična forma)

| Kolona | Naziv | Napomena |
|--------|-------|----------|
| 7 | Redni broj | Auto-sequence |
| 8 | Datum prihoda/rashoda | Date field |
| 9 | Broj dokumenta | Invoice/bank ref |
| 10 | Opis dokumenta | Free text |
| **PRIHODI** | | |
| 11 | Prihodi u gotovini | `income_cash` |
| 12 | Prihodi preko bankovnog računa | `income_bank` |
| 13 | Prihodi u stvarima i uslugama | `income_other` |
| 14 | **PDV u prihodima** | `income_vat` — ⚠️ nedostaje u DB |
| 15 | Ukupni prihodi (11+12+13−14) | `income_total` |
| **RASHODI** | | |
| 16 | U robi / materijalima | `expense_goods` |
| 17 | Bruto plaće zaposlenika | `expense_salaries` |
| 18 | Plaćeni doprinosi vlasnika | `expense_contribs` |
| 19 | Ostali rashodi | `expense_other` |
| 20 | **PDV u rashodima** | `expense_vat` — ⚠️ nedostaje u DB |
| 21 | Ukupni rashodi (16+17+18+19−20) | `expense_total` |

### Veza s ostalim obrascima
- Zbir col. 15 i 21 → **SPR-1053** (Dio 2 i Dio 3) → **Obrazac 1052** (godišnja porezna prijava)
- Amortizacija iz PLDI-1043 → SPR-1053, red 22 (nije direktno u KPR-1041 kao cash transakcija)

### Stanje u projektu

#### Baza podataka — `kpr_entries`
```
migration 010 + 018 + 026
```

| DB kolona | Status |
|-----------|--------|
| entry_number, year, entry_date | ✅ |
| document_type, document_number | ✅ |
| partner_name, partner_tax_id, partner_id | ✅ |
| description | ✅ |
| income_cash | ✅ (migration 018) |
| income_bank | ✅ (migration 018) |
| income_other | ✅ (migration 018) |
| income_total | ✅ (migration 018) |
| expense_goods | ✅ (migration 018) |
| expense_salaries | ✅ (migration 018) |
| expense_contribs | ✅ (migration 018) |
| expense_other | ✅ (migration 018) |
| expense_total | ✅ (migration 018) |
| **income_vat** | ❌ nedostaje |
| **expense_vat** | ❌ nedostaje |
| transaction_id (auto iz banke) | ✅ |
| invoice_id (auto iz fakture) | ✅ |

#### UI — `/kpr` stranica
- ✅ Forma za unos ima sve prihod/rashod podkategorije
- ⚠️ Prikaz liste prikazuje samo ukupne iznose (ne i razradu po kolonama)
- ❌ Nema PDF generatora koji popunjava zvanični KPR-1041 obrazac

#### Auto-popunjavanje
- ✅ Bankovne transakcije se mogu automatski prebaciti u KPR (feature: `kpr_auto_from_bank`)
- ✅ Fakture imaju vezu na KPR entry (`invoice_id`)

### Šta treba uraditi

| Prioritet | Zadatak | Složenost |
|-----------|---------|-----------|
| 🔴 VISOK | Dodati `income_vat` i `expense_vat` kolone u DB (nova migracija) | Niska |
| 🔴 VISOK | KPR-1041 PDF generator — popuniti zvanični obrazac iz DB podataka | Srednja |
| 🟡 SREDNJI | Prikaz liste proširiti na razradu po podkategorijama | Niska |
| 🟢 NIZAK | Validacija: total = suma podkategorija (frontend + DB constraint) | Niska |

### Nova migracija (prijedlog)
```sql
-- 031_kpr_pdv_columns.sql
ALTER TABLE kpr_entries
  ADD COLUMN IF NOT EXISTS income_vat   numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_vat  numeric(14,2) DEFAULT 0;
```

---

## 2. KP-1042 — Knjiga prometa

### Pravni temelj
- **Zakon o porezu na dohodak FBiH**, čl. 31+ (paušalni porez)
- **Pravilnik**, čl. 11–14 — sadržaj KP-1042
- **Pravilnik o uvjetima i načinu utvrđivanja paušalnog prihoda i paušalnog poreza** (Sl. novine FBiH)
- Obavezna **ISKLJUČIVO** za obrtnike na **paušalnom** načinu oporezivanja

### Razlika KP-1042 vs KPR-1041

| | KPR-1041 | KP-1042 |
|---|----------|---------|
| Korisnici | Stvarni dohodak | Paušalni obrtnici |
| Prati | Prihodi + rashodi | Samo promet (prihodi) |
| Svrha | Osnova za SPR-1053 i godišnju prijavu | Praćenje obrta za paušal prag |
| Složenost | 15 kolona | 7 kolona |

### Kolone obrasca (čl. 49 Pravilnika — zvanična forma)

> **Ispravka vs Excel predložak:** Excel koristi "gotovina" i "čekovi" kao dvije odvojene kolone. Zvanični Pravilnik (čl. 49) ima drugačiju strukturu — gotovina i čekovi su u **istoj koloni 12**, a kolona 13 je za **bezgotovinsko plaćanje od pravnih lica** (fakture plaćene bankovnim transferom).

| Kolona | Naziv (iz Pravilnika) | Tip |
|--------|----------------------|-----|
| 8 | Redni broj | int |
| 9 | Datum naplate | date |
| 10 | Broj isprave / naloga | text |
| 11 | Opis isprave | text |
| 12 | Iznos naplaćen u gotovini i/ili čekovima | numeric |
| 13 | Prihodi naplaćeni bezgotovinskom na osnovu ispostavljene fakture (od pravnih lica) | numeric |
| 14 | Ukupno naplaćeno (12 + 13) | numeric (computed) |

**Frekvencija unosa:** Gotovinski iznos se unosi **na kraju radnog dana**, najkasnije prije početka sljedećeg radnog dana (dnevna obaveza).

### Stanje u projektu

| Sloj | Status |
|------|--------|
| Baza podataka | ❌ **Nema tabele** |
| Server actions | ❌ Nema |
| UI stranica | ❌ Nema |
| PDF generator | ❌ Nema |
| Veza s bankovnim izvodima | ❌ Nema |

### Šta treba uraditi

#### Nova DB migracija
```sql
-- 031_kp_entries.sql
-- Kolone prema čl. 49 Pravilnika (gotovina+čekovi zajedno, bezgotovinsko od pravnih lica odvojeno)
CREATE TABLE IF NOT EXISTS kp_entries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number      int         NOT NULL,
  year              int         NOT NULL,
  entry_date        date        NOT NULL,
  document_number   text,
  document_type     text,
  cash_amount       numeric(14,2) NOT NULL DEFAULT 0,  -- kol. 12: gotovina + čekovi
  noncash_amount    numeric(14,2) NOT NULL DEFAULT 0,  -- kol. 13: bezgotovinsko od pravnih lica
  total_amount      numeric(14,2) GENERATED ALWAYS AS (cash_amount + noncash_amount) STORED, -- kol. 14
  transaction_id    uuid        REFERENCES transactions(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, year, entry_number)
);

ALTER TABLE kp_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kp_entries_owner" ON kp_entries
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );
```

#### Nova feature u `regime.ts`
```typescript
// Dodati u OrgFeature type:
"kp" // Knjiga prometa (paušalni obrtnici)

// Dodati u FEATURES_BY_TYPE:
obrt: new Set([
  "kpr",           // stvarni dohodak
  "kp",            // paušalni (ne isključuje kpr nužno)
  "kpr_auto_from_bank",
  "owner_tax_regime",
  ...
])
```

> **Napomena**: Razmisliti da li korisnik može imati obje knjige (KPR-1041 + KP-1042) ili samo jednu. U teoriji, paušalni obrtnik ne treba KPR-1041, ali u praksi neki vode oboje radi kontrole.

#### Nove stranice
- `/kp` — pregled Knjige prometa (sličan layout kao `/kpr`)
- `/kp/novi` — ručni unos
- Auto-unos iz bankovnih transakcija (gotovinska = cash_amount, bankovna = cheque_amount)
- `/api/pdf/kp-1042` — PDF generator zvaničnog obrasca

| Prioritet | Zadatak | Složenost |
|-----------|---------|-----------|
| 🔴 VISOK | Nova DB tabela `kp_entries` | Niska |
| 🔴 VISOK | UI stranica `/kp` + forma | Niska–Srednja |
| 🟡 SREDNJI | Auto-popunjavanje iz bankovnih transakcija | Srednja |
| 🟡 SREDNJI | PDF generator KP-1042 | Srednja |
| 🟢 NIZAK | Godišnji sumarni pregled (promet po kvartalima) | Niska |

---

## 3. PLDI-1043 — Popisna lista dugotrajne imovine

### Pravni temelj
- **Zakon o porezu na dohodak FBiH** (Sl. novine FBiH br. 10/08)
- **Pravilnik**, **čl. 50** — propisuje formu, sadržaj i sve kolone PLDI-1043
- **Pravilnik**, **čl. 35** — propisuje stope i metodu amortizacije
- Obavezna za sve obrtnike koji posjeduju dugotrajnu imovinu (vijek trajanja > 1 godina)
- Prag: sredstva **ispod 1.000 KM** pojedinačne nabavne vrijednosti mogu se odmah evidentirati kao rashod (čl. 35 st. 7) i ne moraju ući u PLDI

### Metoda amortizacije
- FBiH za porez na dohodak (obrtnici): **ISKLJUČIVO proporcionalna (linearna) metoda** — degresivna nije dozvoljena
- Formula: `Godišnja amortizacija = Nabavna vrijednost × Stopa / 100`
- Amortizacija se računa na **originalnu nabavnu vrijednost** (col. 12), ne na opadajuću knjigovodstvenu
- Za sredstvo nabavljeno **tokom godine**: pro-rata = `NV × Stopa × Broj_mjeseci / 12`, amortizacija počinje **prvog dana narednog mjeseca** od dana stavljanja u upotrebu
- **Uvećana amortizacija**: dozvoljena do 50% iznad normalne stope za opremu za zaštitu okoliša i imovinu pod intenzivnim uvjetima rada (ista linearna baza)

### Propisane maksimalne stope (čl. 35 Pravilnika)

| Vrsta imovine | Maks. stopa | Orijentacijski vijek |
|---------------|-------------|----------------------|
| Stambeni objekti, hoteli, restorani | 5% | 20 god |
| Administrativni/kancelarijski objekti | 3% | 33 god |
| Ostali građevinski objekti — opći | 10% | 10 god |
| Ceste, komunalni objekti, željeznice | 14,3% | 7 god |
| Oprema, vozila, postrojenja — opće | 20% | 5 god |
| Vodovod i kanalizacija | 14,3% | 7 god |
| **Računarska oprema i softver** | **33,3%** | **3 god** |
| Višegodišnji zasadi | 14,3% | 7 god |
| Priplodna stoka | 40% | 2,5 god |
| Nematerijalna imovina | 20% | 5 god |

### Kolone obrasca

| Kolona | Naziv | DB kolona |
|--------|-------|-----------|
| 8 | Redni broj | auto |
| 9 | Naziv sredstva | `name` ✅ |
| 10 | Datum nabavke | `acquisition_date` ✅ |
| **11** | **Broj dokumenta** | `document_number` ❌ **nedostaje** |
| 12 | Nabavna vrijednost | `acquisition_cost` ✅ |
| 13 | KV početak godine | (computed iz `fixed_asset_years`) ✅ |
| 14 | Vijek trajanja | `useful_life_years` ✅ |
| 15 | Stopa amortizacije | `depreciation_rate` ✅ |
| 16 | Iznos amortizacije (12×15/100) | `fixed_asset_years.annual_amount` ✅ |
| 17 | KV kraj godine (13−16) | `fixed_asset_years.book_value` ✅ |

### Veza s KPR-1041 i SPR-1053
- Godišnja amortizacija (suma kol. 16) **OBAVEZNO** se unosi u KPR-1041 kao rashod na kraju poreznog perioda (31.12.), pod "ostali rashodi", s referencom na redni broj sredstva iz PLDI-1043 kao source dokument
- PLDI amortizacija → KPR-1041 rashod (ostalo) → SPR-1053, red 22 (Amortizacija) → smanjuje oporezivi dohodak
- Ovo je **non-cash trošak** — evidentira se jednim godišnjim unosom u KPR-1041 na kraju godine
- **Implikacija za sistem**: Kada korisnik zatvori PLDI za godinu, sistem bi trebao automatski predložiti KPR-1041 unos za ukupnu amortizaciju
- Poslovne knjige se čuvaju **5 godina** od podnošenja porezne prijave (čl. 47 Pravilnika)

### Stanje u projektu

#### Baza podataka
- ✅ `fixed_assets` tabela postoji (migration 012)
- ✅ `fixed_asset_years` tabela postoji (migration 012)
- ❌ Nedostaje `document_number` kolona u `fixed_assets`

#### UI — `/obrasci/pldi` (i `/app/(tools)/pldi`)
- ✅ Kompletna forma sa svim kolonama
- ✅ PDF generator koji popunjava zvanični PLDI-1043 obrazac
- ✅ Predefinisane stope po vrsti imovine
- ❌ **KRITIČNO: UI je CLIENT-SIDE ONLY** — podaci se gube pri refreshu stranice
- ❌ UI ne čita niti upisuje u `fixed_assets` DB tabelu
- ❌ Nema perzistentnih podataka — svaki put unos ispočetka

### Šta treba uraditi

| Prioritet | Zadatak | Složenost |
|-----------|---------|-----------|
| 🔴 VISOK | Povezati PLDI UI s `fixed_assets` DB tabelom (CRUD) | Srednja |
| 🔴 VISOK | Dodati `document_number` u `fixed_assets` migracija | Niska |
| 🟡 SREDNJI | Auto-izračun i upis `fixed_asset_years` na kraju godine | Srednja |
| 🟡 SREDNJI | Stranica u dashboardu (ne samo alat) s CRUD operacijama | Srednja |
| 🟢 NIZAK | Amortizacija se automatski nudi kao trošak u KPR-1041 | Visoka |

#### Nova migracija (prijedlog)
```sql
-- 031_fixed_assets_doc_number.sql
ALTER TABLE fixed_assets
  ADD COLUMN IF NOT EXISTS document_number text;
```

#### Arhitekturalna promjena
PLDI stranicu (`/app/(tools)/pldi` i `/app/(dashboard)/obrasci/pldi`) treba pretvoriti iz stateless client-side forme u:
1. Server component koji čita `fixed_assets` iz DB
2. Client form za dodavanje/uređivanje sredstava
3. PDF se i dalje generira iz DB podataka (ne iz client state)

---

## 4. EPO-1044 — Evidencija potraživanja i obaveza

### Pravni temelj
- **Zakon o porezu na dohodak FBiH** (Sl. novine FBiH br. 10/08)
- **Pravilnik**, **čl. 51** — propisuje formu, sadržaj i sve kolone EPO-1044
- **Pravilnik**, čl. 45(3) — EPO-1044 je na listi obaveznih knjiga za obrtnike koji vode detaljne evidencije
- Obavezna za sve obrtnike koji imaju **bilo kakva nenaplaćena potraživanja ili neplaćene obaveze**
- Rok unosa: **30 dana po isteku poreznog perioda** (čl. 51), ali preporučuje se ažurno vođenje
- **Posebnost**: EPO-1044 je **jedina** od 4 knjige za koje je eksplicitno dozvoljeno **elektronsko vođenje** — ostale moraju biti u pisanoj formi

### Svrha
Premošćuje razliku između **principa blagajne** (KPR-1041 — prihod u trenutku naplate) i **fakturisanog principa** (faktura izdata, ali još nenaplaćena). EPO-1044 prati stanje između i daje revizorski trag koji povezuje fakturu s KPR-1041 unosom koji bilježi stvarno plaćanje.

### Kolone obrasca

**Strana POTRAŽIVANJA (izdate fakture — kupci):**

| Kolona | Naziv | DB ekvivalent |
|--------|-------|---------------|
| 7 | Redni broj | auto |
| 8 | Naziv kupca | `invoices.buyer_name` / `partners.name` |
| 9 | Broj računa | `invoices.invoice_number` ✅ |
| 10 | Datum izdavanja | `invoices.issue_date` ✅ |
| 11 | Iznos u KM | `invoices.total_amount` ✅ |
| 12 | Datum naplate | ⚠️ postoji kao status, ali nije explicit datum |
| 13 | Naplaćeni iznos KM | ❌ nema partial payment tracking |

**Strana OBAVEZE (primljeni računi — dobavljači):**

| Kolona | Naziv | DB ekvivalent |
|--------|-------|---------------|
| 14 | Broj računa (primljenog) | ❌ nema tabele |
| 15 | Datum prijema | ❌ nema tabele |
| 16 | Iznos obaveze KM | ❌ nema tabele |
| 17 | Datum plaćanja | ❌ nema tabele |
| 18 | Plaćeni iznos KM | ❌ nema tabele |

**Unakrsna referenca:**

| Kolona | Naziv | DB ekvivalent |
|--------|-------|---------------|
| 19 | Redni broj u KPR-1041 | ⚠️ `kpr_entries.invoice_id` postoji ali nije bidirekcijalan |

### Stanje u projektu

| Funkcionalnost | DB | UI |
|---------------|----|----|
| Izdate fakture (potraživanja) | ✅ `invoices` | ✅ `/fakture` |
| Datum naplate fakture | ⚠️ samo status (paid/unpaid) | ⚠️ nema exact date |
| Partial payments | ❌ | ❌ |
| Primljene fakture (obaveze) | ❌ nema tabele | ❌ |
| Veza EPO → KPR-1041 | ⚠️ djelimično (invoice_id u kpr) | ❌ ne prikazano |
| EPO-1044 zvanični prikaz | ❌ | ❌ |
| EPO-1044 PDF | ❌ | ❌ |

### Šta treba uraditi

#### Nova DB migracija — primljene fakture
```sql
-- 032_received_invoices.sql
CREATE TABLE IF NOT EXISTS received_invoices (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_id        uuid        REFERENCES partners(id) ON DELETE SET NULL,
  partner_name      text        NOT NULL,
  partner_tax_id    text,
  invoice_number    text,
  invoice_date      date        NOT NULL,
  received_date     date,
  amount            numeric(14,2) NOT NULL,
  payment_date      date,
  paid_amount       numeric(14,2) DEFAULT 0,
  kpr_entry_id      uuid        REFERENCES kpr_entries(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE received_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "received_invoices_owner" ON received_invoices
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );
```

#### Izmjena postojeće `invoices` tabele
```sql
-- Dodati explicit payment_date i paid_amount za partial payments
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS paid_amount  numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpr_entry_id uuid REFERENCES kpr_entries(id) ON DELETE SET NULL;
```

#### Nove stranice
- `/epo` — EPO-1044 kombinovani prikaz (potraživanja + obaveze)
- `/epo/primljene-fakture` — CRUD za primljene fakture
- `/api/pdf/epo-1044` — PDF generator

| Prioritet | Zadatak | Složenost |
|-----------|---------|-----------|
| 🔴 VISOK | Nova tabela `received_invoices` (primljene fakture) | Niska |
| 🔴 VISOK | UI za primljene fakture (CRUD) | Srednja |
| 🟡 SREDNJI | EPO-1044 kombinirani prikaz (potraživanja + obaveze) | Srednja |
| 🟡 SREDNJI | Veza issued invoices → KPR-1041 entry (bidirekcijalna) | Niska |
| 🟡 SREDNJI | Partial payment tracking na fakturama | Srednja |
| 🟢 NIZAK | EPO-1044 PDF generator | Srednja |

---

## Sažetak — Prioritetna matrica

### Šta postoji u bazi, ali nije spojeno s UI-jem
| Tabela | Problem |
|--------|---------|
| `fixed_assets` | Postoji u DB, ali PLDI UI ga ne koristi |
| `fixed_asset_years` | Postoji u DB, nikad se ne popunjava |
| `kpr_entries.invoice_id` | Postoji FK, ali nije bidirekcijalna veza |

### Šta nedostaje u bazi

| Šta nedostaje | Za koji obrazac | Prioritet |
|---------------|----------------|-----------|
| `income_vat`, `expense_vat` u `kpr_entries` | KPR-1041 kol. 14 i 20 | 🔴 |
| `document_number` u `fixed_assets` | PLDI-1043 kol. 11 | 🟡 |
| Cijela tabela `kp_entries` | KP-1042 | 🔴 |
| Cijela tabela `received_invoices` | EPO-1044 (obaveze strana) | 🔴 |
| `payment_date`, `paid_amount`, `kpr_entry_id` na `invoices` | EPO-1044 (potraživanja strana) | 🟡 |

### Redosljed implementacije (preporučeni)

```
Sprint 1 — Migracije (bez UI promjena, čisto DB)
  031a: ADD income_vat, expense_vat TO kpr_entries
  031b: ADD document_number TO fixed_assets
  031c: CREATE TABLE kp_entries
  031d: CREATE TABLE received_invoices
  031e: ADD payment_date, paid_amount, kpr_entry_id TO invoices

Sprint 2 — Knjiga prometa KP-1042
  - Nova stranica /kp + forma + auto iz banke
  - PDF generator KP-1042

Sprint 3 — PLDI persistencija
  - Refaktorisati /obrasci/pldi da čita/upisuje iz fixed_assets DB
  - Server component + client form hybrid

Sprint 4 — Primljene fakture (EPO obaveze strana)
  - CRUD /epo/primljene-fakture
  - Veza na KPR-1041

Sprint 5 — EPO-1044 kompletno
  - Kombinirani prikaz potraživanja + obaveze
  - PDF generator

Sprint 6 — KPR-1041 finalizacija
  - Dodati PDV kolone u UI formu
  - PDF generator zvaničnog KPR-1041 obrasca
```

---

## Napomena o DOO-u

Ovaj document pokriva isključivo knjige za obrtnike (samostalne djelatnosti). Za DOO postoje posebni zahtjevi koji su analizirani odvojeno. DOO ne koristi KPR-1041, KP-1042 niti EPO-1044 — ima potpuno drugačiji set obaveza (dvojno knjigovodstvo, finansijski izvještaji → FIA, prijava poreza na dobit).

---

## Izvori

| Izvor | Sadržaj |
|-------|---------|
| [Zakon o porezu na dohodak FBiH](https://advokat-prnjavorac.com) — Sl. novine FBiH br. 10/08, 75/21 | Primarna pravna obaveza vođenja knjiga |
| [Pravilnik o primjeni Zakona o porezu na dohodak FBiH](https://advokat-prnjavorac.com/Pravilnik-o-primjeni-Zakona-o-porezu-na-dohodak-FBiH.html) — Sl. novine FBiH br. 67/08, prečišćen 48/21 | Čl. 35, 45, 46, 47, 48, 50, 51 — sve kolone sva 4 obrasca |
| [PLDI-1043 zvanični PDF obrazac — pufbih.ba](https://www.pufbih.ba/v1/public/upload/obrasci/69756-pldi_bs_int2.pdf) | Potvrda naziva i kolona |
| [obrt.ba — KPR-1041](https://obrt.ba/knjiga/prihoda-rashoda) | Opis i struktura KPR-1041 |
| [obrt.ba — KP-1042](https://obrt.ba/knjiga/prometa) | Opis i struktura KP-1042 |
| [obrt.ba — EPO-1044](https://obrt.ba/knjiga/epo) | Opis i struktura EPO-1044 |
| [finprofi.ba — Amortizacija](https://finprofi.ba/view-more/amortizacija/173) | Potvrda stopa (čl. 35) |
| [chronos.ba — Poslovne knjige](https://chronos.ba/poslovne-knjige-poduzetnika/) | Elektronsko vođenje EPO-1044 |
| [orfis.ba — EPO-1044](https://orfis.ba/download/evidencija-potrazivanja-i-obaveza-obrazac-epo-1044/) | Preuzimanje obrasca |
| [KPR-1041 zvanični PDF — pufbih.ba](https://www.pufbih.ba/v1/public/upload/obrasci/916be-obrazac_1041_knjigaprihodarashoda.pdf) | Zvanični obrazac |
| [KP-1042 zvanični PDF — pufbih.ba](https://www.pufbih.ba/v1/public/upload/obrasci/9f5ee-obrazac_1042_knjigaprometaint2.pdf) | Zvanični obrazac |
| [SPR-1053 zvanični PDF — pufbih.ba](https://www.pufbih.ba/v1/public/upload/obrasci/e9c46-spr-1053_bs_int2.pdf) | Zvanični obrazac |
| [GPD-1051 zvanični PDF — pufbih.ba](https://www.pufbih.ba/v1/public/upload/obrasci/a9d63-94b8a-obrazac_gpd_1051_ver1__bos_web2.pdf) | Godišnja prijava dohotka |
