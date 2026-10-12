import { randomBytes, randomUUID } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import type { Store } from '../store/index.js';
import type { Organizer } from '../types/index.js';
import { ApiError } from '../middleware/errors.js';
import { Validator } from '../middleware/validation.js';
const view = ({ id, username, email }: Organizer) => ({ id, username, email });
export function requireSession(store: Store): RequestHandler {
  return (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    const session = token ? store.sessionsByToken.get(token) : undefined;
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      if (token) store.sessionsByToken.delete(token);
      throw new ApiError(401, 'UNAUTHORIZED', 'Log in to continue.');
    }
    res.locals.organizerId = session.organizerId; res.locals.sessionToken = token; next();
  };
}
export function authRouter(store: Store) {
  const router = Router();
  const session = (organizer: Organizer) => {
    const token = randomBytes(32).toString('hex');
    store.sessionsByToken.set(token, { token, organizerId: organizer.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() });
    return { organizer: view(organizer), sessionToken: token };
  };
  router.post('/register', (req, res) => {
    const v = new Validator(); const body = v.object(req.body, 'body', ['username', 'email', 'password']);
    const username = v.string(body.username, 'username', 3, 40); const email = v.email(body.email, 'email'); const password = v.string(body.password, 'password', 6, 128, false); v.done();
    const usernameKey = username.toLowerCase();
    if (store.organizerIdByEmail.has(email)) throw new ApiError(409, 'EMAIL_TAKEN', 'This email is already registered.', { email: 'This email is already registered.' });
    if (store.organizerIdByUsername.has(usernameKey)) throw new ApiError(409, 'USERNAME_TAKEN', 'This username is taken.', { username: 'This username is taken.' });
    const organizer = { id: randomUUID(), username, usernameKey, email, password, createdAt: new Date().toISOString() };
    store.organizersById.set(organizer.id, organizer); store.organizerIdByEmail.set(email, organizer.id); store.organizerIdByUsername.set(usernameKey, organizer.id);
    res.status(201).json(session(organizer));
  });
  router.post('/login', (req, res) => {
    const v = new Validator(); const body = v.object(req.body, 'body', ['email', 'password']); const email = v.email(body.email, 'email'); const password = v.string(body.password, 'password', 6, 128, false); v.done();
    const id = store.organizerIdByEmail.get(email); const organizer = id ? store.organizersById.get(id) : undefined;
    if (!organizer || organizer.password !== password) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    res.json(session(organizer));
  });
  router.get('/me', requireSession(store), (_req, res) => res.json({ organizer: view(store.organizersById.get(res.locals.organizerId)!) }));
  router.post('/logout', requireSession(store), (_req, res) => { store.sessionsByToken.delete(res.locals.sessionToken); res.status(204).end(); });
  return router;
}
