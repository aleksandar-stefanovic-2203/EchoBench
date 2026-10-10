import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
export const surveyBody = () => ({ title: 'Feedback hakatona', description: 'Podeli utiske.', questions: [
  { id: randomUUID(), type: 'text', label: 'Šta je bilo najbolje?', required: true },
  { id: randomUUID(), type: 'checkbox', label: 'Šta si koristio?', required: true, options: [{ id: randomUUID(), label: 'Mentori' }, { id: randomUUID(), label: 'Radionice' }] },
  { id: randomUUID(), type: 'text', label: 'Šta menjamo?', required: false },
  { id: randomUUID(), type: 'checkbox', label: 'Teme?', required: false, options: [{ id: randomUUID(), label: 'AI' }, { id: randomUUID(), label: 'Frontend' }] },
  { id: randomUUID(), type: 'multiple_choice', label: 'Kako ocenjuješ događaj?', required: true, options: [{ id: randomUUID(), label: 'Odlično' }, { id: randomUUID(), label: 'Dobro' }] },
] });
export async function register(app: ReturnType<typeof createApp>, n = 'a') {
  const result = await request(app).post('/api/auth/register').send({ username: `org-${n}`, email: `${n}@example.com`, password: ' demo123 ' });
  return result.body.sessionToken as string;
}
export async function fixture() {
  const app = createApp(); const token = await register(app); const body = surveyBody();
  const result = await request(app).post('/api/surveys').auth(token, { type: 'bearer' }).send(body);
  const id = result.body.survey.id as string;
  const published = await request(app).post(`/api/surveys/${id}/publish`).auth(token, { type: 'bearer' });
  const publicToken = published.body.survey.shareUrl.split('/').at(-1);
  const response = { clientRequestId: randomUUID(), respondentEmail: ' Person@Example.com ', answers: body.questions.map(q => ({ questionId: q.id, value: q.type === 'text' ? q.required ? 'Mentori su odlični.' : '' : q.type === 'multiple_choice' ? q.options[0].id : q.required ? q.options.map(o => o.id) : [] })) };
  return { app, token, body, id, publicToken, response };
}
