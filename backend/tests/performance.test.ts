import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { register, surveyBody } from './helpers.js';
it('demo obim: 10 anketa × 200 predaja, lista i detalji <2 sekunde', async()=>{
  const app=createApp();const token=await register(app);let lastId='';
  for(let i=0;i<10;i++) {const body=surveyBody();const created=await request(app).post('/api/surveys').auth(token,{type:'bearer'}).send(body);lastId=created.body.survey.id;const published=await request(app).post(`/api/surveys/${lastId}/publish`).auth(token,{type:'bearer'});const publicToken=published.body.survey.shareUrl.split('/').at(-1);
    for(let j=0;j<200;j++) {const result=await request(app).post(`/api/public/surveys/${publicToken}/responses`).send({clientRequestId:randomUUID(),respondentEmail:'demo@example.com',answers:body.questions.map(q=>({questionId:q.id,value:q.type==='text'?'Tekst odgovora':q.type==='multiple_choice'?q.options[0].id:q.options.map(o=>o.id)}))});expect(result.status).toBe(201);}
  }
  const start=performance.now();const list=await request(app).get('/api/surveys').auth(token,{type:'bearer'});const details=await request(app).get(`/api/surveys/${lastId}`).auth(token,{type:'bearer'});const responses=await request(app).get(`/api/surveys/${lastId}/responses`).auth(token,{type:'bearer'});const ms=performance.now()-start;
  expect(list.body.items).toHaveLength(10);expect(details.body.survey.responseCount).toBe(200);expect(responses.body.items).toHaveLength(200);expect(ms).toBeLessThan(2000);console.log(`Demo API list + detail + responses: ${ms.toFixed(1)} ms (10 × 200).`);
},30000);
