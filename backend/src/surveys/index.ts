import { Router } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Store } from '../store/index.js';
import type { Survey, Question } from '../types/index.js';
import { requireSession } from '../auth/index.js';
import { ApiError } from '../middleware/errors.js';
import { Validator } from '../middleware/validation.js';
export function ownedSurvey(store: Store, id: string, ownerId: string) {
  const survey = store.surveysById.get(id);
  if (!survey || survey.ownerId !== ownerId) throw new ApiError(404, 'NOT_FOUND', 'Anketa nije dostupna.');
  return survey;
}
export function surveyView(store: Store, survey: Survey, url: string) {
  const { ownerId, publicToken, ...rest } = survey;
  return { ...rest, shareUrl: publicToken ? `${url.replace(/\/$/, '')}/s/${publicToken}` : null, responseCount: store.submissionsBySurveyId.get(survey.id)?.length ?? 0 };
}
export function surveyInput(input: unknown) {
  const v = new Validator(); const body = v.object(input, 'body', ['title', 'description', 'questions']);
  const title = v.string(body.title, 'title', 1, 120); const description = body.description === undefined ? '' : v.string(body.description, 'description', 0, 1000);
  const questions: Question[] = []; const ids = new Set<string>();
  if (!Array.isArray(body.questions) || body.questions.length < 1 || body.questions.length > 30) v.fail('questions', 'Dodajte od 1 do 30 pitanja.');
  else body.questions.forEach((raw, index) => {
    const p = `questions.${index}`;
    const q = v.object(raw, p, raw?.type === 'checkbox' || raw?.type === 'multiple_choice' ? ['id', 'type', 'label', 'required', 'options'] : ['id', 'type', 'label', 'required']);
    const id = v.id(q.id, `${p}.id`); if (ids.has(id)) v.fail(`${p}.id`, 'ID pitanja mora biti jedinstven.'); ids.add(id);
    const label = v.string(q.label, `${p}.label`, 1, 300);
    if (typeof q.required !== 'boolean') v.fail(`${p}.required`, 'Obaveznost mora biti boolean.');
    const required = q.required === true;
    if (q.type === 'text') questions.push({ id, type: 'text', label, required });
    else if (q.type === 'checkbox' || q.type === 'multiple_choice') {
      const options: { id: string; label: string }[] = []; const optionIds = new Set<string>(); const names = new Set<string>();
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 15) v.fail(`${p}.options`, 'Pitanje sa izborom mora imati od 2 do 15 opcija.');
      else q.options.forEach((rawOption, i) => {
        const op = `${p}.options.${i}`; const option = v.object(rawOption, op, ['id', 'label']);
        const oid = v.id(option.id, `${op}.id`); const name = v.string(option.label, `${op}.label`, 1, 150);
        if (optionIds.has(oid)) v.fail(`${op}.id`, 'ID opcije mora biti jedinstven.');
        if (names.has(name.toLowerCase())) v.fail(`${op}.label`, 'Nazivi opcija moraju biti različiti.');
        optionIds.add(oid); names.add(name.toLowerCase()); options.push({ id: oid, label: name });
      });
      questions.push({ id, type: q.type, label, required, options });
    } else v.fail(`${p}.type`, 'Podržana su tekstualna, checkbox i multiple choice pitanja.');
  });
  v.done(); return { title, description, questions };
}
export function surveysRouter(store: Store, publicAppUrl: string) {
  const router = Router(); router.use(requireSession(store));
  router.get('/', (_req, res) => {
    const items = [...store.surveysById.values()].filter(s => s.ownerId === res.locals.organizerId).reverse().map(s => ({ id: s.id, title: s.title, status: s.status, createdAt: s.createdAt, publishedAt: s.publishedAt, responseCount: store.submissionsBySurveyId.get(s.id)?.length ?? 0 }));
    res.json({ items });
  });
  router.post('/', (req, res) => {
    const body = surveyInput(req.body); const now = new Date().toISOString();
    const survey: Survey = { ...body, id: randomUUID(), ownerId: res.locals.organizerId, status: 'draft', publicToken: null, createdAt: now, updatedAt: now, publishedAt: null };
    store.surveysById.set(survey.id, survey); res.status(201).json({ survey: surveyView(store, survey, publicAppUrl) });
  });
  router.get('/:id', (req, res) => res.json({ survey: surveyView(store, ownedSurvey(store, req.params.id, res.locals.organizerId), publicAppUrl) }));
  router.patch('/:id', (req, res) => {
    const survey = ownedSurvey(store, req.params.id, res.locals.organizerId);
    if (survey.status !== 'draft') throw new ApiError(409, 'SURVEY_LOCKED', 'Objavljena anketa više ne može da se menja.');
    Object.assign(survey, surveyInput(req.body), { updatedAt: new Date().toISOString() }); res.json({ survey: surveyView(store, survey, publicAppUrl) });
  });
  router.post('/:id/publish', (req, res) => {
    const survey = ownedSurvey(store, req.params.id, res.locals.organizerId);
    if (!survey.publicToken) {
      let token: string; do { token = randomBytes(24).toString('hex'); } while (store.surveyIdByPublicToken.has(token));
      survey.publicToken = token; survey.status = 'published'; survey.publishedAt = new Date().toISOString(); survey.updatedAt = survey.publishedAt;
      store.surveyIdByPublicToken.set(token, survey.id);
    }
    res.json({ survey: surveyView(store, survey, publicAppUrl) });
  });
  return router;
}
