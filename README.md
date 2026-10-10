# Gemify

Feedback za događaje: organizator pravi anketu, deli link i pregleda odgovore; učesnici popunjavaju bez naloga. Interfejs je na srpskom, latinicom.

Angular 21 frontend + Express 5/TypeScript backend. Podaci postoje samo u RAM-u jednog servera. Restart briše naloge, sesije, ankete, kontakte i predaje. Dugme **Sumiraj** prikazuje obaveštenje; Gemma/Kaggle integracija je naredna faza.

## Pokretanje

Node 24 LTS preporučen; kompatibilan je i Node 22.12+. Potrebni su npm i dva terminala.

```powershell
cd backend
npm ci
npm run dev
```

U drugom terminalu, iz korena projekta:

```powershell
cd frontend
npm ci
npm start
```

Otvorite **http://localhost:4200**. API health: http://localhost:3000/api/health. Angular proxy šalje `/api` zahteve backendu na portu 3000.

Backend čita `PORT` i `PUBLIC_APP_URL` iz okruženja, sa podrazumevanim vrednostima 3000 i `http://localhost:4200`. `.env.example` je primer, ne učitava se automatski. Za drugi uređaj postavite dostupnu LAN adresu pre pokretanja backenda:

```powershell
$env:PUBLIC_APP_URL = 'http://192.168.1.10:4200'
npm run dev
```

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
- Tekstualna i checkbox pitanja, obavezna ili opciona. Nacrt se može menjati; objavljena anketa je zaključana i ima stabilan javni link.
- Mejl učesnika je obavezan, čuva se odvojeno i ne vraća u organizatorski pregled. Nema verifikacije mejla niti tvrdnje o potpunoj anonimnosti.
- Isti mejl može ponovo da popuni anketu. Retry istog zahteva ne pravi dodatnu predaju; isti ključ sa drugim sadržajem daje konflikt.
- Lozinke se po dogovorenom planu čuvaju kao obični stringovi u memoriji. Ovo je lokalni demo prototip.

Specifikacija i ugovor: [plan-hakaton](plan-hakaton/README.md). Napredak: [tasks.md](plan-hakaton/tasks.md). Rezultati provera: [verification.md](plan-hakaton/verification.md).
