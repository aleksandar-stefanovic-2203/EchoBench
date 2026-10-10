# Model podataka — prva faza

**Status:** primenjen u `backend/src/types/index.ts` i `backend/src/store/index.ts`. Svi podaci su u RAM-u jednog Node procesa. Nema baze, JSON fajla za čuvanje, browser baze ni lokalnog čuvanja poslovnih podataka.

## Entiteti

| Entitet | Polja |
| --- | --- |
| Organizer | `id`, `username`, `usernameKey`, `email`, `password`, `createdAt` |
| Session | `token`, `organizerId`, `createdAt`, `expiresAt` |
| Survey | `id`, `ownerId`, `title`, `description`, `status: draft/published`, `questions[]`, `publicToken: string/null`, `createdAt`, `updatedAt`, `publishedAt: string/null` |
| TextQuestion | `id`, `type: text`, `label`, `required` |
| CheckboxQuestion | `id`, `type: checkbox`, `label`, `required`, `options: {id,label}[]` |
| Submission | `id`, `surveyId`, `clientRequestId`, `answers[]`, `submittedAt` |
| TextAnswer | `questionId`, `value: string` |
| CheckboxAnswer | `questionId`, `value: string[]` — identifikatori opcija |
| SubmissionContact | `submissionId`, `email` |

Identifikatori su neprozirni stringovi, predlog UUID. Vremena su ISO 8601 UTC stringovi, a UI ih formatira za korisnika. Redosled u nizovima pitanja i opcija je redosled prikaza.

Mejl organizatora se trimuje i čuva malim slovima; isto važi za kontakt učesnika. Korisničko ime se prikazuje u unetom obliku bez rubnih razmaka, a `usernameKey` služi poređenju bez razlike velikih/malih slova. Lozinku ne trimovati i ne vraćati kroz API.

Frontend generiše ID-jeve pitanja i opcija pri dodavanju u editor, a backend proverava njihov format i jedinstvenost. Ostale ID-jeve i javni token pravi backend. Time kompletan nacrt može da se sačuva jednim zahtevom bez posebnih ruta za svako pitanje.

## Memorijske kolekcije

- `organizersById: Map<id, Organizer>`
- `organizerIdByEmail: Map<email, id>`
- `organizerIdByUsername: Map<usernameKey, id>`
- `sessionsByToken: Map<token, Session>`
- `surveysById: Map<id, Survey>`
- `surveyIdByPublicToken: Map<publicToken, id>`
- `submissionsBySurveyId: Map<surveyId, Submission[]>`
- `contactsBySubmissionId: Map<submissionId, SubmissionContact>`
- `submissionIdByRequestKey: Map<surveyId + clientRequestId, submissionId>`

Broj odgovora se računa iz niza predaja da ne održavamo nezavisan brojač. Za mali broj anketa lista vlasnika može filtrirati `surveysById`.

Kontakt je odvojen radi jasnog izbora polja za prikaz i AI. Veza preko `submissionId` i dalje postoji, pa ovo samo po sebi ne stvara potpunu anonimnost. U prvoj fazi ne postoji API za listanje kontakata.

## Životni ciklus

1. Registracija atomarno kreira organizatora i indekse; potom se kreira sesija.
2. Kreiranje ankete proizvodi `draft`, bez javnog tokena.
3. Izmena je dozvoljena samo za nacrt vlasnika.
4. Objavljivanje postavlja `published`, generiše jedinstveni javni token i beleži vreme.
5. Ponovno objavljivanje iste ankete vraća postojeći token.
6. Objavljena anketa prihvata predaje, ali se njena pitanja ne menjaju.
7. Odjava uklanja sesiju; isteklu sesiju backend odbija i uklanja pri proveri.
8. Restart procesa prazni sve kolekcije.

Arhiviranje, brisanje, zatvaranje ankete i verzionisanje nisu deo prve faze.

## Validacija — predložene granice

| Podatak | Pravilo |
| --- | --- |
| Username | 3–40 znakova posle trimovanja; jedinstven usernameKey |
| Mejl | Obavezan, validan format, do 254 znaka; jedinstven samo za organizatorske naloge |
| Lozinka | 6–128 znakova; običan string prema prototipskom zahtevu |
| Naslov ankete | 1–120 znakova posle trimovanja |
| Opis ankete | Opcion, do 1.000 znakova |
| Pitanja | 1–30, jedinstveni ID-jevi u anketi |
| Tekst pitanja | 1–300 znakova posle trimovanja |
| Checkbox opcije | 2–15; svaki naziv 1–150 znakova; bez duplih ID-jeva i naziva u pitanju |
| Tekstualni odgovor | Do 2.000 znakova; obavezni odgovor nije prazan posle trimovanja |
| Checkbox odgovor | Niz različitih ID-jeva postojećih opcija; obavezni sadrži najmanje jednu |
| JSON zahtev | Maksimalno 256 KiB |
| clientRequestId | UUID nov za svaku namernu predaju; isti pri retry-u iste predaje |

Granice su predlozi za prototip, ne zaključci iz hakatonskih slika.

U predaji svako pitanje ima tačno jedan answer zapis. Opciono tekstualno pitanje koristi `""`, opciono checkbox pitanje `[]`. Backend odbija nedostajuće/duplirane/nepoznate questionId vrednosti i vrednost pogrešnog tipa. Pitanja nepoznatog tipa se odbijaju i pri kreiranju ankete.

## Upis i ponovljeni zahtevi

Backend prvo proverava ceo zahtev, pa zajedno upisuje Submission, SubmissionContact i indeks zahteva. Ne sme ostati kontakt bez predaje ili predaja sa delom odgovora.

Ako već postoji isti `surveyId + clientRequestId` i ista normalizovana predaja, vraća se isti rezultat bez dodatnog upisa. Ako je ključ isti, a sadržaj drugačiji, vraća se konflikt. Novo namerno popunjavanje ima novi ključ, čak i kada je mejl isti. Ovo je zaštita od tehničkog ponavljanja zahteva, ne provera identiteta učesnika.

## Sažetak — druga faza

Nema Summary kolekcije. Sažetak se vraća kao `{surveyId, responseCount, generatedAt, model, overview, themes[], positiveHighlights[], improvements[], suggestedActions[]}` i ostaje samo u otvorenom frontend prikazu. AI ulaz se sastavlja iz naslova/opisa i svih predaja, sa tekstom pitanja i nazivima izabranih checkbox opcija. Ne koristi se serijalizacija celog store-a. Snapshot se pravi pre prvog await-a, pa nove predaje ne menjaju skup u tekućoj obradi.
