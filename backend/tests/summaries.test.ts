import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store/index.js';
import { register, surveyBody } from './helpers.js';
import { GemmaProvider, type SummaryInput } from '../src/summaries/index.js';
import { ApiError } from '../src/middleware/errors.js';

const result = { overview: 'Mentori su pohvaljeni.', themes: [{text: 'Mentorstvo', sourceIds: ['S1']}], positiveHighlights: [{text: 'Dostupni mentori', sourceIds: ['S1']}], improvements: [], suggestedActions: [{text: 'Zadržati mentorstvo', sourceIds: ['S1']}], assessments: [] };
async function setup() {
  const summarize = vi.fn(async (_input: SummaryInput) => result);
  const app = createApp(createStore(), 'http://localhost:4200', { model: 'gemma-test', summarize });
  const token = await register(app); const body = surveyBody();
  const created = await request(app).post('/api/surveys').auth(token, { type: 'bearer' }).send(body);
  const id = created.body.survey.id;
  const published = await request(app).post(`/api/surveys/${id}/publish`).auth(token, { type: 'bearer' });
  const publicToken = published.body.survey.shareUrl.split('/').at(-1);
  const submit = () => request(app).post(`/api/public/surveys/${publicToken}/responses`).send({ clientRequestId: randomUUID(), respondentEmail: 'private@example.com', answers: body.questions.map(q => ({ questionId: q.id, value: q.type === 'text' ? 'Dobar feedback' : q.type === 'multiple_choice' ? q.options[0].id : q.options.map(o => o.id) })) });
  return { app, token, id, body, summarize, submit };
}
describe('summary ownership and snapshot', () => {
  it('includes other owned events in the AI snapshot and never other owners', async () => {
    const f = await setup(); await f.submit();
    const owned = await request(f.app).post('/api/surveys').auth(f.token, {type:'bearer'}).send({...surveyBody(),title:'Moj drugi seminar'});
    const otherToken = await register(f.app,'foreign');
    await request(f.app).post('/api/surveys').auth(otherToken,{type:'bearer'}).send({...surveyBody(),title:'Privatni seminar drugog vlasnika'});
    const response = await request(f.app).post(`/api/surveys/${f.id}/summary`).auth(f.token,{type:'bearer'});
    expect(response.status).toBe(200);
    const snapshot = f.summarize.mock.calls[0][0];
    expect(snapshot.surveys.map(s=>s.id)).toEqual([f.id,owned.body.survey.id]);
    expect(JSON.stringify(snapshot)).not.toContain('Privatni seminar');
    expect(response.body.summary.comparison.events[0].responseCount).toBe(0);
    expect(response.body.summary.comparison.criteria.every((c:any)=>c.others.score===null)).toBe(true);
  });
  it('requires authentication, hides other owners and rejects empty surveys', async () => {
    const f = await setup(); const path = `/api/surveys/${f.id}/summary`;
    expect((await request(f.app).post(path)).status).toBe(401);
    const other = await register(f.app, 'b');
    expect((await request(f.app).post(path).auth(other, { type: 'bearer' })).status).toBe(404);
    expect((await request(f.app).post(path).auth(f.token, { type: 'bearer' })).status).toBe(409);
    expect(f.summarize).not.toHaveBeenCalled();
  });
  it('summarizes every submission, resolves checkbox labels and excludes private metadata', async () => {
    const f = await setup(); await f.submit(); await f.submit(); await f.submit();
    const r = await request(f.app).post(`/api/surveys/${f.id}/summary`).auth(f.token, { type: 'bearer' });
    expect(r.status).toBe(200); expect(r.body.summary).toMatchObject({ overview: result.overview, themes: result.themes, surveyId: f.id, responseCount: 3, model: 'gemma-test' });
    const input = f.summarize.mock.calls[0][0];
    expect(input.surveys[0].responseCount).toBe(3); expect(input.sources).toHaveLength(3 * f.body.questions.length);
    expect(JSON.stringify(input)).toContain('Mentori');
    for (const forbidden of ['private@example.com', 'respondentEmail', 'clientRequestId', 'password', 'sessionToken', 'ownerId']) expect(JSON.stringify(input)).not.toContain(forbidden);
    expect((await request(f.app).post(`/api/surveys/${f.id}/summary`).auth(f.token, { type: 'bearer' }).send({ responses: [] })).status).toBe(422);
  });
  it('keeps the original snapshot while new submissions arrive and blocks duplicate jobs', async () => {
    const f = await setup(); await f.submit();
    let finish!: (value: typeof result) => void; let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    f.summarize.mockImplementationOnce(async () => { started(); return new Promise(resolve => { finish = resolve; }); });
    const path = `/api/surveys/${f.id}/summary`;
    const job = request(f.app).post(path).auth(f.token, { type: 'bearer' }).then(r => r);
    await entered; await f.submit();
    expect((await request(f.app).post(path).auth(f.token, { type: 'bearer' })).status).toBe(409);
    finish(result);
    expect((await job).body.summary.responseCount).toBe(1);
    expect(f.summarize.mock.calls[0][0].surveys[0].responseCount).toBe(1);
    f.summarize.mockRejectedValueOnce(new ApiError(503, 'SUMMARY_UNAVAILABLE', 'Gemma API nije dostupan.'));
    expect((await request(f.app).post(path).auth(f.token, { type: 'bearer' })).status).toBe(503);
    expect((await request(f.app).post(path).auth(f.token, { type: 'bearer' })).body.summary.responseCount).toBe(2);
  });
  it('returns safe provider errors through the API', async () => {
    const f = await setup(); await f.submit();
    for (const status of [502, 503, 504]) {
      f.summarize.mockRejectedValueOnce(new ApiError(status, 'SUMMARY_FAILED', 'Pokušajte ponovo.'));
      const r = await request(f.app).post(`/api/surveys/${f.id}/summary`).auth(f.token, { type: 'bearer' });
      expect(r.status).toBe(status); expect(r.body.summary).toBeUndefined(); expect(r.body.error.message).toBe('Pokušajte ponovo.');
    }
  });
});
describe('Gemma REST provider', () => {
  const input: SummaryInput = { surveyId: 'event', title: 'Demo', description: '', surveys: [{id: 'event', title: 'Demo', responseCount: 1}], sources: [{sourceId: 'S1', surveyId: 'event', surveyTitle: 'Demo', submissionId: 'r1', questionId: 'q1', responseNumber: 1, questionNumber: 1, question: 'Utisak?', value: 'Odlično'}] };
  const reply = (text = JSON.stringify(result)) => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }), { status: 200 });
  it('uses the configured Gemma model and keeps key out of URL', async () => {
    const fetcher = vi.fn(async () => reply('```json\n' + JSON.stringify(result) + '\n```'));
    const provider = new GemmaProvider({ apiKey: 'secret', model: 'gemma-4-26b-a4b-it', fetcher });
    expect(await provider.summarize(input)).toEqual(result);
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('gemma-4-26b-a4b-it:generateContent'); expect(url).not.toContain('secret');
    expect(options.headers).toMatchObject({ 'x-goog-api-key': 'secret' });
  });
  it('includes all large-input fragments and merges batch summaries', async () => {
    const prompts: string[] = [];
    const fetcher = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => { prompts.push(JSON.parse(options!.body as string).contents[0].parts[0].text); return reply(JSON.stringify({...result, themes: [], positiveHighlights: [], suggestedActions: []})); });
    const provider = new GemmaProvider({ apiKey: 'secret', fetcher });
    const sources = Array.from({ length: 50 }, (_, i) => ({...input.sources[0], sourceId: `S${i+1}`, submissionId: `r${i+1}`, value: `MARKER-${i}-` + 'a'.repeat(1990)}));
    await provider.summarize({ ...input, sources });
    expect(prompts.length).toBeGreaterThan(2);
    for (let i = 0; i < 50; i++) expect(prompts.join('\n')).toContain(`MARKER-${i}-`);
  });
  it('preserves every cited answer and assessment when merging batches', async () => {
    const sources=Array.from({length:30},(_,i)=>({...input.sources[0],sourceId:`S${i+1}`,submissionId:`r${i+1}`,value:'Hladna sala. '+ 'a'.repeat(1980)}));
    const provider=new GemmaProvider({apiKey:'secret',fetcher:async(_url,options)=>{
      const prompt=JSON.parse(options!.body as string).contents[0].parts[0].text;
      const data=JSON.parse(prompt.split('\nPODACI:\n')[1]);
      const ids:string[]=data.answers ? data.answers.map((a:any)=>a.sourceId) : data.partialSummaries.flatMap((p:any)=>p.improvements.flatMap((f:any)=>f.sourceIds));
      return reply(JSON.stringify({overview:'Hladna sala.',themes:[],positiveHighlights:[],improvements:[{text:'Temperatura je niska',sourceIds:ids}],suggestedActions:[],assessments:data.answers ? ids.map(sourceId=>({sourceId,criterionId:'venue',sentiment:'negative'})) : []}));
    }});
    const summarized=await provider.summarize({...input,sources});
    expect(summarized.improvements[0].sourceIds).toHaveLength(30);expect(summarized.assessments).toHaveLength(30);
  });
  it('evaluates every event separately and retains only target findings with all event assessments', async () => {
    const calls:string[]=[];
    const extended:SummaryInput={...input,surveys:[...input.surveys,{id:'other',title:'Other seminar',responseCount:1}],sources:[...input.sources,{...input.sources[0],sourceId:'S2',surveyId:'other',submissionId:'r2',value:'Prijatna sala'}]};
    const provider=new GemmaProvider({apiKey:'secret',fetcher:async(_url,options)=>{
      const prompt=JSON.parse(options!.body as string).contents[0].parts[0].text;
      const data=JSON.parse(prompt.split('\nPODACI:\n')[1]);calls.push(data.title);
      const sourceId=data.answers[0].sourceId;
      return reply(JSON.stringify({overview:'Pregled',themes:[{text:'Uslovi',sourceIds:[sourceId]}],positiveHighlights:[],improvements:[],suggestedActions:[],assessments:[{sourceId,criterionId:'venue',sentiment:'positive'}]}));
    }});
    const content=await provider.summarize(extended);
    expect(calls).toEqual(['Demo','Other seminar']);expect(content.themes[0].sourceIds).toEqual(['S1']);expect(content.assessments.map(a=>a.sourceId)).toEqual(['S1','S2']);
  });
  it('reports missing configuration, upstream failure, invalid output and timeout safely', async () => {
    await expect(new GemmaProvider({ apiKey: '' }).summarize(input)).rejects.toMatchObject({ status: 503 });
    await expect(new GemmaProvider({ apiKey: 'secret', model: 'gemini-other' }).summarize(input)).rejects.toMatchObject({ status: 503 });
    for (const status of [403, 429, 500]) {
      await expect(new GemmaProvider({ apiKey: 'secret', fetcher: async () => new Response('secret', { status }) }).summarize(input)).rejects.toMatchObject({ status: 503 });
    }
    await expect(new GemmaProvider({ apiKey: 'secret', fetcher: async () => reply('invalid') }).summarize(input)).rejects.toMatchObject({ status: 502 });
    await expect(new GemmaProvider({ apiKey: 'secret', fetcher: async () => reply(JSON.stringify({ ...result, themes: [42] })) }).summarize(input)).rejects.toMatchObject({ status: 502 });
    await expect(new GemmaProvider({ apiKey: 'secret', fetcher: async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: JSON.stringify(result) }] } }] })) }).summarize(input)).rejects.toMatchObject({ status: 502 });
    await expect(new GemmaProvider({ apiKey: 'secret', timeoutMs: 5, fetcher: async (_url, options) => new Promise((_resolve, reject) => options!.signal!.addEventListener('abort', () => reject(new Error('aborted')))) }).summarize(input)).rejects.toMatchObject({ status: 504 });
  });
});
