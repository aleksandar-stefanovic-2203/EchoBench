import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { failure, type Failure, type SurveyListItem } from '../../core/models';
import { FeedbackComponent } from '../../shared/feedback.component';
@Component({ selector: 'app-survey-list', imports: [RouterLink, DatePipe, FeedbackComponent], template: `
  <div class="heading"><div><div class="eyebrow">Vaš prostor za feedback</div><h1>Moje ankete</h1><p class="muted">Slušajte učesnike. Napravite sledeći događaj još boljim.</p></div><a class="button" routerLink="/surveys/new">+ Nova anketa</a></div>
  <app-feedback [error]="error()"/>
  @if(loading()) {<p role="status">Učitavanje anketa…</p>} @else if(error()) {<button class="secondary" (click)="load()">Pokušaj ponovo</button>} @else if(!items().length) {<section class="card empty"><h2>Prva anketa počinje ovde.</h2><p class="muted">Još nemate ankete. Dodajte pitanja i podelite link sa učesnicima.</p><a class="button" routerLink="/surveys/new">Napravi prvu anketu</a></section>}
  <div class="survey-grid">@for(s of items(); track s.id) {<article class="card"><div><span class="badge">{{s.status === 'draft' ? 'Nacrt' : 'Objavljena'}}</span></div><h2>{{s.title}}</h2><p class="muted">{{s.responseCount}} odgovora · {{s.createdAt | date:'dd.MM.yyyy.'}}</p><div class="actions"><a class="button secondary" [routerLink]="['/surveys', s.id]">Pogledaj anketu</a>@if(s.status === 'draft') {<a [routerLink]="['/surveys', s.id, 'edit']">Izmeni</a>}</div></article>}</div>` })
export class ListComponent {
  private api = inject(Api); items = signal<SurveyListItem[]>([]); loading = signal(true); error = signal<Failure | null>(null);
  constructor() { void this.load(); }
  async load() { this.loading.set(true); this.error.set(null); try { this.items.set((await this.api.get<{items: SurveyListItem[]}>('/surveys')).items); } catch(e) { this.error.set(failure(e)); } finally { this.loading.set(false); } }
}
