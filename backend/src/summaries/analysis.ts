import type { Store } from '../store/index.js';
import type { Survey } from '../types/index.js';
import { ApiError } from '../middleware/errors.js';

export const CRITERIA = [
  { id: 'organization', label: 'Organizacija', description: 'Raspored, prijava, jasnoća informacija i poštovanje satnice.' },
  { id: 'content', label: 'Sadržaj', description: 'Relevantnost, kvalitet i primenljivost programa.' },
  { id: 'speakers', label: 'Predavači', description: 'Stručnost, jasnoća izlaganja i odgovaranje na pitanja.' },
  { id: 'practice', label: 'Praksa i interakcija', description: 'Vežbe, diskusija, uključivanje učesnika i networking.' },
  { id: 'venue', label: 'Prostor i uslovi', description: 'Temperatura, udobnost, vidljivost, zvuk, internet i oprema.' },
  { id: 'logistics', label: 'Logistika i pauze', description: 'Pauze, osveženje, hrana, dostupnost i prateća podrška.' },
] as const;
export type Sentiment = 'positive' | 'neutral' | 'negative';
export interface EvidenceSource { sourceId: string; surveyId: string; surveyTitle: string; submissionId: string; questionId: string; responseNumber: number; questionNumber: number; question: string; value: string | string[] }
export interface SummaryInput { surveyId: string; title: string; description: string; surveys: { id: string; title: string; responseCount: number }[]; sources: EvidenceSource[] }
export interface Finding { text: string; sourceIds: string[] }
export interface Assessment { sourceId: string; criterionId: string; sentiment: Sentiment }
export interface SummaryContent { overview: string; themes: Finding[]; positiveHighlights: Finding[]; improvements: Finding[]; suggestedActions: Finding[]; assessments: Assessment[] }
export const FINDING_FIELDS = ['themes', 'positiveHighlights', 'improvements', 'suggestedActions'] as const;
export function invalidOutput(reason = 'schema') { return new ApiError(502, 'SUMMARY_INVALID_' + reason.replace(/[^a-z0-9]/gi, '_').toUpperCase(), 'Gemma nije vratila ispravan sažetak sa proverljivim izvorima. Pokušajte ponovo.'); }

export function buildSnapshot(store: Store, target: Survey): SummaryInput {
  const surveys = [target, ...[...store.surveysById.values()].filter(s => s.ownerId === target.ownerId && s.id !== target.id)];
  const sources: EvidenceSource[] = [];
  for (const survey of surveys) {
    (store.submissionsBySurveyId.get(survey.id) ?? []).forEach((submission, index) => survey.questions.forEach((q, questionIndex) => {
      const raw = submission.answers.find(a => a.questionId === q.id)!.value;
      const value = q.type === 'text' ? raw : Array.isArray(raw) ? q.options.filter(o => raw.includes(o.id)).map(o => o.label) : q.options.find(o => o.id === raw)?.label ?? '';
      sources.push({ sourceId: `S${sources.length + 1}`, surveyId: survey.id, surveyTitle: survey.title, submissionId: submission.id, questionId: q.id, responseNumber: index + 1, questionNumber: questionIndex + 1, question: q.label, value: Array.isArray(value) ? [...value] : value });
    }));
  }
  return { surveyId: target.id, title: target.title, description: target.description, surveys: surveys.map(s => ({ id: s.id, title: s.title, responseCount: store.submissionsBySurveyId.get(s.id)?.length ?? 0 })), sources };
}
export function validateContent(body: any, input: SummaryInput): SummaryContent {
  const sources = new Map(input.sources.map(s => [s.sourceId, s]));
  const nonempty = (source: EvidenceSource) => Array.isArray(source.value) ? source.value.length > 0 : !!source.value.trim();
  if (!body || typeof body.overview !== 'string' || !body.overview.trim() || body.overview.length > 1500) throw invalidOutput('overview');
  for (const field of FINDING_FIELDS) {
    if (!Array.isArray(body[field]) || body[field].length > 12) throw invalidOutput('list:' + field);
    for (const finding of body[field]) {
      if (!finding || typeof finding.text !== 'string') throw invalidOutput('finding-text-type:' + field + ':' + typeof finding?.text);
      if (!finding.text.trim() || finding.text.length > 500) throw invalidOutput('finding-text-length:' + field);
      if (!Array.isArray(finding.sourceIds) || !finding.sourceIds.length) throw invalidOutput('finding-references:' + field);
      for (const id of finding.sourceIds) { const source = sources.get(id); if (!source || source.surveyId !== input.surveyId || !nonempty(source)) throw invalidOutput(!source ? 'unknown-source:' + field : source.surveyId !== input.surveyId ? 'other-event-source:' + field : 'empty-source:' + field); }
    }
  }
  if (!Array.isArray(body.assessments)) throw invalidOutput('assessments');
  const seen = new Set<string>();
  for (const a of body.assessments) {
    const source = sources.get(a?.sourceId);
    const key = `${a?.sourceId}:${a?.criterionId}`;
    if (!source || !nonempty(source) || !CRITERIA.some(c => c.id === a.criterionId) || !['positive', 'neutral', 'negative'].includes(a.sentiment) || seen.has(key)) throw invalidOutput(!source ? 'assessment-source' : !nonempty(source) ? 'assessment-empty' : seen.has(key) ? 'assessment-duplicate' : 'assessment-value');
    seen.add(key);
  }
  // Whitelist fields: extra model output can never override snapshot metadata.
  return { overview: body.overview, themes: body.themes.map(cleanFinding), positiveHighlights: body.positiveHighlights.map(cleanFinding), improvements: body.improvements.map(cleanFinding), suggestedActions: body.suggestedActions.map(cleanFinding), assessments: body.assessments.map((a: Assessment) => ({ sourceId: a.sourceId, criterionId: a.criterionId, sentiment: a.sentiment })) };
}
function cleanFinding(f: Finding): Finding { return { text: f.text, sourceIds: [...new Set(f.sourceIds)] }; }
export function questionAnalytics(store: Store, survey: Survey) {
  const responses = store.submissionsBySurveyId.get(survey.id) ?? [];
  return survey.questions.map(q => {
    const values = responses.map(s => s.answers.find(a => a.questionId === q.id)!.value);
    const answeredCount = values.filter(v => Array.isArray(v) ? v.length > 0 : !!v.trim()).length;
    const options = q.type === 'text' ? [] : q.options.map(o => {
      const count = values.filter(v => Array.isArray(v) ? v.includes(o.id) : v === o.id).length;
      return { label: o.label, count, percent: responses.length ? Math.round(count / responses.length * 1000) / 10 : 0 };
    });
    return { questionId: q.id, label: q.label, type: q.type, responseCount: responses.length, answeredCount, unansweredCount: responses.length - answeredCount, completionPercent: responses.length ? Math.round(answeredCount / responses.length * 1000) / 10 : 0, options };
  });
}
export function analyzeComparison(input: SummaryInput, assessments: Assessment[]) {
  const sourceMap = new Map(input.sources.map(s => [s.sourceId, s]));
  function score(criterionId: string, eventIds: Set<string>) {
    const respondents = new Map<string, number[]>();
    for (const a of assessments) {
      const source = sourceMap.get(a.sourceId)!;
      if (a.criterionId !== criterionId || !eventIds.has(source.surveyId)) continue;
      const key = `${source.surveyId}:${source.submissionId}`;
      const values = respondents.get(key) ?? [];
      values.push(a.sentiment === 'positive' ? 100 : a.sentiment === 'negative' ? 0 : 50); respondents.set(key, values);
    }
    const means = [...respondents.values()].map(v => v.reduce((a, b) => a + b, 0) / v.length);
    return { score: means.length ? Math.round(means.reduce((a, b) => a + b, 0) / means.length) : null, responseCount: means.length };
  }
  const others = input.surveys.filter(s => s.id !== input.surveyId);
  const criteria = CRITERIA.map(c => {
    const target = score(c.id, new Set([input.surveyId])); const baseline = score(c.id, new Set(others.map(s => s.id)));
    return { ...c, target, others: baseline, difference: target.score !== null && baseline.score !== null ? target.score - baseline.score : null };
  });
  return { method: 'AI procena iz citiranih odgovora: pozitivno=100, neutralno/mešovito=50, negativno=0. Prvo prosek po predaji i kriterijumu, zatim prosek predaja. Ostali događaji su objedinjeni po predajama; bez pomena kriterijuma nema ocene. Nije procenat zadovoljnih učesnika.', criteria,
    events: others.map(s => ({ ...s, criteria: CRITERIA.map(c => ({ id: c.id, ...score(c.id, new Set([s.id])) })) })) };
}
