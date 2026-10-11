import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { Finding, SurveySummary } from '../../core/models';

@Component({ selector: 'app-summary-panel', imports: [DatePipe, RouterLink], template: `
 <section class="card" aria-labelledby="summary-title">
  <div class="eyebrow">Pregled događaja</div><h2 id="summary-title">AI sažetak</h2>
  <p class="muted">Obrađeno predaja: {{result().responseCount}} · {{result().generatedAt | date:'dd.MM.yyyy. HH:mm'}} · {{result().model}}</p>
  @if(currentResponseCount() > result().responseCount) {<p class="notice" role="status">Stigli su novi odgovori. Kliknite „Sumiraj” za ažuriran sažetak.</p>}
  <p class="answer">{{result().overview}}</p>
  <p class="muted">Kliknite na nalaz da otvorite odgovore na kojima se zasniva.</p>
  @for(group of groups; track group.key) {
   <h3>{{group.label}}</h3>
   @for(finding of result()[group.key]; track $index) {
    <details class="finding"><summary>{{finding.text}} <span class="badge">{{evidence(finding).length}} izvora</span></summary>
     <div class="evidence-list">@for(source of evidence(finding); track source.sourceId) {
      <article class="evidence"><p class="muted">{{source.surveyTitle}} · Predaja {{source.responseNumber}} · Pitanje {{source.questionNumber}}</p><strong>{{source.question}}</strong><blockquote class="answer">{{value(source.value)}}</blockquote></article>
     }</div>
    </details>
   } @empty {<p class="muted">Nema izdvojenih nalaza.</p>}
  }
  <p class="muted">Reference potvrđuju poreklo odgovora. Proverite i da li njihov sadržaj podržava AI zaključak.</p>
 </section>
 <section class="card" aria-labelledby="comparison-title"><div class="eyebrow">Šest kriterijuma</div><h2 id="comparison-title">Poređenje sa ostalim događajima</h2>
  <p class="muted">Samo vaši događaji · {{result().comparison.events.length}} drugih događaja · AI ocena od 0 do 100</p><p class="muted">Poređenje koristi podatke u trenutku sumiranja. Za nove predaje u bilo kom događaju ponovo kliknite „Sumiraj”.</p>
  @if(!result().comparison.events.length) {<p class="notice">Još nema drugih događaja za poređenje. Ocene izabrane ankete ostaju dostupne.</p>}
  <div class="table-scroll"><table><caption class="visually-hidden">AI ocene događaja po kriterijumima</caption><thead><tr><th>Kriterijum</th><th>Ovaj događaj</th><th>Ostali zajedno</th><th>Razlika</th></tr></thead><tbody>
  @for(c of result().comparison.criteria; track c.id) {<tr><th scope="row">{{c.label}}<small>{{c.description}}</small></th><td>{{score(c.target.score)}}<small>{{c.target.responseCount}} predaja sa pomenom</small></td><td>{{score(c.others.score)}}<small>{{c.others.responseCount}} predaja sa pomenom</small></td><td [class.better]="(c.difference ?? 0) > 0" [class.worse]="(c.difference ?? 0) < 0">{{difference(c.difference)}}</td></tr>}
  </tbody></table></div>
  <p class="muted">{{result().comparison.method}}</p>
  @if(result().comparison.events.length) {<details class="comparison-details"><summary>Ocene pojedinačnih događaja</summary><div class="table-scroll"><table><thead><tr><th>Događaj</th>@for(c of result().comparison.criteria; track c.id) {<th>{{c.label}}</th>}</tr></thead><tbody>@for(event of result().comparison.events; track event.id) {<tr><th scope="row"><a [routerLink]="['/surveys',event.id]">{{event.title}}</a><small>{{event.responseCount}} predaja</small></th>@for(c of event.criteria; track c.id) {<td>{{score(c.score)}}<small>{{c.responseCount}} predaja sa pomenom</small></td>}</tr>}</tbody></table></div></details>}
 </section>
 <section class="card" aria-labelledby="analytics-title"><div class="eyebrow">Izračunato iz forme</div><h2 id="analytics-title">Analitika odgovora</h2><p class="muted">Procenti koriste svih {{result().responseCount}} predaja ove ankete kao osnovu. Za checkbox zbir može biti veći od 100% jer je moguć višestruki izbor.</p>
  @for(q of result().analytics; track q.questionId) {
   <div class="question-chart"><h3>{{q.label}}</h3><p class="muted">Popunjeno {{q.answeredCount}}/{{q.responseCount}} ({{q.completionPercent}}%) · Bez odgovora {{q.unansweredCount}}</p>
    @for(option of q.options; track $index) {<div class="chart-row"><div class="chart-label"><span>{{option.label}}</span><strong>{{option.count}} / {{q.responseCount}} · {{option.percent}}%</strong></div><div class="bar-track" role="progressbar" [attr.aria-label]="q.label + ': ' + option.label" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="option.percent"><div class="bar-fill" [style.width.%]="option.percent"></div></div></div>}
    @if(q.type === 'text') {<p class="muted">Za slobodni tekst prikazujemo popunjenost; AI nalazi iznad izdvajaju značenje odgovora.</p>}
   </div>
  }
 </section>
 `, styles: [`
  h3 {margin-top:24px;margin-bottom:12px} .finding {border:1px solid #dce5da;border-radius:10px;padding:12px 16px} .finding summary {font-weight:500;overflow-wrap:anywhere} .evidence-list {padding-top:12px} .evidence {border-left:3px solid #8da997;padding:4px 16px;margin:14px 0;background:#f5f7f2} .evidence p {font-size:.85rem} blockquote {margin:12px 0;line-height:1.6} .table-scroll {overflow-x:auto;margin:20px 0} table {width:100%;border-collapse:collapse;min-width:560px;text-align:left} th,td {padding:14px 12px;border-bottom:1px solid #dce5da;vertical-align:top} thead th {background:#f5f7f2} th {font-weight:600} td {white-space:nowrap} small {display:block;font-weight:400;margin-top:6px;font-size:.78rem;max-width:280px;white-space:normal} .better {color:#21644e} .worse {color:#a43535} .question-chart {padding:8px 0 20px;border-bottom:1px solid #dce5da} .chart-row {margin:16px 0} .chart-label {display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-bottom:8px} .bar-track {height:14px;background:#edf2e9;border-radius:7px;overflow:hidden} .bar-fill {height:100%;background:#398164;border-radius:7px} .visually-hidden {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
 `] })
export class SummaryPanelComponent {
  result = input.required<SurveySummary>(); currentResponseCount = input.required<number>();
  readonly groups = [{key:'themes',label:'Glavne teme'}, {key:'positiveHighlights',label:'Dobre stvari'}, {key:'improvements',label:'Loše stvari i poboljšanja'}, {key:'suggestedActions',label:'Predloženi koraci'}] as const;
  evidence(finding: Finding) { const ids = new Set(finding.sourceIds); return this.result().sources.filter(s => ids.has(s.sourceId)); }
  value(value: string | string[]) { return Array.isArray(value) ? value.join(', ') : value; }
  score(value: number | null) { return value === null ? 'Nema podataka' : value + ' / 100'; }
  difference(value: number | null) { return value === null ? '—' : (value > 0 ? '+' : '') + value + ' poena'; }
}
