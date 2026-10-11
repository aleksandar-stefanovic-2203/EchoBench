import { randomUUID } from 'node:crypto';
const base = process.env.DEMO_API_URL ?? 'http://localhost:3000/api';
const credentials = { username: 'seminar-demo', email: 'demo@gemmify.test', password: 'Seminar123!' };
async function api(path, data, token) {
  const response = await fetch(base + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  const body = await response.json();
  if (!response.ok) throw new Error(path + ': ' + body.error?.message);
  return body;
}
let auth;
try { auth = await api('/auth/login', credentials); }
catch { auth = await api('/auth/register', credentials); }
const token = auth.sessionToken;
const existing = (await api('/surveys', undefined, token)).items;
const datasets = [
  { title: 'Demo · AI seminar — hladna sala', positive: ['Predavači su stručni i primeri veoma korisni.', 'Sadržaj je relevantan, ali smo imali malo praktičnih vežbi.', 'Odličan predavač; želeo bih više diskusije.', 'Konkretni primeri su primenljivi na poslu.', 'Dobro objašnjene teme, radionica je bila korisna.', 'Stručno izlaganje, ali nedovoljno vremena za pitanja.'], negative: ['Temperatura u sali je bila niska, smrzavali smo se. Početak je kasnio i pauza je bila kratka.', 'Sala je hladna i raspored nije bio jasno objavljen.', 'Klima je prejaka, bilo mi je hladno tokom celog seminara. Nije bilo dovoljno osveženja.', 'Organizacija je loša: predavanja kasne i pauze su prekratke.', 'Hladna sala i slab zvuk. Prijava je ipak bila jednostavna.', 'Niska temperatura otežala mi je praćenje. Potrebna je duža pauza.'], choices: [1, 1, 0, 0, 2, 1], issues: [[0, 1], [0, 2], [0, 1], [1, 2], [0, 3], [0, 1]] },
  { title: 'Demo · Web seminar — dobra organizacija', positive: ['Organizacija je odlična, sve je počelo na vreme. Predavači su jasni.', 'Kvalitetan sadržaj i dovoljno praktičnih vežbi.', 'Predavači su stručni i odgovarali su na sva pitanja.', 'Odlična diskusija i rad u grupama.', 'Korisni primeri i dobro pripremljen raspored.', 'Program je relevantan, imali smo dovoljno vremena za vežbu.'], negative: ['Sala je prijatna i temperatura odgovarajuća. Pauze i osveženje su odlični.', 'Pauze su bile dovoljne. Internet je povremeno prekidao.', 'Prostor je udoban, logistika dobro organizovana.', 'Sadržaj je mogao biti malo napredniji.', 'Sve je na vreme, ali je zvuk pozadi bio slab.', 'Nemam žalbe, prijatna sala i dobar raspored.'], choices: [4, 4, 3, 4, 3, 4], issues: [[], [3], [], [], [3], []] },
  { title: 'Demo · Data seminar — premalo prakse', positive: ['Predavači su stručni, sadržaj detaljan.', 'Relevantne teme i jasno izlaganje.', 'Prijava i satnica su dobro organizovani.', 'Sala je topla i oprema je radila odlično.', 'Predavač je pripremljen, primeri korisni.', 'Dobro organizovan program i prijatan prostor.'], negative: ['Previše teorije i premalo praktičnog rada. Pauze su bile dobre.', 'Nedostaju vežbe i diskusija, prezentacija je preduga.', 'Malo vremena za pitanja, želeo bih više interakcije.', 'Sadržaj je previše osnovan za iskusnije učesnike.', 'Potrebno je više radionica. Osveženje je bilo dobro.', 'Praktični primeri nisu dovoljno razrađeni. Pauze su odgovarajuće.'], choices: [3, 2, 3, 2, 3, 2], issues: [[2], [2], [2], [], [2], [2]] },
];
const events = [];
for (const data of datasets) {
  const found = existing.find(s => s.title === data.title);
  if (found?.responseCount) { events.push({ id: found.id, title: found.title }); continue; }
  const rating = ['1 — Veoma loša', '2 — Loša', '3 — Osrednja', '4 — Dobra', '5 — Odlična'].map(label => ({ id: randomUUID(), label }));
  const problems = ['Niska temperatura', 'Kratke pauze', 'Premalo praktičnog rada', 'Zvuk ili internet'].map(label => ({ id: randomUUID(), label }));
  const questions = [
    { id: randomUUID(), type: 'text', label: 'Šta je bilo dobro?', required: true },
    { id: randomUUID(), type: 'text', label: 'Šta treba poboljšati?', required: true },
    { id: randomUUID(), type: 'multiple_choice', label: 'Kako ocenjujete organizaciju?', required: true, options: rating },
    { id: randomUUID(), type: 'checkbox', label: 'Koje probleme ste primetili?', required: false, options: problems },
  ];
  const survey = (await api('/surveys', { title: data.title, description: 'Sintetički feedback za ručno testiranje poređenja, analitike i izvora AI nalaza.', questions }, token)).survey;
  const published = (await api('/surveys/' + survey.id + '/publish', {}, token)).survey;
  const publicToken = published.shareUrl.split('/').at(-1);
  for (let i = 0; i < data.positive.length; i++) {
    await api('/public/surveys/' + publicToken + '/responses', { clientRequestId: randomUUID(), respondentEmail: 'guest' + i + '@example.test', answers: [
      { questionId: questions[0].id, value: data.positive[i] }, { questionId: questions[1].id, value: data.negative[i] },
      { questionId: questions[2].id, value: rating[data.choices[i]].id }, { questionId: questions[3].id, value: data.issues[i].map(n => problems[n].id) },
    ] });
  }
  events.push({ id: survey.id, title: survey.title });
}
console.log(JSON.stringify({ email: credentials.email, password: credentials.password, events: events.map(e => ({ ...e, url: 'http://localhost:4200/surveys/' + e.id })) }, null, 2));
