# Plan pokretanja i provere

**Status:** vodič za buduću implementaciju. Frontend, backend, package.json i komande ispod još nisu napravljeni. Trenutno se pregledaju dokumenti iz [README-a](README.md).

## Predviđeni preduslovi

- Node.js 24 LTS i npm.
- Dva terminala u korenu repozitorijuma.
- Za prvu fazu nisu potrebni baza, AI ključ niti Kaggle nalog.
- Zaključane zavisnosti i npm skripte dodaju se tokom implementacije.

## Predložene komande posle implementacije

Backend terminal:

```powershell
cd C:\Users\User\Desktop\Gemify\backend
npm ci
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
9. Kliknuti „Sumiraj”; očekuje se obaveštenje da AI nije povezan i nijedan AI mrežni poziv.
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

Predlog: backend `npm test`, frontend `npm test -- --watch=false`, i root `npm run test:e2e`. Tačne skripte nastaju pri implementaciji; ne tvrdi se da trenutno rade.

## Ručna provera UI-ja

Proveriti prikaz na širini 360 px, tab navigaciju, oznake obaveznih polja, povezane labele, prazne liste, greške servera, zadržavanje unosa posle neuspelog slanja i mogućnost ručnog kopiranja prikazanog linka ako clipboard nije dostupan.

AI funkcionalnost se proverava tek u zasebnoj narednoj fazi, prema [research.md](research.md) i [API ugovoru](contracts/api.md).
