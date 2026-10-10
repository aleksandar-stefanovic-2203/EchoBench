# Odluke i istraživanje za nacrt

**Datum provere:** 2026-10-10. Dokument čuva obrazloženje prvobitnog predloga. Korisnik je posle pregleda zatražio implementaciju prve faze prema ovim odlukama; izvršni rezultati su u verification.md.

## 1. Tema i obavezni delovi hakatona

Pročitano je svih pet dostavljenih slika:

| Izvor | Zaključak za projekat |
| --- | --- |
| [The Challenge](../tema-slike/Screenshot%202026-10-10%20163213.png) | AI rešenje uz Gemmu treba da unapredi iskustvo učesnika, organizatora ili oba |
| [Possible Areas to Explore](../tema-slike/Screenshot%202026-10-10%20163244.png) | „Feedback & Continuous Improvement” direktno odgovara ideji |
| [Requirements](../tema-slike/Screenshot%202026-10-10%20163250.png) | Gemma je ključna komponenta; Kaggle je obavezan deo razvoja; potreban je funkcionalan prototip i pokazivanje korisnog/merljivog poboljšanja |
| [Your Mission](../tema-slike/Screenshot%202026-10-10%20163255.png) | Cilj je lakša organizacija i bolje iskustvo događaja |
| [Objava izazova](../tema-slike/Screenshot%202026-10-10%20163329.png) | Potvrđuje fokus na iskustvo događaja uz Gemmu |

**Odluka:** prvo gradimo dogovoreni prototip anketa, zatim AI fazu. Prva faza sama još ne pokriva sve navedene zahteve hakatona.

**Razlog:** tim je izričito odložio sažimanje, ali arhitektura i demo plan treba da ostave jasno mesto za njega.

**Alternativa:** integrisati AI odmah. Odbijeno za sada jer prelazi traženi obim.

## 2. Angular, Node i biblioteke

**Odluka:** Angular 21 LTS + TypeScript 5.9, Node 24 LTS i Express 5. Patch verzije zaključavamo pri implementaciji.

**Razlog:** kompatibilna kombinacija sa podrškom; Angular 21 podržava Node ^24.0.0 i TypeScript >=5.9 <6.0. Reactive Forms/FormArray odgovaraju dinamičkom editoru i prikazu ankete.

**Alternative:** Angular 22 zahteva drugu verzijsku kombinaciju; poseban form-builder framework i globalni state management nisu potrebni za dva tipa pitanja i mali prototip.

Zvanični izvori: [Angular kompatibilnost](https://angular.dev/reference/versions), [Angular podrška](https://angular.dev/reference/releases), [Reactive Forms](https://angular.dev/guide/forms/reactive-forms), [Dynamic Forms](https://angular.dev/guide/forms/dynamic-forms), [Node izdanja](https://nodejs.org/en/about/previous-releases), [Express 5](https://expressjs.com/en/guide/migrating-5/).

## 3. Memorija i prijava

**Odluka:** jedan Node proces sa Map kolekcijama; sesije sa nasumičnim tokenima; lozinke su obični stringovi u RAM-u.

**Razlog:** direktno prati zahtev za jednostavan prototip bez baze i bez šifrovanja lozinki. Backend i dalje proverava prijavu i vlasništvo ankete da bi dva organizatora imala odvojene podatke.

**Alternative:** baza, JWT infrastruktura ili spoljni auth servis nisu potrebni za ovaj obim. Browser storage nije izvor poslovnih podataka; sessionStorage sadrži samo token prijave.

Ovo je projektantska odluka prema zahtevu, ne preporuka za produkcijsko čuvanje lozinki. Restart gasi sve sesije i briše podatke.

## 4. Anonimnost i mejl

**Odluka za pregled:** obavezan mejl čuvati odvojeno, bez prikaza organizatoru i bez slanja AI-ju.

**Razlog:** zadržava korisnikov zahtev za mejlom i prikaz odgovora bez identiteta. Odvojene mape ne uklanjaju vezu sa predajom, pa se ne tvrdi potpuna anonimnost.

**Alternative:** prikazati mejl organizatoru ili ga uopšte ne prikupljati. Tim bira u README-u.

## 5. Stabilnost ankete i predaja

**Odluka za pregled:** javni link je stabilan; objavljena pitanja se ne menjaju; isti mejl sme ponovo da odgovori. Idempotentni zahtev sprečava samo tehničke duplikate.

**Razlog:** nema potrebe za verzijama pitanja i migracijama starih odgovora. Mejl bez verifikacije nije pouzdan dokaz identiteta.

**Alternative:** menjanje objavljene ankete i stroga jedinstvenost mejla. Mogu se dodati posle dogovora.

## 6. Gemma i Kaggle — kasnija faza

**Odluka:** dokumentovan SummaryProvider sloj na backendu, bez izabranog hosta i bez SDK-a u prvoj fazi.

**Razlog:** Gemma je porodica otvorenih modela sa više načina pokretanja. Dostupnost modela na Kaggle-u ili download API ne znači da već imamo inference endpoint za aplikaciju.

**Alternativa:** sada pretpostaviti određeni javni „Gemma API” ili slati zahteve iz browsera. Ne biramo to bez konkretnog provajdera i pristupa koji tim ima.

Zvanični izvori: [Gemma — početak](https://ai.google.dev/gemma/docs/get_started), [Kaggle modeli](https://www.kaggle.com/docs/models).

### Predlog rada za AI fazu

1. Izabrati Gemma model i okruženje koje tim stvarno može da koristi.
2. U Kaggle notebook-u pripremiti sintetičku anketu sa pozitivnim, negativnim i mešovitim feedbackom.
3. Probati prompt koji vraća pregled, ponavljajuće teme i konkretne predloge poboljšanja.
4. Ručno uporediti sa odgovorima i zabeležiti propuštene teme, netačne zaključke i vreme obrade.
5. Sačuvati notebook, izabrani model, primer ulaza/izlaza i kratak rezultat procene kao dokaz korišćenja Kaggle-a.
6. Odabrati stvarni inference hosting i povezati backend adapter; tek tada UI dobija pravi rezultat.

Ne koriste se stvarni mejlovi ili lozinke u notebook-u. Pri većem broju odgovora treba grupisati obradu i spojiti nalaze, tako da svaka predaja bude obuhvaćena. Korisnički feedback se tretira kao sadržaj za analizu, ne kao instrukcija agentu.

### Kako pokazati korist u završnom demou

Za isti sintetički skup uporediti vreme ručnog pregleda i vreme do pregledanog AI sažetka. Proveriti da sažetak obuhvata unapred označene ključne teme i daje organizatoru konkretne naredne korake. Vrednosti se mere u AI fazi; u nacrtu nema izmišljenih rezultata.

## Šta ostaje otvoreno

Tri produktne odluke u README-u primenjene su nakon korisnikovog naloga za početak implementacije. Istog dana korisnik je odobrio Gemma API implementaciju i potvrdio obim: sve predaje iz izabrane ankete.

## Odluka u nastavku — Gemini API za Gemmu

Google zvanično podržava hosted Gemma modele preko Gemini API-ja i navodi `gemma-4-26b-a4b-it` i `gemma-4-31b-it`. Izabran je prvi kao konfigurabilna podrazumevana vrednost. Potreban je Google AI Studio ključ, isti tip ključa kao za Gemini API; model koji aplikacija poziva ostaje Gemma. [Izvor, proveren 2026-10-10](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).

Koristimo native fetch i generateContent REST endpoint bez novog SDK-a. Prompt traži JSON koji backend strogo proverava. Ulaz se grupiše, svi parcijalni sažeci se spajaju; ukupan deadline i API greške sprečavaju predstavljanje nepotpune obrade kao uspeha. Automatske provere koriste simulirane odgovore; stvarna dostupnost modela za korisnikov nalog, kvalitet i latencija nisu izmereni bez ključa. Kaggle notebook i njegovi rezultati ostaju otvoren deo hakatonskog zahteva.
