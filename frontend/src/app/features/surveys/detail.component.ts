import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { failure, type Failure, type Question, type Submission, type Survey, type SurveySummary } from '../../core/models';
import { FeedbackComponent } from '../../shared/feedback.component';
import { SummaryPanelComponent } from './summary-panel.component';
@Component({ selector: 'app-detail', imports: [RouterLink,DatePipe,FeedbackComponent,SummaryPanelComponent], template: `
 <a routerLink="/surveys">← My surveys</a><app-feedback [error]="error()" [message]="message()"/>
 @if(loading()) {<p role="status">Loading survey and responses…</p>}
 @if(survey(); as s) {<div class="heading" style="margin-top:24px"><div><div class="eyebrow">{{s.status === 'draft' ? 'Survey draft' : 'Published survey'}}</div><h1>{{s.title}}</h1><p class="muted answer">{{s.description}}</p></div><button class="secondary" (click)="load()" [disabled]="loading() || busy()">Refresh responses</button></div>
 <section class="card"><h2>{{s.status === 'draft' ? 'Ready to share?' : 'Attendee link'}}</h2>@if(s.shareUrl) {<p class="muted">Share the link with attendees. They do not need an account to respond.</p><label for="shareUrl">Public link</label><input id="shareUrl" class="share-link" readonly [value]="s.shareUrl" (click)="selectLink($event)"><div class="actions"><button (click)="copy(s.shareUrl)">Copy link</button><a [href]="s.shareUrl" target="_blank" rel="noopener">Open public form ↗</a></div>}
 @else {<p class="muted">Review your questions before publishing. You cannot edit them after generating the link.</p><div class="actions"><a class="button secondary" [routerLink]="['/surveys',s.id,'edit']">Edit draft</a><button (click)="publish()" [disabled]="busy()">{{busy() ? 'Publishing…' : 'Generate link'}}</button></div>}</section>
 <section class="card"><h2>Questions · {{s.questions.length}}</h2>@for(q of s.questions; track q.id; let i=$index) {<p><strong>{{i+1}}. {{q.label}}</strong><small class="question-status">{{q.required ? 'Required' : 'Optional'}}</small></p> @if(q.type !== 'text') {<p class="muted">{{optionLabels(q)}}</p>}}</section>
 <div class="heading"><div><h2>Responses · {{s.responseCount}}</h2><p class="muted">Attendee emails are hidden. The newest responses appear first.</p></div><div><button class="secondary" (click)="summarize()" [disabled]="!items().length || summarizing() || loading()">{{summarizing() ? 'Summarizing…' : 'Summarize'}}</button>@if(!items().length) {<p class="muted">Summarizing requires at least one response.</p>}</div></div>
 @if(summarizing()) {<p role="status">Gemma is analyzing this survey and comparing it with your other events. Larger datasets may take a while.</p>}
 <app-feedback [error]="summaryError()"/>
 @if(summary(); as result) {
 <app-summary-panel [result]="result" [currentResponseCount]="s.responseCount"/>
 }
 @if(!items().length && !loading()) {<section class="card empty"><h2>No responses yet.</h2><p class="muted">{{s.status === 'draft' ? 'Generate a link to start collecting feedback.' : 'Share the link, then refresh when the first responses arrive.'}}</p></section>}
 @for(r of items(); track r.id; let i=$index) {<details class="card"><summary>Response {{items().length-i}} <span class="muted">{{r.submittedAt | date:'MMM d, yyyy, HH:mm'}}</span></summary>@for(q of s.questions; track q.id) {<div style="margin-top:24px"><strong>{{q.label}}</strong><p class="answer">{{answer(r,q)}}</p></div>}</details>}
 } @else if(!loading()) {<button class="secondary" (click)="load()">Try again</button>}` })
export class DetailComponent {
  summary=signal<SurveySummary|null>(null); summarizing=signal(false); summaryError=signal<Failure|null>(null);
  private api=inject(Api); private route=inject(ActivatedRoute); private id:string|null=null; survey=signal<Survey|null>(null); items=signal<Submission[]>([]); loading=signal(true); busy=signal(false); error=signal<Failure|null>(null); message=signal('');
  constructor() { this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>{this.id=params.get('id');this.survey.set(null);this.items.set([]);this.summary.set(null);this.summaryError.set(null);this.summarizing.set(false);this.message.set('');void this.load();}); }
  async load() { const id=this.id; this.loading.set(true); this.error.set(null); try { const [s,r]=await Promise.all([this.api.get<{survey:Survey}>(`/surveys/${id}`),this.api.get<{items:Submission[];total:number}>(`/surveys/${id}/responses`)]); if(id===this.id) {this.survey.set({...s.survey,responseCount:r.total});this.items.set(r.items);} } catch(e) {if(id===this.id) this.error.set(failure(e));} finally {if(id===this.id) this.loading.set(false);} }
  async publish() { if(this.busy()) return; this.busy.set(true); this.error.set(null); try {this.survey.set((await this.api.post<{survey:Survey}>(`/surveys/${this.id}/publish`)).survey);} catch(e) {this.error.set(failure(e));} finally {this.busy.set(false);} }
  selectLink(event:Event) {(event.target as HTMLInputElement).select();}
  async copy(url:string) { try {await navigator.clipboard.writeText(url); this.message.set('Link copied.');} catch {this.message.set('Automatic copying is unavailable. Select the public link and copy it manually.');} }
  optionLabels(q:Question) { return q.type !== 'text' ? q.options.map(o=>o.label).join(' · ') : ''; }
  answer(r:Submission,q:Question) { const value=r.answers.find(a=>a.questionId===q.id)?.value; return q.type !== 'text' && (Array.isArray(value) || typeof value === 'string') ? (Array.isArray(value) ? q.options.filter(o=>value.includes(o.id)) : q.options.filter(o=>o.id === value)).map(o=>o.label).join(', ') || 'Unanswered' : value || 'Unanswered'; }
  async summarize() {
    if(!this.items().length || this.summarizing() || this.loading()) return;
    const id=this.id;
    this.summarizing.set(true); this.summaryError.set(null); this.message.set('');
    try {const result=(await this.api.post<{summary:SurveySummary}>(`/surveys/${id}/summary`)).summary;if(id===this.id) this.summary.set(result);}
    catch(e) {if(id===this.id) this.summaryError.set(failure(e));}
    finally {if(id===this.id) this.summarizing.set(false);}
  }
}
