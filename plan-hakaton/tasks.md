# Tasks: Gemify feedback prototip

**Input:** spec.md, plan.md, data-model.md, contracts/api.md, research.md i quickstart.md u `plan-hakaton/`.
**Odobrenje:** korisnik je 10. oktobra 2026. potvrdio pregled plana i zatražio početak implementacije. Primenjuju se tri predložene produktne odluke. Constitution je nepopunjen šablon, ne usvojeni skup pravila. Reviewer-owned checklist se ne menja.
**Tests:** API/validacija Vitest + Supertest i Playwright demo iz plana. Pišu se pre odgovarajuće implementacije.

## Phase 1: Setup

- [X] T001 Postaviti odvojene projekte i zaključane zavisnosti u backend/package.json, frontend/package.json i package.json.
- [X] T002 [P] Postaviti ignore pravila u .gitignore i Angular proxy/config u frontend/angular.json i frontend/proxy.conf.json.

## Phase 2: Foundation

- [X] T003 Definisati entitete i RAM store u backend/src/types/index.ts i backend/src/store/index.ts; sve kolekcije nestaju restartom.
- [X] T004 Postaviti JSON greške, health, limit „Maksimalno 256 KiB” i konfiguraciju u backend/src/app.ts, backend/src/middleware/errors.ts i backend/src/server.ts.
- [X] T005 [P] Postaviti frontend API tipove, zajedničke poruke i stilove u frontend/src/app/core/models.ts, frontend/src/app/shared/feedback.component.ts i frontend/src/styles.scss.

## Phase 3: US1 — Pristup organizatora (P1)

**Independent test:** dva naloga, normalizovani duplikati, pogrešna lozinka, me i odjava; istek posle 24 sata.

- [X] T006 [US1] Napisati auth ugovorne testove u backend/tests/auth.test.ts.
- [X] T007 [US1] Implementirati auth servis/middleware/rute u backend/src/auth/index.ts: username „3–40 znakova posle trimovanja; jedinstven usernameKey”, mejl „Obavezan, validan format, do 254 znaka”, lozinka „6–128 znakova”; ne trimovati lozinku.
- [X] T008 [US1] Implementirati sessionStorage token, privatni interceptor, guard i registraciju/prijavu/odjavu u frontend/src/app/core/auth.ts i frontend/src/app/features/auth/auth.component.ts; potvrda lozinke samo u UI.

## Phase 4: US2 — Kreiranje i deljenje (P1)

**Independent test:** kreirati mešovitu anketu, sačuvati/izmeniti nacrt; stabilan link i odbijanje izmene posle objave; drugi vlasnik dobija 404.

- [X] T009 [US2] Napisati survey ugovorne i validacione testove u backend/tests/surveys.test.ts.
- [X] T010 [US2] Implementirati validaciju i vlasničke rute u backend/src/surveys/index.ts i backend/src/middleware/validation.ts: naslov „1–120 znakova posle trimovanja”, opis „Opcion, do 1.000 znakova”, pitanja „1–30, jedinstveni ID-jevi u anketi”, tekst pitanja „1–300 znakova posle trimovanja”, checkbox opcije „2–15; svaki naziv 1–150 znakova; bez duplih ID-jeva i naziva u pitanju”; UUID format, boolean required, odbiti dodatna polja.
- [X] T011 [US2] Implementirati listu i Reactive Forms/FormArray editor sa dodavanjem/uklanjanjem pitanja/opcija u frontend/src/app/features/surveys/list.component.ts i frontend/src/app/features/surveys/editor.component.ts; prvo sačuvati pa objaviti, greška čuvanja sprečava objavu.

## Phase 5: US3 — Javno popunjavanje (P1)

**Independent test:** gost popunjava objavljenu anketu; nevalidna cela predaja se odbija bez delimičnog upisa; identičan retry vraća 200, konflikt 409; novi UUID dozvoljava isti mejl.

- [X] T012 [US3] Napisati javne/response ugovorne testove u backend/tests/responses.test.ts.
- [X] T013 [US3] Implementirati javne rute, atomarne predaje/kontakte i deduplikaciju u backend/src/responses/index.ts: tekst „Do 2.000 znakova; obavezni odgovor nije prazan posle trimovanja”, checkbox „Niz različitih ID-jeva postojećih opcija; obavezni sadrži najmanje jednu”, clientRequestId „UUID nov za svaku namernu predaju; isti pri retry-u iste predaje”; tačno jedan odgovor po pitanju.
- [X] T014 [US3] Implementirati javni Reactive Forms obrazac u frontend/src/app/features/public-survey/public.component.ts sa mejlom, privatnosnim tekstom, disabled slanjem, stabilnim retry ključem, očuvanjem unosa na grešci i potvrdom.

## Phase 6: US4 — Pregled feedbacka (P1)

**Independent test:** tri predaje, najnovije prvo, count=3, puna imena opcija i vreme, bez mejlova; osvežavanje i prazna stanja.

- [X] T015 [US4] Napisati test privatnog pregleda, DTO privatnosti i reset store-a u backend/tests/responses.test.ts.
- [X] T016 [US4] Implementirati vlasnički pregled predaja u backend/src/responses/index.ts i detalje/kopiranje linka/osvežavanje u frontend/src/app/features/surveys/detail.component.ts.

## Phase 7: US5 — AI placeholder (P2)

**Independent test:** bez odgovora disabled, sa odgovorima lokalna poruka, bez AI poziva.

- [X] T017 [US5] Implementirati „Sumiraj” i objašnjenje u frontend/src/app/features/surveys/detail.component.ts; nema summary backend rute.

## Phase 8: Polish & verification

- [X] T018 Napisati i izvršiti glavni browser demo, zaštitu vlasništva, mobile 360 px, tastaturu i neuspešno slanje u e2e/feedback.spec.ts i playwright.config.ts.
- [X] T019 Izvršiti backend testove, oba build-a i demo obim 10 × 200 u backend/tests/performance.test.ts; rezultate zabeležiti u plan-hakaton/verification.md.
- [X] T020 Ažurirati stvarne komande i status u README.md, plan-hakaton/README.md, plan-hakaton/quickstart.md, plan-hakaton/spec.md, plan-hakaton/plan.md i plan-hakaton/contracts/api.md.

## Dependencies & execution order

Setup → Foundation → US1 → US2 → US3 → US4 → US5 → Polish. US4 backend testovi mogu deliti pripremu sa US3; US5 zavisi od US4. Testovi se pišu pre servisa. Backend i frontend deo priče mogu se raditi nezavisno posle usaglašenog ugovora; svaka priča se proverava pre naredne.

## Parallel examples

US1: auth API testovi i auth UI. US2: survey validacija i editor. US3: response validacija i javni obrazac. US4: response DTO i detail UI. US5: lokalni UI handler i browser assertion. Paralelni rad je moguć u različitim fajlovima; ova sesija radi sekvencijalno bez delegacije.

## Implementation strategy

Prvo infrastruktura i US1 (pristup), zatim US2/US3 kao najmanji koristan feedback tok. Dodati pregled i AI placeholder, pa izvršiti sve provere i dokumentovati stvarne rezultate i preostala ograničenja.
