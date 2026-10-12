# Pokretanje i provera

**Status:** frontend, backend i komande su napravljeni. Izvršne rezultate proverite u [verification.md](verification.md).

## Predviđeni preduslovi

- Node.js 24 LTS i npm; lokalna implementacija proverava se na kompatibilnom Node 22.20.
- Dva terminala u korenu repozitorijuma.
- Baza nije potrebna. Sažimanje u drugoj fazi zahteva Google AI Studio / Gemini API ključ sa pristupom Gemma modelu; ostali tokovi rade i bez ključa.
- Zaključane zavisnosti su u tri package-lock.json fajla. E2E koristi instalirani Microsoft Edge.

## Komande

Backend terminal:

```powershell
cd C:\Users\User\Desktop\Gemify\backend
npm ci
Copy-Item .env.example .env
# U .env popuniti GEMINI_API_KEY. Posle izmena restartovati backend.
npm run dev
```

Frontend terminal:

```powershell
cd C:\Users\User\Desktop\Gemify\frontend
npm ci
npm start
```

Predviđene adrese: frontend `http://localhost:4200`, backend `http://localhost:3000`, health `http://localhost:3000/api/health`. Angular proxy usmerava `/api` na backend. Backend dobija `PORT=3000` i `PUBLIC_APP_URL=http://localhost:4200` iz konfiguracije sa ovim lokalnim podrazumevanim vrednostima.

Za drugi uređaj treba podesiti dostupnu frontend adresu i mrežni pristup za dev server. Javni link ka localhost-u radi samo na računaru koji ga je otvorio.

## Glavni demo scenario

1. Registrovati organizatora A; očekivana je prazna lista anketa.
2. Napraviti „Feedback hakatona” sa četiri pitanja:
   - obavezno tekstualno: „Šta je bilo najbolje?”;
   - opciono tekstualno: „Šta menjamo sledeći put?”;
   - obavezno checkbox: „Šta si koristio?” — mentori/radionice/networking;
   - opciono checkbox: „Koje teme želiš?” — AI/frontend/backend.
3. Sačuvati nacrt, ponovo ga otvoriti i proveriti da ništa nije izgubljeno.
4. Generisati link dva puta; očekuje se isti URL i status published.
5. Otvoriti link u privatnom prozoru bez prijave.
6. Pokušati nevalidnu predaju bez mejla i obaveznih odgovora; očekuje se greška i nula sačuvanih predaja.
7. Poslati validnu predaju sa dve checkbox opcije i praznim opcionim pitanjima; očekuje se potvrda.
8. Poslati još dve predaje; organizator posle osvežavanja vidi ukupno tri, tačan tekst i nazive opcija, bez kontakata.
9. Kliknuti „Sumiraj”; sa podešenim ključem očekuje se Gemma sažetak svih tri predaja sa pregledom, temama i koracima. Bez ključa očekuje se poruka za konfiguraciju, bez lažnog sažetka. Tokom obrade dugme je disabled. Poslati novu predaju, osvežiti i proveriti oznaku zastarelog sažetka.
10. Registrovati B u drugom prozoru; njegov dashboard je prazan i direktan pristup privatnim rutama ankete A nije dozvoljen.
11. Odjaviti A; privatni zahtevi sa njegovim starim tokenom više ne uspevaju.
12. Restartovati backend; očekuju se prazni store-ovi, nevažeće sesije i nevažeći prethodni javni link.

## Ciljane automatske provere

| Oblast | Provera |
| --- | --- |
| Registracija | Duplikat mejla/username-a nakon normalizacije je odbijen |
| Sesija/vlasništvo | Nevažeća sesija: 401; tuđa privatna anketa: 404 |
| Validacija | Obavezna polja, dupli/nepoznati ID-jevi, pogrešan tip i nepostojeće opcije: 422 |
| Objavljivanje | Stabilan link; izmena posle objave: 409 |
| Predaja | Isti clientRequestId i isti sadržaj: isti rezultat, ukupan broj ne raste |
| Konflikt predaje | Isti clientRequestId sa drugim sadržajem: 409 |
| Kontakti | Mejl/lozinka se ne pojavljuju u javnom sadržaju ili odgovoru za listu predaja |
| E2E | Organizator napravi anketu → gost preda → vlasnik pročita |

Provere: backend `npm test`, root `npm run build` (backend TypeScript i Angular production build), i root `npm run test:e2e`. Za root Playwright zavisnosti prvo pokrenuti `npm ci` u korenu. Frontend tokovi se proveravaju glavnim Playwright scenarijem; nema posebne frontend unit-test skripte. E2E automatski pokreće servere ako nisu dostupni. Backend koristi `.npmrc` za npm 10 problem sa opcionim Vitest browser peer zavisnostima.

## Ručna provera UI-ja

### Poređenje i klik na izvor — demo

Sa pokrenutim serverima iz korena pokrenuti `node backend/scripts/seed-demo.mjs`. Prijava: `demo@gemmify.test` / `Seminar123!`. Tri demo seminara imaju po šest sintetičkih predaja; svaki ima dva tekstualna, jedno multiple-choice i jedno checkbox pitanje. Otvoriti AI seminar sa hladnom salom i kliknuti „Sumiraj”. Proveriti šest kriterijuma i benchmark prema drugim seminarima, otvoriti nalaz o temperaturi i pročitati citirane predaje/pitanja. Za problem „Niska temperatura” očekuje se tačan checkbox broj 5/6 i 83,3%. AI indeks nije taj procenat. Novi feedback u bilo kojoj anketi uključuje se pri sledećem sumiranju. Serverski podaci ostaju u RAM-u; posle restarta ponoviti demo skriptu.

Proveriti prikaz na širini 360 px, tab navigaciju, oznake obaveznih polja, povezane labele, prazne liste, greške servera, zadržavanje unosa posle neuspelog slanja i mogućnost ručnog kopiranja prikazanog linka ako clipboard nije dostupan.

AI adapter/API testovi koriste simulirane Google odgovore; browser test simulira summary endpoint da ne troši kvotu. Stvarnu kvalitet/vreme provere izvršiti sa korisnikovim ključem na sintetičkom feedbacku, prema [research.md](research.md) i [API ugovoru](contracts/api.md). Backend automatski učitava backend/.env, sa postojećim env promenljivama kao prioritetom.
