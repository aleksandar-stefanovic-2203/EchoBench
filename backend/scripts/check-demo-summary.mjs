const base = process.env.DEMO_API_URL ?? 'http://localhost:3000/api';
const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@eventbench.test', password: 'Seminar123!' }) });
if (!login.ok) throw new Error('Demo login failed. Run seed-demo.mjs first.');
const { sessionToken } = await login.json();
const headers = { Authorization: 'Bearer ' + sessionToken, 'Content-Type': 'application/json' };
const surveys = (await (await fetch(base + '/surveys', { headers })).json()).items;
const target = surveys.find(s => s.title === 'Demo · AI seminar — cold room');
if (!target) throw new Error('Demo event not found.');
const started = Date.now();
const response = await fetch(base + '/surveys/' + target.id + '/summary', { method: 'POST', headers, body: '{}' });
const body = await response.json();
if (!response.ok) { console.log(JSON.stringify({ status: response.status, error: body.error, elapsedMs: Date.now() - started })); process.exitCode = 1; }
else {
  const s = body.summary;
  console.log(JSON.stringify({ status: response.status, elapsedMs: Date.now() - started, model: s.model, responseCount: s.responseCount, comparedEvents: s.comparison.events.length, overview: s.overview, improvements: s.improvements, criteria: s.comparison.criteria.map(c => ({ label: c.label, target: c.target, others: c.others })), analytics: s.analytics.map(q => ({ label: q.label, options: q.options })) }, null, 2));
}
