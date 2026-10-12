# Implementation Plan: Gemify feedback prototip

**Branch:** `001-event-feedback` | **Date:** 2026-10-10 | **Spec:** [spec.md](spec.md)
**Input:** `plan-hakaton/spec.md`
**Status:** korisnik je posle pregleda plana 2026-10-10 zatražio implementaciju prve faze. Napredak je u tasks.md, a rezultati u verification.md.

## Summary

Angular SPA za dva korisnička toka, Node/Express REST API i memorijske strukture u jednom procesu. Backend je jedini izvor podataka o organizatorima, sesijama, anketama i predajama. Javna forma ne zahteva nalog. Organizatorske rute proveravaju sesiju i vlasništvo.

Prva faza je završena sa placeholder dugmetom. Korisnik je 2026-10-10 odobrio drugu fazu: „Sumiraj” poziva backend i Gemmu preko Gemini API-ja za sve predaje iz izabrane ankete. API ključ je u backend/.env.

## Technical Context

| Stavka | Predlog |
| --- | --- |
| Frontend | Angular 21 LTS, TypeScript 5.9, standalone komponente, Router, HttpClient |
| Backend | Node.js 24 LTS, Express 5, TypeScript |
| Obrasci | Angular Reactive Forms i FormArray; bez dodatnog form-builder sistema |
| Stilovi | SCSS, jednostavan zajednički skup polja, dugmadi, kartica i poruka |
| Čuvanje | Map strukture u jednom Node procesu |
| Prijava | Nasumični neprozirni session token, server-side memorijska sesija |
| Prototipske lozinke | Običan string u memoriji, prema izričitom zahtevu |
| Testiranje | Testovi validacije/API-ja sa Vitest + Supertest; jedan glavni Playwright tok |
| Okruženje | Windows razvoj, savremeni desktop i mobilni pregledači |
| Obim za proveru | 10 anketa × 200 predaja; do 30 pitanja u jednoj anketi |
| Verzije | Tačne patch verzije i test zavisnosti proveriti i zaključati pri implementaciji |

Frontend sesijski token čuva u `sessionStorage`, pa osvežavanje stranice čuva prijavu u istom tabu. Backend sesija traje do odjave, restarta ili isteka posle 24 sata. Token se šalje samo na privatne API pozive, ne u javne linkove. Lozinka i token nisu deo odgovora koji prikazuju profil ili ankete. Nema dodatnog šifrovanja ili hashovanja lozinki u ovom prototipu; to je ograničenje demo verzije.

## Constitution Check

`.specify/memory/constitution.md` trenutno sadrži nepopunjen šablon. Ne tretiramo njegove primere kao usvojena pravila niti tvrdimo da je formalna provera ustava prošla. Izrada nacrta nastavlja se prema izričitom zahtevu korisnika; pre implementacije tim usvaja pravila ili potvrđuje ograničenja iz ovog plana.

Provere prema korisničkom zahtevu, pre i posle projektovanja:

- Angular frontend i Node backend: ispunjeno u predlogu.
- Podaci samo u backend memoriji: ispunjeno; bez baze i disk persistencije.
- Učesnik nema nalog; mejl se prikuplja: ispunjeno uz vidljivo pitanje anonimnosti.
- Organizator vidi sopstvene ankete i odgovore: ispunjeno.
- AI poziv prvobitno odložen; u drugoj fazi odobren backend Gemma poziv bez promene ostalih pravila.
- Dokumentacija pre implementacije: ispunjeno.
- Korisnik je odobrio početak prema ovom planu i tri predložene produktne odluke; constitution šablon nije usvojen kao pravilo.

## Arhitektura

```mermaid
flowchart LR
    O[Organizator] --> A[Angular aplikacija]
    U[Učesnik preko javnog linka] --> A
    A -->|REST JSON /api| B[Node + Express]
    B --> M[Organizatori, sesije, ankete, predaje u memoriji]
    B --> G[Gemma provider preko Gemini API-ja]
```

Backend slojevi: ruta → validacija i autentifikacija → servis → memorijski store. Mali servisni moduli odvajaju pravila od Express handlera. Nema generičkog repository frameworka, redova poslova, WebSocket-a ni mikroservisa.

Razvoj: Angular proxy prosleđuje `/api` na lokalni backend. Deljeni link koristi konfigurisani `PUBLIC_APP_URL`, odnosno frontend adresu. Za demo drugim uređajima to mora biti dostupna LAN/hostovana adresa, a ne `localhost`. Produkcionu infrastrukturu i javni deployment ne postavljamo u ovoj fazi.

## Ekrani i rute

| Ruta | Sadržaj i ponašanje |
| --- | --- |
| `/` | Preusmeravanje na `/surveys` ili `/login` prema prijavi |
| `/register` | Korisničko ime, mejl, lozinka, potvrda lozinke; potvrda se proverava samo u UI-ju |
| `/login` | Mejl i lozinka; link ka registraciji |
| `/surveys` | „Moje ankete”, naslov, datum, status, broj odgovora, nova anketa, odjava |
| `/surveys/new` | Editor novog nacrta |
| `/surveys/:id/edit` | Izmena nacrta; objavljena anketa vodi na detalje |
| `/surveys/:id` | Naslov/opis, pitanja, javni link, broj i lista predaja, „Sumiraj” |
| `/s/:publicToken` | Javna forma sa mejlom, pitanjima i dugmetom „Pošalji feedback” |

Potvrda predaje je stanje javne forme, bez nove rute. Odgovore organizator može da otvara kroz proširive kartice; najnoviji su prvi. U prvom obimu ne treba poseban ekran za svaki pojedinačni odgovor.

Editor ima „Dodaj tekstualno pitanje”, „Dodaj checkbox pitanje”, oznaku „Obavezno”, dodavanje/uklanjanje opcija i uklanjanje pitanja. Redosled je redosled u editoru; drag-and-drop nije potreban. „Sačuvaj nacrt” i „Generiši link” su odvojene akcije. Ako postoje nesačuvane izmene, objavljivanje prvo uspešno čuva ceo nacrt, zatim generiše link. Greška čuvanja sprečava objavljivanje.

## Project Structure

### Documentation

```text
plan-hakaton/
├── README.md
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── checklists/requirements.md
```

`tasks.md` je generisan posle korisnikovog naloga za početak implementacije.

### Source Code — predlog buduće strukture

```text
frontend/
  src/app/
    core/          # auth servis, interceptor, guard, API klijent
    shared/        # zajednička polja, poruke, renderer pitanja
    features/
      auth/
      surveys/     # lista, editor, detalji i odgovori
      public-survey/
backend/
  src/
    app.ts
    server.ts
    auth/
    surveys/
    responses/
    store/         # memorijske mape i pomoćni indeksi
    middleware/
    types/
  tests/
e2e/
plan-hakaton/
```

Svaki deo ima svoj `package.json`; root package sadrži Playwright i agregatne skripte. `backend/src/summaries/` sadrži provider, validaciju izlaza i vlasničku rutu druge faze. Frontend/backend izvori su u navedenim folderima.

## Redosled implementacije posle odobrenja

| Korak | Rezultat | Provera izlaza |
| --- | --- | --- |
| 1. Osnova | Angular i Express projekti, proxy, zajednički format grešaka, health ruta | Frontend čita health odgovor backenda |
| 2. Nalozi | Memorijski organizatori i sesije, registracija/prijava/odjava, auth guard | Dva naloga; ispravna/pogrešna prijava; odjava |
| 3. Ankete | Editor, validacija, memorijske ankete, lista i objavljivanje | Kreiranje mešovite ankete i stabilan javni link |
| 4. Predaje | Javna forma, validacija na oba kraja, čuvanje i zaštita od ponovljenog zahteva | Gost popunjava; nevalidan zahtev se odbija |
| 5. Pregled | Lista predaja za vlasnika, prazna/error stanja, „Sumiraj” placeholder | Tačan broj i sadržaj; drugi organizator nema pristup |
| 6. Demo provera | Glavni E2E tok, mobilni prikaz, reset podataka | Scenariji iz quickstart-a prolaze |

Provera vlasništva i validacija ulaza dolaze sa pripadajućim rutama, a ne na kraju. Registrovanje i predaja ažuriraju sve povezane memorijske strukture zajedno, bez `await` između provere i upisa, da paralelni zahtevi ne zaobiđu jedinstvenost ili deduplikaciju.

## AI faza — odobren nastavak

Izabrani provider je Google Gemini API sa Gemma modelom `gemma-4-26b-a4b-it`, konfigurabilnim kroz `GEMMA_MODEL`. Backend sam učitava sve predaje jedne vlasničke ankete, pravi snapshot dozvoljenih polja i prosleđuje ga `SummaryProvider` interfejsu. Gemini API ključ pristupa Gemmi; nije dozvoljena tiha zamena Gemini modelom. Ključ ostaje na serveru. `server.ts` automatski učitava backend/.env.

Provider deli odgovore po pitanjima u grupe do 24.000 znakova i spaja parcijalne sažetke, sa ukupnim rokom 120 sekundi. Validira JSON i vraća jasne greške; ne vraća delimičan rezultat kao kompletan. Jedan aktivan summary zahtev po anketi sprečava paralelne duple klikove. UI prikazuje rezultat, model, vreme i broj predaja; nakon osvežavanja označava zastarelost. Rezultat se ne čuva trajno.

Kaggle notebook treba da pokaže rad sa izabranim Gemma modelom nad sintetičkim feedbackom i dokumentuje nalaze. Ne pretpostavljamo da notebook već predstavlja stabilan API server. Velike skupove odgovora kasnije treba obrađivati u grupama bez tihog odbacivanja predaja. Ugovor i očekivani izlaz su u [contracts/api.md](contracts/api.md).

## Treća faza — poređenje, analitika i izvori

Korisnik je 2026-10-11 odobrio poređenje izabranog događaja sa svim ostalim sopstvenim anketama. U ovom modelu jedna anketa predstavlja jedan događaj; ankete drugih organizatora nikada ne ulaze u snapshot. Poređenje uključuje i događaje bez predaja, sa oznakom da nema ocene. Postojeća pravila memorijskog čuvanja, prijave i privatnosti ostaju.

Šest kriterijuma su organizacija, sadržaj, predavači, praksa/interakcija, prostor/uslovi i logistika/pauze. Gemma zasebno analizira svaki događaj istim kriterijumima i označava pozitivan, negativan ili neutralan/mešovit stav samo kada je kriterijum pomenut u konkretnom odgovoru. Nalazi ostalih događaja ne prikazuju se kao nalazi ciljnog; njihove klasifikacije ulaze u benchmark. Backend računa indeks 0–100: positive=100, neutral=50, negative=0; prvo prosek odgovora unutar jedne predaje po kriterijumu, zatim prosek predaja. Benchmark objedinjeno koristi predaje ostalih događaja, bez ciljnog. Nema dokaza znači null, a ne 0. To je AI procena, ne izmeren procenat zadovoljnih učesnika. Svaki događaj može imati više grupa; sve zajedno imaju isti ukupni deadline. Za Gemma 4 thinkingLevel=minimal smanjuje nepotrebnu obradu.

Svaki odgovor na pitanje ima privremeni sourceId u snapshot-u. AI nalazi su `{text, sourceIds[]}`; backend proverava postojanje reference, neprazan sadržaj i vlasništvo ciljne ankete. Originalni survey/submission/question ID-jevi i redni brojevi ostaju u dozvoljenom snapshot-u za prikaz. Klik na nalaz odmah otvara tačan tekst i naziv ankete, redni broj predaje i pitanja. Pri spajanju grupa mora se zadržati unija referenci po kategoriji; u suprotnom nema uspešnog rezultata. Prompt traži sve odgovore koji podržavaju istu temu. Validacija referenci ne garantuje semantičku tačnost niti da AI nije propustio neku žalbu; organizator proverava izvore.

Backend računa analitiku zasebno iz sirovih odgovora pre AI poziva: popunjenost i nedostajuće odgovore po pitanju, broj i procenat svakog checkbox/multiple-choice izbora. Osnova su sve predaje ciljane ankete; višestruki izbor može dati zbir iznad 100%. Angular prikazuje horizontalne grafikone, poređenje i proširive izvore u posebnoj SummaryPanel komponenti.

Demo skripta `backend/scripts/seed-demo.mjs` kreira tri seminara sa po šest sintetičkih predaja i nalogom demo@gemmify.test / Seminar123!. Skripta koristi regularni API i ne menja postojeće naloge; ponovni poziv preskače već popunjene demo ankete. Podaci ostaju samo u RAM-u; nakon restarta skripta ponovo priprema demo. `check-demo-summary.mjs` izvršava jedan stvarni AI poziv i ispisuje nalaze bez ključa/tokena.

## Complexity Tracking

Najveća ograničenja su namerna: jedan proces, gubitak podataka pri restartu i prototipske lozinke. AI druga faza zavisi od korisnikovog ključa, pristupa modelu i API kvote. Kaggle dokaz rada ostaje za završni demo. Nema dodatne infrastrukture za ovaj obim.
