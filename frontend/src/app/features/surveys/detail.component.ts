import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { failure, type Failure, type Question, type Submission, type Survey, type SurveySummary } from '../../core/models';
import { FeedbackComponent } from '../../shared/feedback.component';
import { SummaryPanelComponent } from './summary-panel.component';
@Component({ selector: 'app-detail', imports: [RouterLink,DatePipe,FeedbackComponent,SummaryPanelComponent], template: `
 <a routerLink="/surveys">← Moje ankete</a><app-feedback [error]="error()" [message]="message()"/>
 @if(loading()) {<p role="status">Učitavanje ankete i odgovora…</p>}
 @if(survey(); as s) {<div class="heading" style="margin-top:24px"><div><div class="eyebrow">{{s.status === 'draft' ? 'Nacrt ankete' : 'Objavljena anketa'}}</div><h1>{{s.title}}</h1><p class="muted answer">{{s.description}}</p></div><button class="secondary" (click)="load()" [disabled]="loading() || busy()">Osveži odgovore</button></div>
 <section class="card"><h2>{{s.status === 'draft' ? 'Spremna za deljenje?' : 'Link za učesnike'}}</h2>@if(s.shareUrl) {<p class="muted">Podelite link sa učesnicima. Za popunjavanje im nije potreban nalog.</p><label for="shareUrl">Javni link</label><input id="shareUrl" class="share-link" readonly [value]="s.shareUrl" (click)="selectLink($event)"><div class="actions"><button (click)="copy(s.shareUrl)">Kopiraj link</button><a [href]="s.shareUrl" target="_blank" rel="noopener">Otvori javnu formu ↗</a></div>}
 @else {<p class="muted">Proverite pitanja pre objavljivanja. Nakon generisanja linka više ih ne možete menjati.</p><div class="actions"><a class="button secondary" [routerLink]="['/surveys',s.id,'edit']">Izmeni nacrt</a><button (click)="publish()" [disabled]="busy()">{{busy() ? 'Objavljivanje…' : 'Generiši link'}}</button></div>}</section>
 <section class="card"><h2>Pitanja · {{s.questions.length}}</h2>@for(q of s.questions; track q.id; let i=$index) {<p><strong>{{i+1}}. {{q.label}}</strong><small class="question-status">{{q.required ? 'Obavezno' : 'Opciono'}}</small></p> @if(q.type !== 'text') {<p class="muted">{{optionLabels(q)}}</p>}}</section>
 <div class="heading"><div><h2>Odgovori · {{s.responseCount}}</h2><p class="muted">Mejlovi učesnika nisu prikazani. Najnoviji odgovori su prvi.</p></div><div><button class="secondary" (click)="summarize()" [disabled]="!items().length || summarizing() || loading()">{{summarizing() ? 'Sažimanje…' : 'Sumiraj'}}</button>@if(!items().length) {<p class="muted">Sažimanje zahteva najmanje jedan odgovor.</p>}</div></div>
 @if(summarizing()) {<p role="status">Gemma analizira ovu anketu i poredi je sa ostalim vašim događajima. Veći skup može potrajati.</p>}
 <app-feedback [error]="summaryError()"/>
 @if(summary(); as result) {
 <app-summary-panel [result]="result" [currentResponseCount]="s.responseCount"/>
 }
 @if(!items().length && !loading()) {<section class="card empty"><h2>Još nema odgovora.</h2><p class="muted">{{s.status === 'draft' ? 'Generišite link da počnete prikupljanje feedbacka.' : 'Podelite link, pa osvežite prikaz kada stignu prvi utisci.'}}</p></section>}
 @for(r of items(); track r.id; let i=$index) {<details class="card"><summary>Odgovor {{items().length-i}} <span class="muted">{{r.submittedAt | date:'dd.MM.yyyy. HH:mm'}}</span></summary>@for(q of s.questions; track q.id) {<div style="margin-top:24px"><strong>{{q.label}}</strong><p class="answer">{{answer(r,q)}}</p></div>}</details>}
 } @else if(!loading()) {<button class="secondary" (click)="load()">Pokušaj ponovo</button>}` })
export class DetailComponent {
  summary=signal<SurveySummary|null>(null); summarizing=signal(false); summaryError=signal<Failure|null>(null);
  private api=inject(Api); private route=inject(ActivatedRoute); private id:string|null=null; survey=signal<Survey|null>(null); items=signal<Submission[]>([]); loading=signal(true); busy=signal(false); error=signal<Failure|null>(null); message=signal('');
  constructor() { this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>{this.id=params.get('id');this.survey.set(null);this.items.set([]);this.summary.set(null);this.summaryError.set(null);this.summarizing.set(false);this.message.set('');void this.load();}); }
  async load() { const id=this.id; this.loading.set(true); this.error.set(null); try { const [s,r]=await Promise.all([this.api.get<{survey:Survey}>(`/surveys/${id}`),this.api.get<{items:Submission[];total:number}>(`/surveys/${id}/responses`)]); if(id===this.id) {this.survey.set({...s.survey,responseCount:r.total});this.items.set(r.items);} } catch(e) {if(id===this.id) this.error.set(failure(e));} finally {if(id===this.id) this.loading.set(false);} }
  async publish() { if(this.busy()) return; this.busy.set(true); this.error.set(null); try {this.survey.set((await this.api.post<{survey:Survey}>(`/surveys/${this.id}/publish`)).survey);} catch(e) {this.error.set(failure(e));} finally {this.busy.set(false);} }
  selectLink(event:Event) {(event.target as HTMLInputElement).select();}
  async copy(url:string) { try {await navigator.clipboard.writeText(url); this.message.set('Link je kopiran.');} catch {this.message.set('Automatsko kopiranje nije dostupno. Označite javni link i kopirajte ga ručno.');} }
  optionLabels(q:Question) { return q.type !== 'text' ? q.options.map(o=>o.label).join(' · ') : ''; }
  answer(r:Submission,q:Question) { const value=r.answers.find(a=>a.questionId===q.id)?.value; return q.type !== 'text' && (Array.isArray(value) || typeof value === 'string') ? (Array.isArray(value) ? q.options.filter(o=>value.includes(o.id)) : q.options.filter(o=>o.id === value)).map(o=>o.label).join(', ') || 'Bez odgovora' : value || 'Bez odgovora'; }
  async summarize() {
    if(!this.items().length || this.summarizing() || this.loading()) return;
    const id=this.id;
    this.summarizing.set(true); this.summaryError.set(null); this.message.set('');
    try {const result=(await this.api.post<{summary:SurveySummary}>(`/surveys/${id}/summary`)).summary;if(id===this.id) this.summary.set(result);}
    catch(e) {if(id===this.id) this.summaryError.set(failure(e));}
    finally {if(id===this.id) this.summarizing.set(false);}
  }
}
