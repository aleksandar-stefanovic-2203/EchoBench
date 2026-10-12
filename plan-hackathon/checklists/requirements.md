# Specification Quality Checklist: Gemify feedback

**Purpose:** pregled kvaliteta nacrta pre dogovora tima.
**Created:** 2026-10-10
**Feature:** [spec.md](../spec.md)
**Status:** dokumentacija pregledana; odobrenje i izvršna provera aplikacije nisu obavljeni.

## Content Quality

- [x] Specifikacija opisuje ponašanje i korisničku vrednost.
- [x] Tehničke biblioteke, API i strukture odvojeni su u plan, model i ugovor.
- [x] Popunjeni su korisnički scenariji, zahtevi, kriterijumi uspeha i pretpostavke.
- [x] Termin „anonimno” nije korišćen kao netačna tvrdnja uz prikupljanje mejla.

## Requirement Completeness

- [x] Zahtevi su proverljivi uz navedene radne pretpostavke.
- [x] Definisani su glavni tokovi i negativni scenariji.
- [x] Obuhvat prve faze i odložena Gemma obrada su eksplicitni.
- [x] Opisani su životni vek podataka i posledice restarta.
- [x] Registracija, prijava, vlasništvo i javni pristup su razdvojeni.
- [x] Sve slike teme su pročitane; Gemma i Kaggle obaveze su zabeležene.
- [x] Nema nepopunjenih Spec Kit placeholdera u ovom nacrtu.
- [x] Success Criteria su ciljevi za proveru, ne predstavljeni izmereni rezultati.

## Feature Readiness

- [x] Scenariji pokrivaju sve funkcionalne zahteve.
- [x] API ugovor i model koriste iste vrste pitanja i odgovora.
- [x] Budući AI dobija podatke iz backenda, bez kontakata i login podataka.
- [x] Vodič za pokretanje je jasno označen kao budući.
- [ ] Tim je odobrio tretman mejla, ponovljene predaje i zaključavanje objavljene ankete.
- [ ] Tim je odobrio plan prve implementacione faze.
- [ ] Usvojena su projektna pravila; postojeći constitution je još šablon.
- [ ] Napravljen je tasks.md posle odobrenja.
- [ ] Implementacija je završena i izvršne provere prolaze.

## Pokrivenost

| Zahtevi | Scenariji |
| --- | --- |
| FR-001–002 | US-01, US-04 i provera drugog organizatora |
| FR-003–006 | US-02 i objavljivanje/izmena iz quickstart-a |
| FR-007–008, FR-011 | US-03 i API provere validacije/deduplikacije |
| FR-009–010 | US-04 i provera polja u response DTO-u |
| FR-012 | US-05 |
| FR-013–014 | US-03/04 i ručna provera poruka i UI-ja |
| FR-015 | Edge Cases i restart scenario |

## Spec Kit status

Feature je lokalno registrovan kao `plan-hakaton`; obavezni before_specify Git hook otvorio je granu `001-event-feedback`. `.specify/feature.json` je lokalni, ignorisani fajl; u novom checkout-u treba postaviti `SPECIFY_FEATURE_DIRECTORY=plan-hakaton`. Spec i plan koriste instalirane šablone.

Opcioni before_plan, after_specify i after_plan Git commit hookovi nisu izvršeni; auto_commit je u Git konfiguraciji isključen. Opcioni agent-context-update ostavljen je za usvojene dokumente. Dostupni su kao `$speckit-git-commit` i `$speckit-agent-context-update`.

Po izričitom zahtevu korisnika isporučuje se nacrt za pregled, pa otvorene odluke i nepopunjen constitution nisu prikazani kao završene formalne provere. Sledeći korak je dogovor i ažuriranje, zatim `$speckit-tasks` i `$speckit-analyze`, pa tek odobrena implementacija.
