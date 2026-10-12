import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { requireSession } from '../auth/index.js';
import { ApiError } from '../middleware/errors.js';
import { Validator } from '../middleware/validation.js';
import { ownedSurvey } from '../surveys/index.js';
import type { Store } from '../store/index.js';
import type { Answer, Survey } from '../types/index.js';
function publicSurvey(store: Store, token: string) {
  const id = store.surveyIdByPublicToken.get(token); const survey = id ? store.surveysById.get(id) : undefined;
  if (!survey || survey.status !== 'published') throw new ApiError(404, 'NOT_FOUND', 'Survey unavailable.');
  return survey;
}
export function submissionInput(input: unknown, survey: Survey) {
  const v = new Validator(); const body = v.object(input, 'body', ['clientRequestId', 'respondentEmail', 'answers']);
  const clientRequestId = v.id(body.clientRequestId, 'clientRequestId'); const email = v.email(body.respondentEmail, 'respondentEmail');
  const byId = new Map<string, unknown>(); const answers: Answer[] = [];
  if (!Array.isArray(body.answers)) v.fail('answers', 'Provide responses to all questions.');
  else body.answers.forEach(raw => {
    const a = v.object(raw, 'answers', ['questionId', 'value']); const id = v.id(a.questionId, 'answers');
    if (byId.has(id)) v.fail(`answers.${id}`, 'The question has duplicate responses.');
    if (!survey.questions.some(q => q.id === id)) v.fail(`answers.${id}`, 'Unknown question.');
    byId.set(id, a.value);
  });
  survey.questions.forEach(q => {
    const path = `answers.${q.id}`; const value = byId.get(q.id);
    if (!byId.has(q.id)) v.fail(path, 'A response is missing.');
    if (q.type === 'text') {
      const text = v.string(value, path, q.required ? 1 : 0, 2000);
      answers.push({ questionId: q.id, value: text });
    } else if (q.type === 'checkbox') {
      if (!Array.isArray(value) || !value.every(o => typeof o === 'string' && q.options.some(opt => opt.id === o)) || new Set(value).size !== value.length || (q.required && value.length === 0)) v.fail(path, q.required ? 'Select at least one valid option without duplicates.' : 'Select valid options without duplicates.');
      answers.push({ questionId: q.id, value: Array.isArray(value) ? [...value].sort() : [] });
    } else {
      if (typeof value !== 'string' || !q.options.some(opt => opt.id === value) || (q.required && !value)) v.fail(path, q.required ? 'Select one valid option.' : 'Select a valid option.');
      answers.push({ questionId: q.id, value: typeof value === 'string' ? value : '' });
    }
  });
  v.done(); return { clientRequestId, email, answers };
}
export function publicRouter(store: Store) {
  const router = Router();
  router.get('/:publicToken', (req, res) => {
    const { title, description, questions } = publicSurvey(store, req.params.publicToken);
    res.json({ survey: { title, description, questions, requiresEmail: true } });
  });
  router.post('/:publicToken/responses', (req, res) => {
    const survey = publicSurvey(store, req.params.publicToken); const { clientRequestId, email, answers } = submissionInput(req.body, survey);
    const key = `${survey.id}:${clientRequestId}`; const list = store.submissionsBySurveyId.get(survey.id) ?? []; const existingId = store.submissionIdByRequestKey.get(key);
    if (existingId) {
      const existing = list.find(s => s.id === existingId)!;
      if (JSON.stringify(existing.answers) !== JSON.stringify(answers) || store.contactsBySubmissionId.get(existingId)!.email !== email) throw new ApiError(409, 'REQUEST_CONFLICT', 'This request was already submitted with different content. Use a new submission for another response.');
      res.json({ submissionId: existing.id, submittedAt: existing.submittedAt }); return;
    }
    const submission = { id: randomUUID(), surveyId: survey.id, clientRequestId, answers, submittedAt: new Date().toISOString() };
    list.push(submission); store.submissionsBySurveyId.set(survey.id, list); store.contactsBySubmissionId.set(submission.id, { submissionId: submission.id, email }); store.submissionIdByRequestKey.set(key, submission.id);
    res.status(201).json({ submissionId: submission.id, submittedAt: submission.submittedAt });
  });
  return router;
}
export function responsesRouter(store: Store) {
  const router = Router(); router.use(requireSession(store));
  router.get('/:id/responses', (req, res) => {
    const survey = ownedSurvey(store, req.params.id, res.locals.organizerId);
    const items = [...(store.submissionsBySurveyId.get(survey.id) ?? [])].reverse().map(({ id, submittedAt, answers }) => ({ id, submittedAt, answers }));
    res.json({ items, total: items.length });
  });
  return router;
}
