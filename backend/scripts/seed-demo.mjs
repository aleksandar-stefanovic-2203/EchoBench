import { randomUUID } from 'node:crypto';
const base = process.env.DEMO_API_URL ?? 'http://localhost:3000/api';
const credentials = { username: 'seminar-demo', email: 'demo@eventbench.test', password: 'Seminar123!' };
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
  { title: 'Demo · AI seminar — cold room', positive: ['The speakers are knowledgeable and the examples are very useful.', 'The content is relevant, but we had few practical exercises.', 'Excellent speaker; I would like more discussion.', 'The concrete examples can be applied at work.', 'The topics were explained well and the workshop was useful.', 'Knowledgeable presentation, but not enough time for questions.'], negative: ['The room temperature was low and we were freezing. The start was delayed and the break was short.', 'The room was cold and the schedule was not clearly posted.', 'The air conditioning was too strong and I was cold throughout the seminar. There were not enough refreshments.', 'Organization was poor: talks started late and breaks were too short.', 'Cold room and poor sound. Registration was easy, though.', 'The low temperature made it hard to concentrate. A longer break is needed.'], choices: [1, 1, 0, 0, 2, 1], issues: [[0, 1], [0, 2], [0, 1], [1, 2], [0, 3], [0, 1]] },
  { title: 'Demo · Web seminar — well organized', positive: ['Organization was excellent and everything started on time. The speakers were clear.', 'High-quality content and enough practical exercises.', 'The speakers were knowledgeable and answered all questions.', 'Excellent discussion and group work.', 'Useful examples and a well-prepared schedule.', 'The program was relevant and we had enough time to practice.'], negative: ['The room was pleasant and the temperature was comfortable. Breaks and refreshments were excellent.', 'Breaks were sufficient. The internet occasionally disconnected.', 'The venue was comfortable and logistics were well organized.', 'The content could have been a little more advanced.', 'Everything was on time, but the sound was weak at the back.', 'No complaints, a pleasant room and a good schedule.'], choices: [4, 4, 3, 4, 3, 4], issues: [[], [3], [], [], [3], []] },
  { title: 'Demo · Data seminar — not enough practice', positive: ['The speakers were knowledgeable and the content was detailed.', 'Relevant topics and clear presentations.', 'Registration and the schedule were well organized.', 'The room was warm and the equipment worked perfectly.', 'The speaker was prepared and the examples were useful.', 'A well-organized program and a pleasant venue.'], negative: ['Too much theory and not enough hands-on work. Breaks were good.', 'More exercises and discussion are needed; the presentation was too long.', 'Little time for questions; I would like more interaction.', 'The content was too basic for experienced attendees.', 'More workshops are needed. Refreshments were good.', 'The practical examples need more detail. Breaks were adequate.'], choices: [3, 2, 3, 2, 3, 2], issues: [[2], [2], [2], [], [2], [2]] },
];
const events = [];
for (const data of datasets) {
  const found = existing.find(s => s.title === data.title);
  if (found?.responseCount) { events.push({ id: found.id, title: found.title }); continue; }
  const rating = ['1 — Very poor', '2 — Poor', '3 — Average', '4 — Good', '5 — Excellent'].map(label => ({ id: randomUUID(), label }));
  const problems = ['Low temperature', 'Short breaks', 'Not enough hands-on work', 'Sound or internet'].map(label => ({ id: randomUUID(), label }));
  const questions = [
    { id: randomUUID(), type: 'text', label: 'What went well?', required: true },
    { id: randomUUID(), type: 'text', label: 'What should be improved?', required: true },
    { id: randomUUID(), type: 'multiple_choice', label: 'How would you rate the organization?', required: true, options: rating },
    { id: randomUUID(), type: 'checkbox', label: 'Which issues did you notice?', required: false, options: problems },
  ];
  const survey = (await api('/surveys', { title: data.title, description: 'Synthetic feedback for manually testing comparisons, analytics, and AI finding sources.', questions }, token)).survey;
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
