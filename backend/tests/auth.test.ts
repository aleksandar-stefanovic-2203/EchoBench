import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store/index.js';
import { register } from './helpers.js';
describe('US1 auth', () => {
  it('health radi i registracija normalizuje profil, ali ne vraća tajne', async () => {
    const app = createApp(); expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
    const result = await request(app).post('/api/auth/register').send({ username: ' Org ', email: ' A@Example.com ', password: ' demo123 ' });
    expect(result.status).toBe(201); expect(result.body.organizer).toMatchObject({ username: 'Org', email: 'a@example.com' }); expect(result.body.organizer).not.toHaveProperty('password');
    expect((await request(app).get('/api/auth/me').auth(result.body.sessionToken, { type: 'bearer' })).status).toBe(200);
  });
  it('normalizovani mejl/username su jedinstveni; ne trimuje lozinku', async () => {
    const app = createApp(); await register(app);
    for (const body of [{ username: 'other', email: ' A@EXAMPLE.COM ', password: 'demo123' }, { username: ' ORG-A ', email: 'other@example.com', password: 'demo123' }]) expect((await request(app).post('/api/auth/register').send(body)).status).toBe(409);
    expect((await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'demo123' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'A@example.com', password: ' demo123 ' })).status).toBe(200);
  });
  it('validira granice i dodatna polja', async () => {
    const app = createApp(); for (const body of [{ username: 'ab', email: 'invalid', password: '123' }, { username: 'abc', email: 'a@example.com', password: '123456', ownerId: 'fake' }, null]) expect((await request(app).post('/api/auth/register').send(body)).status).toBe(422);
  });
  it('odjava i istek ukidaju token, restart briše podatke', async () => {
    const store = createStore(); const app = createApp(store); const token = await register(app);
    expect((await request(app).post('/api/auth/logout').auth(token, { type: 'bearer' })).status).toBe(204);
    expect((await request(app).get('/api/auth/me').auth(token, { type: 'bearer' })).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: ' demo123 ' });
    store.sessionsByToken.get(login.body.sessionToken)!.expiresAt = new Date(0).toISOString();
    expect((await request(app).get('/api/auth/me').auth(login.body.sessionToken, { type: 'bearer' })).status).toBe(401);
    expect(store.sessionsByToken.size).toBe(0);
    expect((await request(createApp()).post('/api/auth/login').send({ email: 'a@example.com', password: ' demo123 ' })).status).toBe(401);
  });
  it('malformirani JSON i preveliko telo imaju ugovorene greške', async () => {
    const app = createApp(); expect((await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{')).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ data: 'x'.repeat(270000) })).status).toBe(413);
  });
  it('validan JSON pogrešnog oblika daje 422, ne parser grešku', async () => {
    const app=createApp();
    for(const body of ['null','"tekst"','42','true','[]']) {
      const result=await request(app).post('/api/auth/register').set('Content-Type','application/json').send(body);
      expect(result.status).toBe(422);expect(result.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
