# Provere prve implementacione faze

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
