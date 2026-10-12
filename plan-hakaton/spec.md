# Feature Specification: Feedback za događaje

**Feature Branch:** `001-event-feedback`
**Created:** 2026-10-10
**Status:** prva faza i nastavak AI implementacije odobreni 2026-10-10; rezultate provera pratiti u verification.md.
**Input:** Organizator pravi feedback anketu, deli link i pregleda odgovore. Učesnik unosi mejl i odgovore bez prijave. Nastavak: „Sumiraj” koristi Gemmu preko API-ja za sve predaje iz izabrane ankete, kako je korisnik potvrdio.

## User Scenarios & Testing

### US-01 — Pristup organizatora (Priority: P1)

Registracija sa korisničkim imenom, mejlom i lozinkom; prijava mejlom i lozinkom; odjava.

**Why this priority:** ankete i odgovori moraju pripadati konkretnom organizatoru.

**Independent Test:** dva naloga i unapred pripremljene ankete omogućavaju proveru pristupa.

**Acceptance Scenarios:**

1. Validna registracija sa slobodnim podacima otvara „Moje ankete”.
2. Pogrešna lozinka zadržava korisnika na prijavi uz poruku o neuspehu.
3. Posle odjave zaštićene stranice zahtevaju novu prijavu.
4. Organizator B ne može da vidi ili menja privatne detalje ankete organizatora A, ni direktnim pristupom.

### US-02 — Kreiranje i deljenje ankete (Priority: P1)

Organizator pravi anketu i objavljuje je generisanjem linka.

**Why this priority:** ovo započinje ciklus prikupljanja feedbacka.

**Independent Test:** prijavljen organizator kreira anketu i proverava njen javni prikaz bez prijave.

**Acceptance Scenarios:**

1. Nova anketa ima naslov, opcioni opis i najmanje jedno pitanje.
2. Organizator dodaje, menja i uklanja pitanja dok je anketa nacrt; prikaz čuva redosled pitanja iz editora.
3. Checkbox pitanje ima najmanje dve različite opcije i dozvoljava izbor više opcija; multiple choice pitanje ima najmanje dve različite opcije i dozvoljava izbor tačno jedne opcije.
4. Svako pitanje nezavisno može biti obavezno ili neobavezno.
5. Neispravna anketa se ne čuva; korisnik vidi polja koja treba da ispravi.
6. „Generiši link” objavljuje sačuvan nacrt; ponovni zahtev vraća isti link.
7. Objavljena pitanja i opcije više se ne menjaju u prvom prototipu.

### US-03 — Popunjavanje bez naloga (Priority: P1)

Učesnik preko linka unosi mejl i odgovore, pa predaje formu.

**Why this priority:** feedback se prikuplja bez otvaranja učesničkih naloga.

**Independent Test:** unapred objavljena anketa popunjava se u privatnom prozoru pregledača.

**Acceptance Scenarios:**

1. Javni link radi bez registracije i bez organizatorske sesije.
2. Nevalidan/nedostajući mejl, prazno obavezno tekstualno pitanje ili nijedna izabrana opcija obaveznog checkbox pitanja sprečavaju predaju.
3. Neobavezna pitanja mogu ostati prazna.
4. Uspešna predaja prikazuje potvrdu; organizator zatim vidi odgovor.
5. Tokom slanja dugme je onemogućeno; ponovljeno slanje istog zahteva posle mrežnog prekida ne stvara novu predaju.
6. Ako slanje ne uspe, unosi ostaju u otvorenoj formi za ponovni pokušaj.
7. Nevažeći link prikazuje poruku da anketa nije dostupna.

### US-04 — Pregled feedbacka (Priority: P1)

Organizator sa liste svojih anketa otvara detalje, kopira javni link i čita pojedinačne predaje.

**Why this priority:** prikupljeni feedback mora biti koristan i pre AI integracije.

**Independent Test:** anketa sa tri pripremljene predaje prikazuje tačan broj i sve odgovore.

**Acceptance Scenarios:**

1. Lista prikazuje samo sopstvene ankete, status i broj odgovora; nova anketa je na vrhu.
2. Detalji prikazuju pitanja, tekstualne odgovore, nazive checkbox opcija i vreme predaje; najnovija predaja je prva.
3. Prazne liste anketa i odgovora imaju korisne poruke i odgovarajuće naredne akcije.
4. U predloženom režimu organizator vidi „Odgovor 1”, „Odgovor 2” itd., bez mejlova učesnika.
5. Osvežavanje detalja učitava novopristigle odgovore; prikaz uživo nije potreban.

### US-05 — Gemma sažetak (Priority: P2)

Organizator u detaljima ankete vidi „Sumiraj”.

**Why this priority:** organizator dobija pregled svih predaja i konkretne predloge poboljšanja; Gemma je zahtev hakatona.

**Independent Test:** klik u anketi sa odgovorima poziva vlasnički endpoint i prikazuje validiran sažetak; greške se prikazuju bez lažnog uspeha.

**Acceptance Scenarios:**

1. Bez odgovora dugme je onemogućeno uz objašnjenje.
2. Sa najmanje jednim odgovorom klik poziva backend; tokom obrade dugme je onemogućeno.
3. Backend uzima sve predaje iz izabrane ankete i šalje Gemmi sadržaj pitanja/odgovora bez kontakata i login podataka. Veći ulaz grupiše i spaja bez tihog odbacivanja predaja.
4. Prikaz sadrži pregled, teme, pozitivne utiske, poboljšanja, akcije, broj predaja, vreme i model.
5. Nedostajući ključ, API greška, nevalidan izlaz i timeout daju razumljivu grešku. Ponovni pokušaj je moguć.
6. Novopristigle predaje nakon osvežavanja označavaju prethodni sažetak kao zastareo.

### Edge Cases

- Duplikat mejla ili korisničkog imena pri registraciji daje razumljivu grešku.
- Sami razmaci ne čine obavezno tekstualno pitanje popunjenim.
- Nepoznato pitanje, ponovljen identifikator pitanja ili nepostojeća checkbox opcija odbijaju celu predaju.
- Dupli klik na objavljivanje ne pravi različite linkove.
- Posle restarta servera podaci i prijave nestaju; raniji linkovi nisu dostupni.
- Učesnik može namerno ponovo popuniti anketu istim mejlom, prema radnoj pretpostavci.
- Kada server nije dostupan, nema lažne potvrde da je nešto sačuvano.
- Javna forma je upotrebljiva na telefonu širine 360 px i tastaturom.

## Requirements

### Functional Requirements

- **FR-001:** Registracija, prijava i odjava organizatora po US-01.
- **FR-002:** Samo vlasnik pristupa privatnim detaljima ankete i odgovorima; pravilo proveriti pri svakom privatnom pristupu.
- **FR-003:** Kreiranje i izmena validnog nacrta sa naslovom, opisom i uređenom listom pitanja.
- **FR-004:** Tekstualni odgovor, checkbox izbor više opcija i multiple choice izbor jedne opcije, uz nezavisnu obaveznost.
- **FR-005:** Objavljivanje stabilnim javnim linkom; ponovni zahtev vraća isti link.
- **FR-006:** Objavljen sadržaj ankete ostaje nepromenjen u ovom obimu.
- **FR-007:** Popunjavanje javne ankete bez naloga uz obavezan mejl.
- **FR-008:** Provera cele predaje pre čuvanja, bez čuvanja delimičnih odgovora.
- **FR-009:** Vlasnik vidi broj i sadržaj svake predaje, uključujući sve izabrane opcije.
- **FR-010:** Sačuvani kontakt se ne prikazuje u pregledima i ne uključuje u kasniji materijal za sažimanje, prema predloženom režimu.
- **FR-011:** Sprečiti tehničke duplikate istog zahteva; dozvoliti novo namerno popunjavanje.
- **FR-012:** „Sumiraj” prati US-05 uz backend Gemma API poziv odobren u drugoj fazi; samo vlasnik može zahtevati sažetak.
- **FR-013:** Stanja učitavanja, prazne liste, greške i potvrde; na grešci predaje zadržati unos.
- **FR-014:** Objasniti prikupljanje mejla bez tvrdnje da je feedback potpuno anoniman.
- **FR-015:** Podaci postoje tokom rada servera; osvežavanje stranice ih ne briše, restart servera ih briše.

### Key Entities

- **Organizator:** vlasnik naloga i anketa.
- **Sesija:** aktivna prijava organizatora.
- **Anketa:** naslov, opis, pitanja, vlasnik, status i javni link.
- **Pitanje/opcija:** tekst, tip, obaveznost, redosled i eventualne checkbox opcije.
- **Predaja:** kompletna grupa odgovora na jednu anketu sa vremenom predaje.
- **Kontakt učesnika:** mejl sa vezom ka predaji, odvojeno od podataka za prikaz.

## Success Criteria

- **SC-001:** Organizator završava registracija → anketa → link u jednom demo prolazu bez ručnog podešavanja podataka.
- **SC-002:** Tri učesnika bez naloga predaju feedback; organizator vidi tačno tri predaje i sve odgovore.
- **SC-003:** Negativni scenariji iz US-01/03 sprečavaju nevalidnu predaju ili neovlašćen pristup i daju razumljivu poruku.
- **SC-004:** Javno popunjavanje na širini 360 px nema horizontalno skrolovanje; polja mogu da se koriste tastaturom.
- **SC-005:** „Sumiraj” prikazuje validan AI rezultat za sve predaje snapshot-a ili jasnu grešku bez lažnog uspeha.
- **SC-006:** Na dogovorenom lokalnom demo uređaju, sa 10 anketa i po 200 predaja, lista i detalji se otvaraju za do dve sekunde u normalnim uslovima. Ovo je cilj za proveru, ne izmeren rezultat.

## Nastavak 2026-10-11: poređenje i poreklo nalaza

- **FR-016:** „Sumiraj” poredi izabranu anketu/događaj sa svim drugim anketama istog organizatora po šest kriterijuma iz plana. Ne postoji pristup tuđim podacima.
- **FR-017:** Prikaz prikazuje AI indeks 0–100, broj relevantnih predaja, benchmark ostalih događaja i razliku u poenima. Za nepomenut kriterijum prikazuje „Nema podataka”. Metod računanja je vidljiv.
- **FR-018:** Svaki AI nalaz ima proverene reference na predaje i pitanja ciljnog događaja. Klik otvara izvorne odgovore odmah ispod nalaza. Izmišljeni ID-jevi i reference na druge događaje odbijaju rezultat.
- **FR-019:** Analitika izbora i popunjenosti računa se iz svih predaja snapshot-a. Prikazuje brojeve, procente i grafikon; objašnjava osnovu i višestruki izbor.
- **FR-020:** Organizator može ručno testirati demo seminare sa različitim utiscima. Demo je sintetički i ponovljivo se kreira regularnim API-jem.

## Assumptions

- Posle pregleda plana korisnik je 2026-10-10 zatražio implementaciju: mejl je skriven organizatoru, namerna ponovna predaja istim mejlom je dozvoljena, a objavljena pitanja su zaključana.
- Interfejs je na srpskom, latinicom; sadržaj anketa može biti na drugim jezicima.
- Checkbox znači više mogućih izbora, multiple choice znači jedan izbor; tekstualno pitanje koristi višeredni unos.
- Mejl se sintaksno proverava, ali se vlasništvo nad adresom ne potvrđuje.
- Jedan organizator poseduje svaku anketu. Nema administrativne uloge, timskih naloga niti posebnog modula za upravljanje događajem.
- Jedna serverska instanca i privremeni podaci su dovoljan obim prototipa.
- AI sažimanje je odobreno u nastavku rada; stvarna API provera zahteva korisnikov ključ. Kaggle notebook i dokaz korisnosti ostaju potrebni za kompletan hakatonski demo.
