import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { register, surveyBody, fixture } from './helpers.js';
describe('US2 surveys', () => {
  it('čuva/rediguje nacrt, stabilno objavljuje i zaključava', async () => {
    const app = createApp(); const token = await register(app); const body = surveyBody();
    const created = await request(app).post('/api/surveys').auth(token, { type: 'bearer' }).send(body);
    expect(created.status).toBe(201); const id = created.body.survey.id;
    expect(created.body.survey).toMatchObject({ status: 'draft', shareUrl: null, responseCount: 0, questions: body.questions });
    expect(created.body.survey).not.toHaveProperty('ownerId');
    expect((await request(app).patch(`/api/surveys/${id}`).auth(token, { type: 'bearer' }).send({ ...body, title: ' Novo ' })).body.survey.title).toBe('Novo');
    const first = await request(app).post(`/api/surveys/${id}/publish`).auth(token, { type: 'bearer' });
    const second = await request(app).post(`/api/surveys/${id}/publish`).auth(token, { type: 'bearer' });
    expect(first.body.survey.shareUrl).toBe(second.body.survey.shareUrl);
    expect((await request(app).patch(`/api/surveys/${id}`).auth(token, { type: 'bearer' }).send(body)).status).toBe(409);
  });
  it('svaka privatna ruta proverava vlasnika', async () => {
    const { app, id, body } = await fixture(); const tokenB = await register(app, 'b');
    for (const [method, path] of [['get', ''], ['patch', ''], ['post', '/publish'], ['get', '/responses']] as const) {
      expect((await request(app)[method](`/api/surveys/${id}${path}`).auth(tokenB, { type: 'bearer' }).send(body)).status).toBe(404);
      expect((await request(app)[method](`/api/surveys/${id}${path}`).send(body)).status).toBe(401);
    }
    expect((await request(app).get('/api/surveys').auth(tokenB, { type: 'bearer' })).body.items).toEqual([]);
  });
  it('validira sve granice, UUID i jedinstvenost, tipove i dodatna polja', async () => {
    const app = createApp(); const token = await register(app); const body = surveyBody();
    const invalid = [ { ...body, title: ' ' }, { ...body, title: 'x'.repeat(121) }, { ...body, description: 'x'.repeat(1001) }, { ...body, questions: [] }, { ...body, questions: Array(31).fill(body.questions[0]) }, { ...body, ownerId: 'fake' }, { ...body, questions: [body.questions[0], body.questions[0]] }, { ...body, questions: [{ ...body.questions[0], id: 'not-uuid' }] }, { ...body, questions: [{ ...body.questions[0], required: 'yes' }] }, { ...body, questions: [{ ...body.questions[0], label: 'x'.repeat(301) }] }, { ...body, questions: [{ ...body.questions[0], type: 'radio' }] }, { ...body, questions: [{ ...body.questions[1], options: [{ ...body.questions[1].options![0] }] }] }, { ...body, questions: [{ ...body.questions[1], options: [{ ...body.questions[1].options![0] }, { ...body.questions[1].options![1], label: ' MENTORI ' }] }] } ];
    for (const payload of invalid) expect((await request(app).post('/api/surveys').auth(token, { type: 'bearer' }).send(payload)).status).toBe(422);
    expect((await request(app).get('/api/surveys').auth(token, { type: 'bearer' })).body.items).toEqual([]);
  });
  it('najnovija anketa je prva i javni token nije privatna sesija', async () => {
    const { app, token, id, publicToken } = await fixture();
    const second = await request(app).post('/api/surveys').auth(token, { type: 'bearer' }).send(surveyBody());
    expect((await request(app).get('/api/surveys').auth(token, { type: 'bearer' })).body.items.map((s: any) => s.id)).toEqual([second.body.survey.id, id]);
    expect((await request(app).get(`/api/surveys/${id}`).auth(publicToken, { type: 'bearer' })).status).toBe(401);
  });
});
