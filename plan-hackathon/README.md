# Gemify — prva implementaciona faza

**Status:** posle pregleda plana korisnik je zatražio implementaciju 10. oktobra 2026. Izvori su u `frontend/` i `backend/`; [tasks.md](tasks.md) prati napredak, a [verification.md](verification.md) beleži provere.

## Šta pravimo

Web aplikaciju za prikupljanje feedbacka posle događaja. Organizator pravi anketu, deli link i pregleda odgovore. Učesnik preko linka unosi mejl i odgovore, bez naloga i prijave. Prvi primer je hakaton, ali nazivi i model podržavaju i druge događaje.

Prva implementaciona faza obuhvata Angular frontend, Node backend i podatke samo u memoriji backenda. Korisnik je 2026-10-10 odobrio nastavak: dugme **„Sumiraj”** poziva Gemmu preko Gemini API-ja i sažima sve predaje iz izabrane ankete. Konfiguracija je u backend/.env.example; za stvaran poziv treba uneti ključ u backend/.env.

## Tok korišćenja

1. Organizator se registruje ili prijavljuje.
2. Na stranici **„Moje ankete”** vidi svoje ankete, broj odgovora i dugme **„Nova anketa”**.
3. U editoru unosi naslov i opis, dodaje tekstualna pitanja ili pitanja sa više checkbox opcija i označava obavezna pitanja.
4. Čuva nacrt, pa bira **„Generiši link”**. Anketa tada postaje dostupna učesnicima.
5. Učesnik otvara link na telefonu ili računaru, unosi mejl, popunjava anketu i dobija potvrdu predaje.
6. Organizator u detaljima ankete vidi pojedinačne predaje i dugme **„Sumiraj”**.

## Obuhvat prvog prototipa

| Uključeno | Odloženo |
| --- | --- |
| Registracija, prijava i odjava organizatora | Verifikacija mejla, reset lozinke, društvene prijave |
| Lista sopstvenih anketa i editor nacrta | Timske uloge i deljenje vlasništva |
| Tekstualna i checkbox pitanja; obavezno/neobavezno | Radio izbor, ocene, upload fajlova, grananje pitanja |
| Objavljivanje i kopiranje javnog linka | Slanje mejlova i pozivnica iz aplikacije |
| Predaja i pregled odgovora | Izvoz i napredna analitika |
| Gemma sažetak svih predaja iz izabrane ankete | Kaggle notebook i procena korisnosti na označenom skupu |
| Memorija jednog backend procesa | Baza, upis podataka u fajlove i oporavak posle restarta |

## Tri predloga za dogovor

Implementacija prati sledeće predložene odluke, na osnovu korisnikovog naloga posle pregleda plana.

| Odluka | Predlog | Alternativa |
| --- | --- | --- |
| Mejl i anonimnost | Mejl je obavezan, čuva se odvojeno od odgovora i ne prikazuje organizatoru; AI dobija samo sadržaj ankete i odgovora | Organizator vidi mejl; ili ga ne prikupljamo ako je potrebna stvarna anonimnost |
| Ponovljeno popunjavanje | Isti mejl može ponovo da popuni anketu; tehnički ponovljeno slanje istog zahteva ne pravi duplikat | Jedna predaja po mejlu i anketi, bez tvrdnje da proveravamo identitet |
| Izmena objavljene ankete | Pitanja se menjaju dok je anketa nacrt; posle generisanja linka ostaju zaključana | Kasnije dodati verzije ankete ili izmenu uz dodatna pravila |

**Tekst interfejsa:** bez prijave ne znači potpuno anonimno. Dok se mejl čuva i može povezati sa predajom, forma treba da kaže: „Popunjavanje bez prijave; mejl se prikuplja, ali se ne prikazuje organizatoru”, ako prihvatimo prvi predlog.

## Veza sa temom hakatona

Slike iz `theme-images` zahtevaju **Gemmu kao ključnu komponentu** i **Kaggle kao deo razvoja**. Koncept odgovara oblasti „Feedback & Continuous Improvement”. Gemma integracija je implementirana u nastavku; stvarna provera sa ključem, procena korisnosti i dokaz rada u Kaggle-u još su potrebni za završni demo. Detalji su u [research.md](research.md).

## Dokumenti

| Dokument | Sadržaj |
| --- | --- |
| [spec.md](spec.md) | Funkcionalnosti, korisnički scenariji i kriterijumi prihvatanja |
| [plan.md](plan.md) | Arhitektura, ekrani, moduli i redosled implementacije |
| [data-model.md](data-model.md) | Strukture u memoriji i pravila validacije |
| [contracts/api.md](contracts/api.md) | API rute i formati zahteva/odgovora |
| [research.md](research.md) | Obrazloženja odluka, tema i buduća Gemma/Kaggle faza |
| [quickstart.md](quickstart.md) | Predloženo pokretanje i scenariji provere buduće aplikacije |
| [checklists/requirements.md](checklists/requirements.md) | Provera nacrta i preostale odluke |

## Nastavak kroz Spec Kit

Aktivni feature folder je `plan-hakaton`; putanja je lokalno upisana u `.specify/feature.json`. Spec Kit taj fajl namerno ne deli preko Gita. Posle novog kloniranja, pre pokretanja naredne Spec Kit veštine, u PowerShell-u postavite `$env:SPECIFY_FEATURE_DIRECTORY = 'plan-hakaton'`. Dokumenti nisu duplirani u `specs/`. Grana za specifikaciju je `001-event-feedback`.

Korisnik je posle pregleda odobrio početak implementacije. Generisan je [tasks.md](tasks.md) sa 20 zadataka, organizovanih po pet korisničkih priča. Provere i ograničenja se beleže u [verification.md](verification.md).

Constitution fajl je još nepopunjen Spec Kit šablon i njegovi primeri nisu usvojena pravila. Reviewer-owned kontrolna lista ostaje neizmenjena kao zapis ranijeg pregleda. Gemma i Kaggle ostaju posebna naredna faza.
