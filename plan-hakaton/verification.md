# Provere prve implementacione faze

Ovaj početni odeljak čuva istorijske rezultate prve faze. Aktuelna Gemma implementacija i njene provere su u odeljku „Druga faza — Gemma API” na kraju dokumenta.

**Datum:** 10. oktobar 2026. **Okruženje:** Windows, Node 22.20.0, npm 10.9.3, Microsoft Edge preko Playwright-a. Node 24 LTS ostaje preporučeno okruženje; nije zasebno izvršno testiran u ovoj sesiji.

## Rezultati

| Provera | Rezultat |
| --- | --- |
| Backend `npm test` | 16/16 testova prolazi (Vitest 4.1.11 + Supertest) |
| Backend `npm run build` | TypeScript build prolazi |
| Frontend `npm run build` | Angular production build prolazi; initial bundle oko 260 kB, procenjeni transfer oko 72 kB |
| Root `npm run test:e2e` | 3/3 Edge browser testa prolaze |
| API demo 10 anketa × 200 predaja | Lista + detalji + odgovori oko 7 ms u lokalnom Supertest merenju |
| Browser demo 10 × 200 | Navigacija i prikaz liste 161 ms; detalji sa 200 predaja 256 ms |
| Mobilna javna forma | 360 × 780 px, bez horizontalnog skrolovanja; vizuelno pregledan ceo snimak |
| Tastatura | Tab prelazi sa mejla na prvo tekstualno pitanje; povezana polja/checkbox labele i vidljiv focus |
| npm audit | Root, backend i frontend instalacija: 0 prijavljenih ranjivosti |
| Ponovljiva instalacija | `npm ci --offline` prolazi u root, backend i frontend folderima; manifesti odgovaraju lock fajlovima |
| Git whitespace | `git diff --check` prolazi |

Merenja su pojedinačna lokalna merenja, ne garancija svih uređaja ili produkcionih uslova. Browser provera uključuje navigaciju, guard, API i render. Performance API test automatski priprema svih 2.000 predaja. Browser test nezavisno priprema isti broj sa jednim pitanjem po anketi.

## Pokrivena ponašanja

- Registracija i normalizacija mejla/username-a; duplikati; pogrešna lozinka; lozinka se ne trimuje; profil ne vraća lozinku.
- Sesija, odjava, 24-časovni istek; svaki privatni endpoint proverava vlasnika i nedostupna tuđa anketa vraća 404.
- Čuvanje i izmena nacrta; reload zadržava nacrt; stabilno objavljivanje; objavljena anketa ne prima izmene.
- Granice anketa/pitanja/opcija, UUID i jedinstvenost, nepoznati tipovi i dodatna polja; JSON parser 400, nevalidna polja 422, preveliko telo 413.
- Javni link bez naloga, obavezna tekstualna/checkbox polja, opciona prazna pitanja, više checkbox izbora i potvrda predaje.
- Cela predaja se validira pre upisa; nedostajući/ponovljeni/nepoznati odgovori i pogrešni tipovi/opcije se odbijaju.
- Osam paralelnih identičnih zahteva stvara jednu predaju; isti normalizovani sadržaj vraća 200; isti ključ sa drugim sadržajem 409; novi ključ sa istim mejlom stvara novu predaju.
- Browser simulira prekid mreže **nakon serverskog upisa**, proverava očuvane unose i isti request pri retry-u. Ukupan broj nakon retry-a i dve nove predaje je tačno tri.
- Najnovije predaje prve; tačan count, sadržaj tekstova i imena checkbox opcija; kontakt se ne vraća u privatni/public DTO.
- Prazne liste, nevažeći link, vidljive greške prijave i editora, osvežavanje odgovora.
- „Sumiraj” je disabled bez odgovora; sa odgovorima prikazuje lokalnu poruku. Browser beleži da nema summary/Gemma poziva. Summary API ruta nije implementirana.
- Novi store (simulacija restarta procesa) nema naloge/sesije i ne prihvata prethodni javni link.

## Napomene o procesu

Test fajlovi su napisani pre pripadajućih servisa. Prvi auth pokušaj nije mogao da pokrene Vitest jer instalacija još nije bila završena; za početne suite-ove nije zabeležen izvršeni red korak. Dodatni JSON-shape regresioni test prvo je izvršno pao (400 umesto 422), pa je parser ispravljen i svih 16 testova je prošlo.

Početna Vitest 3 verzija imala je audit prijave; zamenjena je sa 4.1.11. npm 10 resolver imao je grešku u opcionim browser peer zavisnostima; backend `.npmrc` koristi `legacy-peer-deps=true`. Backend ne koristi Vitest browser runner. Patch verzije i tranzitivne zavisnosti zaključane su u package.json i package-lock.json fajlovima.

Angular/esbuild traži čitanje nadređenih direktorijuma, pa je build izvršen sa proširenim pristupom posle sandbox greške. Browser testovi koriste lokalne servere i instalirani Edge.

Posle vizuelnog pregleda dodati su razmak uz status pitanja i +/− oznake za otvaranje/zatvaranje predaja. Agregatni root build i glavni browser tok ponovo su prošli nakon tih dorada; završni snimak detalja je pregledan. Generisani snimci su u ignorisanom `test-results/` folderu.

Provereni su before/after_implement i before/after_tasks hookovi iz `.specify/extensions.yml`: svi su opcioni Git commit hookovi. Nisu pokrenuti; dostupni su kroz `$speckit-git-commit`. Nema mandatory implement/tasks hookova.

## Ograničenja i naredna faza

Podaci ostaju samo u memoriji jednog procesa i restart ih briše. Lozinke su obični stringovi prema odobrenom prototipskom planu. Nema baze, deployment-a, mejl verifikacije niti AI poziva. Gemma, Kaggle notebook i procena korisnosti sažetka ostaju posebna naredna faza. Constitution ostaje šablon; nije tvrdnja da su projektna pravila formalno usvojena. Raniji reviewer-owned checklist nije menjan.

## Druga faza — Gemma API

**Datum:** 10. oktobar 2026. Korisnik je odobrio nastavak i potvrdio sve predaje iz izabrane ankete kao obim. Placeholder je zamenjen stvarnim backend Gemma REST adapterom. Backend automatski učitava backend/.env, a backend/.env.example sadrži GEMINI_API_KEY, GEMMA_MODEL i SUMMARY_TIMEOUT_MS. Nema novih runtime zavisnosti niti promene memorijskog čuvanja.

| Provera | Rezultat |
| --- | --- |
| Backend `npm.cmd test` | 23/23 testova prolazi, uključujući 7 novih summary API/provider testova |
| Root `npm.cmd run build` | Backend TypeScript i Angular production build prolaze |
| Root `npm.cmd run test:e2e` | 3/3 Edge browser testa prolaze (15,7 s) |
| Browser demo 10 × 200 | Lista 191 ms, detalji 197 ms |
| Vizuelni pregled | Pregledan ceo organizer-detail screenshot sa sažetkom i oznakom novih odgovora |
| Git whitespace | `git diff --check` prolazi |

Summary testovi proveravaju sesiju/vlasništvo, praznu anketu, odbijanje kopije odgovora u telu zahteva, sve predaje i nazive checkbox opcija, odsustvo kontakata/login metapodataka, stabilan snapshot tokom novih predaja, blokiranje duplih poslova i oslobađanje posle greške. Adapter testovi proveravaju Gemma URL i ključ u header-u, grupisanje velikog ulaza sa markerom svake predaje, spajanje, nepostojeću konfiguraciju, odbijanje Gemini modela, upstream 403/429/500, nevalidan JSON/schema, prekinut izlaz i timeout.

Browser proverava stvarni frontend POST sa praznim telom, simuliranu API grešku, ponovni pokušaj, disabled stanje tokom obrade, rezultat i oznaku zastarelosti nakon nove predaje/osvežavanja. Browser summary endpoint i Google odgovori u testovima su simulirani: stvarna Gemma dostupnost, kvalitet i latencija nisu potvrđeni jer ključ još nije dostavljen. Nema tvrdnje da mock rezultat predstavlja izvršen model poziv. Sažetak se vraća samo ako sve grupe i spajanja uspeju; broj predaja označava snapshot, ne dokazuje kvalitet AI zaključaka.

Pokretanje Playwright-a u sandbox-u naišlo je na Windows tsx/userInfo i Angular pristup nadređenim direktorijumima. Završna provera je izvršena sa zasebno pokrenutim kompajliranim backendom i Angular dev serverom sa potrebnim pristupom, uz postojeće Playwright server reuse podešavanje. Root zavisnosti instalirane su kroz npm ci; offline pokušaj nije imao Playwright u kešu.

Pre/posle implementacije provereni su `.specify/extensions.yml` hookovi: samo opcioni Git commit (`$speckit-git-commit`), nije izvršen. Prerequisite provera vraća plan-hakaton kao FEATURE_DIR. Reviewer checklist nije menjan; ranija odobrenja i aktuelni izričit zahtev za nastavak pokrivaju njegove otvorene istorijske stavke.

**Preostalo za hakatonski demo:** uneti korisnikov ključ i izvršiti stvaran Gemma poziv na sintetičkim odgovorima; proveriti nalaze i izmeriti vreme/korisnost; pripremiti Kaggle notebook i dokaz rada. Ostala postojeća pravila prototipa važe.
