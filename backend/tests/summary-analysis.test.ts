import { describe, it, expect } from 'vitest';
import { createStore } from '../src/store/index.js';
import { randomUUID } from 'node:crypto';
import { buildSnapshot, analyzeComparison, questionAnalytics, validateContent } from '../src/summaries/analysis.js';
import type { Survey } from '../src/types/index.js';

function fixture() {
  const store = createStore();
  function event(title: string, ownerId = 'owner', count = 2) {
    const survey: Survey = { id: randomUUID(), ownerId, title, description: '', status: 'published', publicToken: 'token', createdAt: '', updatedAt: '', publishedAt: '', questions: [
      { id: randomUUID(), type: 'text', label: 'Utisak', required: true },
      { id: randomUUID(), type: 'checkbox', label: 'Problemi', required: false, options: [{ id: 'cold', label: 'Hladno' }, { id: 'sound', label: 'Zvuk' }] },
      { id: randomUUID(), type: 'multiple_choice', label: 'Ocena', required: false, options: [{ id: 'good', label: 'Dobro' }, { id: 'bad', label: 'Loše' }] },
    ] };
    store.surveysById.set(survey.id, survey);
    store.submissionsBySurveyId.set(survey.id, Array.from({ length: count }, (_, i) => ({ id: randomUUID(), surveyId: survey.id, clientRequestId: randomUUID(), submittedAt: '', answers: [
      { questionId: survey.questions[0].id, value: 'Sala je hladna.' },
      { questionId: survey.questions[1].id, value: i === 0 ? ['cold', 'sound'] : [] },
      { questionId: survey.questions[2].id, value: i === 0 ? 'good' : '' },
    ] })));
    return survey;
  }
  const target = event('Seminar A'); const other = event('Seminar B'); event('Tuđi seminar', 'other'); event('Bez odgovora', 'owner', 0);
  return { store, target, other, snapshot: buildSnapshot(store, target) };
}
describe('comparison, exact analytics and evidence', () => {
  it('snapshots all and only owned events with stable submission/question references', () => {
    const f = fixture(); expect(f.snapshot.surveys).toHaveLength(3);
    expect(f.snapshot.sources).toHaveLength(12);
    expect(f.snapshot.sources[0]).toMatchObject({ surveyId: f.target.id, responseNumber: 1, questionNumber: 1, value: 'Sala je hladna.' });
    expect(f.snapshot.sources[1].value).toEqual(['Hladno', 'Zvuk']);
    expect(JSON.stringify(f.snapshot)).not.toContain('Tuđi seminar');
  });
  it('counts real selections with all submissions as denominator and tracks blanks', () => {
    const f = fixture(); const stats = questionAnalytics(f.store, f.target);
    expect(stats[1]).toMatchObject({ responseCount: 2, answeredCount: 1, unansweredCount: 1, options: [{ label: 'Hladno', count: 1, percent: 50 }, { label: 'Zvuk', count: 1, percent: 50 }] });
    expect(stats[2].options[0]).toMatchObject({ count: 1, percent: 50 });
  });
  it('computes respondent-weighted criterion scores, excludes target from benchmark and leaves missing criteria null', () => {
    const f = fixture(); const sources = f.snapshot.sources.filter(s => s.questionNumber === 1);
    const scores = analyzeComparison(f.snapshot, sources.map(s => ({ sourceId: s.sourceId, criterionId: 'venue', sentiment: s.surveyId === f.target.id ? 'negative' : 'positive' })));
    const venue = scores.criteria.find(c => c.id === 'venue')!;
    expect(venue).toMatchObject({ target: { score: 0, responseCount: 2 }, others: { score: 100, responseCount: 2 }, difference: -100 });
    expect(scores.criteria.find(c => c.id === 'content')!.target.score).toBeNull();
    expect(scores.events).toHaveLength(2);
  });
  it('rejects invented references and references to other events in target findings', () => {
    const f = fixture(); const base = { overview: 'Hladna sala', themes: [], positiveHighlights: [], suggestedActions: [], assessments: [] };
    const valid = { ...base, improvements: [{ text: 'Temperatura je niska', sourceIds: [f.snapshot.sources[0].sourceId] }] };
    expect(validateContent(valid, f.snapshot)).toEqual(valid);
    expect(() => validateContent({ ...valid, improvements: [{ text: 'Temperatura je niska', sourceIds: ['S9999'] }] }, f.snapshot)).toThrow();
    const other = f.snapshot.sources.find(s => s.surveyId === f.other.id)!;
    expect(() => validateContent({ ...valid, improvements: [{ text: 'Temperatura je niska', sourceIds: [other.sourceId] }] }, f.snapshot)).toThrow();
  });
  it('weights other events by relevant submissions and normalizes repeated references', () => {
    const f=fixture();const extraId=f.snapshot.surveys[2].id;
    const extra=Array.from({length:3},(_,i)=>({...f.snapshot.sources[0],sourceId:`S${13+i}`,surveyId:extraId,submissionId:`extra${i}`}));
    const input={...f.snapshot,sources:[...f.snapshot.sources,...extra]};
    const assessments=input.sources.filter(s=>s.questionNumber===1).map(s=>({sourceId:s.sourceId,criterionId:'venue',sentiment:s.surveyId===f.other.id ? 'positive' as const : 'negative' as const}));
    const venue=analyzeComparison(input,assessments).criteria.find(c=>c.id==='venue')!;
    expect(venue.others).toEqual({score:40,responseCount:5});
    const content=validateContent({overview:'Hladno',themes:[],positiveHighlights:[],improvements:[{text:'Niska temperatura',sourceIds:['S1','S1']}],suggestedActions:[],assessments:[]},input);
    expect(content.improvements[0].sourceIds).toEqual(['S1']);
  });
});
