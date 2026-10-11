# Gemify

Feedback za događaje: organizator pravi anketu, deli link i pregleda odgovore; učesnici popunjavaju bez naloga. Interfejs je na srpskom, latinicom.

Angular 21 frontend + Express 5/TypeScript backend. Podaci postoje samo u RAM-u jednog servera. Restart briše naloge, sesije, ankete, kontakte i predaje. Dugme **Sumiraj** poziva Gemmu preko Gemini API-ja i obrađuje sve predaje iz izabrane ankete. Kaggle notebook i procena korisnosti ostaju naredni deo hakatonskog rada.

## Pokretanje

Node 24 LTS preporučen; kompatibilan je i Node 22.12+. Potrebni su npm i dva terminala.

```powershell
cd backend
npm ci
Copy-Item .env.example .env
# Unesite svoj ključ u GEMINI_API_KEY u .env pre pokretanja.
npm run dev
```

U drugom terminalu, iz korena projekta:

```powershell
cd frontend
npm ci
npm start
```

Otvorite **http://localhost:4200**. API health: http://localhost:3000/api/health. Angular proxy šalje `/api` zahteve backendu na portu 3000.

Backend automatski učitava `backend/.env`; postojeće promenljive okruženja imaju prednost. `PORT` i `PUBLIC_APP_URL` podrazumevano su 3000 i `http://localhost:4200`. Za drugi uređaj postavite dostupnu LAN adresu pre pokretanja backenda:

```powershell
$env:PUBLIC_APP_URL = 'http://192.168.1.10:4200'
npm run dev
```

Za AI unesite Google AI Studio ključ u `GEMINI_API_KEY`; ključ ostaje u ignorisanom `backend/.env` i nikada se ne šalje browseru. `GEMMA_MODEL=gemma-4-26b-a4b-it` bira Gemma model, a `SUMMARY_TIMEOUT_MS=120000` ukupni rok za sažimanje. Restartujte backend posle izmene konfiguracije. Google dokumentuje Gemma pristup preko [Gemini API-ja](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).

Sažetak koristi snapshot svih odgovora iz jedne ankete, pretvara checkbox ID-jeve u nazive i ne šalje kontaktne mejlove niti podatke za prijavu. Veći ulaz obrađuje u grupama i spaja nalaze. Prikazuje broj obrađenih predaja, vreme i model; osvežavanje odgovora označava zastareo sažetak. Bez ključa ostatak aplikacije radi, a „Sumiraj” prikazuje jasnu grešku. Sažetak ostaje samo u otvorenom prikazu i ne čuva se na disku. Slobodni tekst pitanja/odgovora može sadržati lične podatke koje je autor sam uneo; izdvojeni kontakt ne ulazi u AI payload.

## Poređenje i ručni demo

Summary sada poredi izabrani događaj sa ostalim sopstvenim anketama po šest kriterijuma, prikazuje tačnu analitiku izbora i omogućava klik na nalaz za otvaranje izvornih odgovora. Ocene kriterijuma su AI procene; procenti izbora računaju se direktno na backendu. Tuđi događaji nisu deo poređenja.

Za ručno testiranje, sa pokrenutim backendom:

```powershell
node backend/scripts/seed-demo.mjs
```

Na http://localhost:4200 prijavite se sa **demo@gemmify.test** / **Seminar123!**. Dobijate tri demo seminara sa po šest sintetičkih predaja. Otvorite „Demo · AI seminar — hladna sala”, kliknite „Sumiraj”, zatim nalaz o temperaturi. Ispod nalaza se otvaraju izvorni odgovori, a niže poređenje i procenti. Restart prazni memoriju; demo skripta ponovo priprema podatke. `node backend/scripts/check-demo-summary.mjs` opcionalno troši jedan summary zahtev za stvarnu API proveru.

## Provere

Iz korena:

```powershell
npm ci
npm test
npm run build
npm run test:e2e
```

E2E koristi instalirani Microsoft Edge i automatski pokreće oba servera kada nisu već pokrenuti. Ne koristi stvarne naloge ili mejlove. Backend testovi koriste zaseban RAM store; browser provera kreira demo podatke u lokalnom serveru.

## Ponašanje prototipa

- Registracija, prijava, odjava i sesije od 24 sata. Samo token se čuva u `sessionStorage`.
- Tekstualna, checkbox (više izbora) i multiple choice (jedan izbor) pitanja, obavezna ili opciona. Nacrt se može menjati; objavljena anketa je zaključana i ima stabilan javni link.
- Mejl učesnika je obavezan, čuva se odvojeno i ne vraća u organizatorski pregled. Nema verifikacije mejla niti tvrdnje o potpunoj anonimnosti.
- Isti mejl može ponovo da popuni anketu. Retry istog zahteva ne pravi dodatnu predaju; isti ključ sa drugim sadržajem daje konflikt.
- Lozinke se po dogovorenom planu čuvaju kao obični stringovi u memoriji. Ovo je lokalni demo prototip.

Specifikacija i ugovor: [plan-hakaton](plan-hakaton/README.md). Napredak: [tasks.md](plan-hakaton/tasks.md). Rezultati provera: [verification.md](plan-hakaton/verification.md).
