import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { fixture, register } from './helpers.js';
import { createApp } from '../src/app.js';
describe('US3/US4 responses', () => {
  it('javni sadržaj nema privatna polja; nevažeći link je 404', async () => {
    const { app, publicToken } = await fixture();
    const result = await request(app).get(`/api/public/surveys/${publicToken}`);
    expect(result.status).toBe(200); expect(Object.keys(result.body.survey).sort()).toEqual(['description', 'questions', 'requiresEmail', 'title']);
    expect((await request(app).get('/api/public/surveys/invalid')).status).toBe(404);
  });
  it('prima, ali ne čuva predaju koja je završena pre minimalnog vremena', async () => {
    const { app, publicToken, token, id, response } = await fixture();
    const result = await request(app).post(`/api/public/surveys/${publicToken}/responses`).send({ ...response, durationMs: 34_999 });
    expect(result.status).toBe(202);
    expect(result.body).toMatchObject({ accepted: false, ignored: true });
    expect(result.body.reason).toContain('35 sekundi');
    expect((await request(app).get(`/api/surveys/${id}/responses`).auth(token, { type: 'bearer' })).body).toEqual({ items: [], total: 0 });
  });
  it('atomarna validacija odbija prazne, nedostajuće, duple/nepoznate i pogrešne odgovore', async () => {
    const { app, publicToken, token, id, response } = await fixture();
    const invalid = [ { ...response, respondentEmail: 'wrong' }, { ...response, clientRequestId: 'wrong' }, { ...response, answers: response.answers.slice(1) }, { ...response, answers: [...response.answers,response.answers[0]] }, { ...response, answers: response.answers.map((a,i) => i === 0 ? { ...a, questionId: randomUUID() } : a) }, { ...response, answers: response.answers.map((a,i) => i === 0 ? { ...a, value: ' ' } : a) }, { ...response, answers: response.answers.map((a,i) => i === 0 ? { ...a, value: 'x'.repeat(2001) } : a) }, { ...response, answers: response.answers.map((a,i) => i === 1 ? { ...a, value: [randomUUID()] } : a) }, { ...response, answers: response.answers.map((a,i) => i === 1 ? { ...a, value: [] } : a) }, { ...response, answers: response.answers.map((a,i) => i === 1 ? { ...a, value: [a.value[0],a.value[0]] } : a) }, { ...response, answers: response.answers.map((a,i) => i === 0 ? { ...a, value: [] } : a) }, { ...response, answers: response.answers.map((a,i) => i === 1 ? { ...a, value: 'text' } : a) }, { ...response, ownerId: 'fake' } ];
    for(const body of invalid) expect((await request(app).post(`/api/public/surveys/${publicToken}/responses`).send(body)).status).toBe(422);
    expect((await request(app).get(`/api/surveys/${id}/responses`).auth(token, { type: 'bearer' })).body).toEqual({ items: [], total: 0 });
  });
  it('isti retry je 200, drugi sadržaj 409, namerno isti mejl je nov odgovor', async () => {
    const { app, publicToken, token, id, response } = await fixture(); const path = `/api/public/surveys/${publicToken}/responses`;
    const first = await request(app).post(path).send(response); expect(first.status).toBe(201);
    const retry = await request(app).post(path).send({ ...response, respondentEmail: 'person@example.com', answers: [...response.answers].reverse().map(a => Array.isArray(a.value) ? { ...a, value: [...a.value].reverse() } : a) });
    expect(retry.status).toBe(200); expect(retry.body).toEqual(first.body);
    expect((await request(app).post(path).send({ ...response, respondentEmail: 'other@example.com' })).status).toBe(409);
    for(let i=0;i<2;i++) expect((await request(app).post(path).send({ ...response, clientRequestId: randomUUID() })).status).toBe(201);
    const list = await request(app).get(`/api/surveys/${id}/responses`).auth(token, { type: 'bearer' });
    expect(list.body.total).toBe(3); expect(list.body.items.at(-1).id).toBe(first.body.submissionId); expect(JSON.stringify(list.body)).not.toContain('example.com');
    expect(list.body.items[0].answers).toEqual(response.answers.map(a => ({ ...a, value: Array.isArray(a.value) ? [...a.value].sort() : a.value })));
    expect((await request(app).get(`/api/surveys/${id}`).auth(token, { type: 'bearer' })).body.survey.responseCount).toBe(3);
  });
  it('paralelni identični zahtevi stvaraju samo jednu predaju', async () => {
    const { app, publicToken, token, id, response } = await fixture();
    const results = await Promise.all(Array.from({length: 8}, () => request(app).post(`/api/public/surveys/${publicToken}/responses`).send(response)));
    expect(results.filter(r => r.status === 201)).toHaveLength(1); expect(results.every(r => [200,201].includes(r.status))).toBe(true);
    expect((await request(app).get(`/api/surveys/${id}/responses`).auth(token, {type:'bearer'})).body.total).toBe(1);
  });
  it('drugi vlasnik, restart i odloženi AI nemaju pristup', async () => {
    const { app, publicToken, id } = await fixture(); const tokenB = await register(app,'b');
    expect((await request(app).get(`/api/surveys/${id}/responses`).auth(tokenB,{type:'bearer'})).status).toBe(404);
    expect((await request(createApp()).get(`/api/public/surveys/${publicToken}`)).status).toBe(404);
    expect((await request(app).post(`/api/surveys/${id}/summary`).auth(tokenB,{type:'bearer'})).status).toBe(404);
  });
});
