# REST API ugovor — nacrt

**Base:** `/api`; JSON. Rute prve faze implementirane su u `backend/src/`; rezultati provera su u [verification.md](../verification.md).

Privatne rute zahtevaju `Authorization: Bearer <sessionToken>`. Session token daje backend posle registracije ili prijave. Backend iz sesije određuje vlasnika; ne veruje `ownerId` iz zahteva.

## Zajednički oblici

- `OrganizerView = { id, username, email }` — nikada password.
- `Question` i `Answer` prate [model podataka](../data-model.md).
- `SurveyView = { id, title, description, status, questions, shareUrl, createdAt, updatedAt, publishedAt, responseCount }`; shareUrl je null za nacrt.
- `SurveyListItem = { id, title, status, responseCount, createdAt, publishedAt }`.
- `SubmissionView = { id, submittedAt, answers }` — nikada mejl.
- `PublicSurvey = { title, description, questions, requiresEmail: true }` — bez vlasnika, kontakata i tuđih predaja.

Greške imaju oblik:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Proverite obavezna polja.",
    "fields": {
      "answers.q1": "Odgovor je obavezan."
    }
  }
}
```

`fields` je opciono. Ključevi pitanja odgovaraju stvarnim ID-jevima. Frontend mapira polja i prikazuje razumljive poruke.

## Rute prve faze

| Metod i putanja | Pristup | Uspeh i ponašanje |
| --- | --- | --- |
| GET /health | Javno | 200 `{status:"ok"}` |
| POST /auth/register | Javno | 201 `{organizer: OrganizerView, sessionToken}` |
| POST /auth/login | Javno | 200 isti oblik kao registracija |
| GET /auth/me | Sesija | 200 `{organizer: OrganizerView}` |
| POST /auth/logout | Sesija | 204 bez tela; briše tekuću sesiju |
| GET /surveys | Sesija | 200 `{items: SurveyListItem[]}`, samo sopstvene, najnovije prvo |
| POST /surveys | Sesija | 201 `{survey: SurveyView}`, kreira nacrt |
| GET /surveys/:id | Vlasnik | 200 `{survey: SurveyView}` |
| PATCH /surveys/:id | Vlasnik nacrta | 200 `{survey: SurveyView}`; menja ceo sadržaj nacrta |
| POST /surveys/:id/publish | Vlasnik | 200 `{survey: SurveyView}`, stabilan shareUrl |
| GET /surveys/:id/responses | Vlasnik | 200 `{items: SubmissionView[], total}`, najnovije prvo |
| GET /public/surveys/:publicToken | Javno | 200 `{survey: PublicSurvey}`, samo objavljena anketa |
| POST /public/surveys/:publicToken/responses | Javno | 201 `{submissionId, submittedAt}`; identičan retry vraća 200 isti rezultat |

`POST /surveys` i `PATCH /surveys/:id` primaju `{title, description, questions}`; PATCH u ovom ugovoru zamenjuje sva tri polja zajedno, nije proizvoljna parcijalna izmena. Dodatna polja poput ownerId/status/publicToken se odbijaju.

Nema paginacije u prvom obimu od 200 predaja po anketi. Iznad demo obima možemo dodati paginaciju naknadno; UI rezultat trenutne liste nije izvor podataka za AI.

## Tela zahteva

Registracija:

```json
{"username":"organizator","email":"org@example.com","password":"demo123"}
```

Prijava:

```json
{"email":"org@example.com","password":"demo123"}
```

Anketa — identifikatori u primerima su UUID vrednosti koje bi editor generisao:

```json
{
  "title": "Feedback posle hakatona",
  "description": "Podeli utiske o događaju.",
  "questions": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "type": "text",
      "label": "Šta bismo mogli da poboljšamo?",
      "required": true
    },
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "type": "checkbox",
      "label": "Šta ti je bilo korisno?",
      "required": false,
      "options": [
        {"id":"33333333-3333-4333-8333-333333333333","label":"Mentori"},
        {"id":"44444444-4444-4444-8444-444444444444","label":"Radionice"}
      ]
    }
  ]
}
```

Predaja:

```json
{
  "clientRequestId": "55555555-5555-4555-8555-555555555555",
  "respondentEmail": "ucesnik@example.com",
  "answers": [
    {
      "questionId":"11111111-1111-4111-8111-111111111111",
      "value":"Više vremena za pitanja mentorima."
    },
    {
      "questionId":"22222222-2222-4222-8222-222222222222",
      "value":["33333333-3333-4333-8333-333333333333"]
    }
  ]
}
```

Pravila iz modela podataka važe i kada neko zaobiđe frontend i direktno pozove API.

## Greške i autorizacija

| HTTP | Primeri |
| --- | --- |
| 400 | Malformiran JSON |
| 401 | Pogrešna prijava; nedostaje, istekao ili nevažeći session token |
| 404 | Nepostojeća anketa/token; tuđa anketa na privatnoj ruti |
| 409 | Zauzet username/mejl; izmena objavljene ankete; isti clientRequestId sa drugačijim sadržajem |
| 413 | Telo zahteva prelazi 256 KiB |
| 422 | Validan JSON sa nevalidnim poljima ili odgovorima |
| 500 | Neočekivana greška bez detalja steka u odgovoru |

API za odgovore, detalje, izmenu i objavljivanje proverava vlasnika. Javne rute ne vraćaju organizatorske podatke, kontakte ili listu predaja. Javni token služi pristupu formi, a ne organizatorskom pristupu.

## AI sažetak — druga faza

`POST /api/surveys/:id/summary` je implementiran u `backend/src/summaries/index.ts`. Zahtev nema telo ili šalje `{}`; dodatna polja se odbijaju sa 422. Odgovor je 200 `{summary: {overview, themes, positiveHighlights, improvements, suggestedActions, surveyId, responseCount, generatedAt, model}}`.

Ruta zahteva vlasničku sesiju, bez liste odgovora u request body-ju. Backend sam uzima sve predaje ankete u trenutku zahteva. Ne prihvata mejlove, lozinke ili kopiju odgovora sa frontenda kao izvor istine. Tuđi/nepostojeći resurs vraća 404; nevažeća sesija 401.

Interni `SummaryProvider.summarize(input)`:

- Ulaz: naslov/opis i sve predaje sa tekstom pitanja i vrednostima; checkbox ID-jevi postaju nazivi izabranih opcija. Nema kontaktnog mejla, submission ID-ja, datuma predaje, vlasnika, lozinke ni tokena. Slobodni tekst autora ostaje sadržaj za analizu.
- Izlaz: `overview`, `themes[]`, `positiveHighlights[]`, `improvements[]`, `suggestedActions[]`.
- Backend dopunjava `surveyId`, `responseCount`, `generatedAt`, `model`.
- Nema odgovora ili već postoji aktivan zahtev za tu anketu: 409; model nije konfigurisan/dostupan ili API kvota: 503; timeout: 504; nevalidan/prazan/prekinut izlaz: 502.
- Greška modela se ne predstavlja kao uspešan sažetak.

Provider poziva Google `generateContent` REST API, sa ključem u `x-goog-api-key` header-u. Samo naziv `gemma-*` prihvata se u konfiguraciji; nema zamene Gemini modelom. Podrazumevani model je `gemma-4-26b-a4b-it`, prema [Google dokumentaciji](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).

Rezultat se validira: overview je neprazan string do 1000 znakova; svaki od četiri niza ima do 6 nepraznih stringova do 250 znakova. JSON code fence je dozvoljen, drugi tekst i nevalidan JSON se odbijaju. Provider zahteva završen model odgovor (`STOP`). Feedback se u prompt-u tretira kao podatak, ne instrukcija; taj prompt sam ne garantuje tačnost zaključaka.

Svaki odgovor na pitanje je fragment označen rednim brojem predaje. Fragmenti ulaze u grupe do 24.000 serijalizovanih znakova, sa kontekstom naslova/opisa; parcijalni rezultati se rekurzivno spajaju. Nijedna predaja se ne odbacuje zbog dužine. Ukupni rok za sve pozive je `SUMMARY_TIMEOUT_MS` (120.000 ms). Ako obrada ne uspe, ne vraća se parcijalni rezultat kao konačan sažetak.

Sažetak je zastareo ako posle njegovog snapshot-a stignu nove predaje; prikaz pokazuje obrađeni broj i posle osvežavanja označava nove odgovore. Ne dodajemo Summary kolekciju niti disk persistenciju.
