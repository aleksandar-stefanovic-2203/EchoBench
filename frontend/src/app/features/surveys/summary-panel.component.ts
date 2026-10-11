import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { Finding, SurveySummary } from '../../core/models';

@Component({ selector: 'app-summary-panel', imports: [DatePipe, RouterLink], template: `
 <section class="card" aria-labelledby="summary-title">
  <div class="eyebrow">Event overview</div><h2 id="summary-title">AI summary</h2>
  <p class="muted">Responses analyzed: {{result().responseCount}} · {{result().generatedAt | date:'MMM d, yyyy, HH:mm'}} · {{result().model}}</p>
  @if(currentResponseCount() > result().responseCount) {<p class="notice" role="status">New responses have arrived. Click “Summarize” for an updated summary.</p>}
  <p class="answer">{{result().overview}}</p>
  <p class="muted">Click a finding to view the responses it is based on.</p>
  @for(group of groups; track group.key) {
   <h3>{{group.label}}</h3>
   @for(finding of result()[group.key]; track $index) {
    <details class="finding"><summary>{{finding.text}} <span class="badge">{{evidence(finding).length}} sources</span></summary>
     <div class="evidence-list">@for(source of evidence(finding); track source.sourceId) {
      <article class="evidence"><p class="muted">{{source.surveyTitle}} · Response {{source.responseNumber}} · Question {{source.questionNumber}}</p><strong>{{source.question}}</strong><blockquote class="answer">{{value(source.value)}}</blockquote></article>
     }</div>
    </details>
   } @empty {<p class="muted">No findings available.</p>}
  }
  <p class="muted">References identify the source responses. Check whether their content supports the AI conclusion.</p>
 </section>
 <section class="card" aria-labelledby="comparison-title"><div class="eyebrow">Six criteria</div><h2 id="comparison-title">Comparison with other events</h2>
  <p class="muted">Your events only · {{result().comparison.events.length}} other events · AI score from 0 to 100</p><p class="muted">The comparison uses data available when the summary was generated. Click “Summarize” again after new responses arrive for any event.</p>
  @if(!result().comparison.events.length) {<p class="notice">No other events are available for comparison yet. Scores for the selected survey are still available.</p>}
  <div class="table-scroll"><table><caption class="visually-hidden">AI event scores by criterion</caption><thead><tr><th>Criterion</th><th>This event</th><th>Other events combined</th><th>Difference</th></tr></thead><tbody>
  @for(c of result().comparison.criteria; track c.id) {<tr><th scope="row">{{c.label}}<small>{{c.description}}</small></th><td>{{score(c.target.score)}}<small>{{c.target.responseCount}} responses mentioning this criterion</small></td><td>{{score(c.others.score)}}<small>{{c.others.responseCount}} responses mentioning this criterion</small></td><td [class.better]="(c.difference ?? 0) > 0" [class.worse]="(c.difference ?? 0) < 0">{{difference(c.difference)}}</td></tr>}
  </tbody></table></div>
  <p class="muted">{{result().comparison.method}}</p>
  @if(result().comparison.events.length) {<details class="comparison-details"><summary>Individual event scores</summary><div class="table-scroll"><table><thead><tr><th>Event</th>@for(c of result().comparison.criteria; track c.id) {<th>{{c.label}}</th>}</tr></thead><tbody>@for(event of result().comparison.events; track event.id) {<tr><th scope="row"><a [routerLink]="['/surveys',event.id]">{{event.title}}</a><small>{{event.responseCount}} responses</small></th>@for(c of event.criteria; track c.id) {<td>{{score(c.score)}}<small>{{c.responseCount}} responses mentioning this criterion</small></td>}</tr>}</tbody></table></div></details>}
 </section>
 <section class="card" aria-labelledby="analytics-title"><div class="eyebrow">Calculated from responses</div><h2 id="analytics-title">Response analytics</h2><p class="muted">Percentages use all {{result().responseCount}} responses to this survey as the denominator. Checkbox totals can exceed 100% because multiple selections are allowed.</p>
  @for(q of result().analytics; track q.questionId) {
   <div class="question-chart"><h3>{{q.label}}</h3><p class="muted">Answered {{q.answeredCount}}/{{q.responseCount}} ({{q.completionPercent}}%) · Unanswered {{q.unansweredCount}}</p>
    @for(option of q.options; track $index) {<div class="chart-row"><div class="chart-label"><span>{{option.label}}</span><strong>{{option.count}} / {{q.responseCount}} · {{option.percent}}%</strong></div><div class="bar-track" role="progressbar" [attr.aria-label]="q.label + ': ' + option.label" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="option.percent"><div class="bar-fill" [style.width.%]="option.percent"></div></div></div>}
    @if(q.type === 'text') {<p class="muted">For text questions, we show completion rates. The AI findings above interpret the responses.</p>}
   </div>
  }
 </section>
 `, styles: [`
  h3 {margin-top:24px;margin-bottom:12px} .finding {border:1px solid #dce5da;border-radius:10px;padding:12px 16px} .finding summary {font-weight:500;overflow-wrap:anywhere} .evidence-list {padding-top:12px} .evidence {border-left:3px solid #8da997;padding:4px 16px;margin:14px 0;background:#f5f7f2} .evidence p {font-size:.85rem} blockquote {margin:12px 0;line-height:1.6} .table-scroll {overflow-x:auto;margin:20px 0} table {width:100%;border-collapse:collapse;min-width:560px;text-align:left} th,td {padding:14px 12px;border-bottom:1px solid #dce5da;vertical-align:top} thead th {background:#f5f7f2} th {font-weight:600} td {white-space:nowrap} small {display:block;font-weight:400;margin-top:6px;font-size:.78rem;max-width:280px;white-space:normal} .better {color:#21644e} .worse {color:#a43535} .question-chart {padding:8px 0 20px;border-bottom:1px solid #dce5da} .chart-row {margin:16px 0} .chart-label {display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-bottom:8px} .bar-track {height:14px;background:#edf2e9;border-radius:7px;overflow:hidden} .bar-fill {height:100%;background:#398164;border-radius:7px} .visually-hidden {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
 `] })
export class SummaryPanelComponent {
  result = input.required<SurveySummary>(); currentResponseCount = input.required<number>();
  readonly groups = [{key:'themes',label:'Main themes'}, {key:'positiveHighlights',label:'Positive highlights'}, {key:'improvements',label:'Issues and improvements'}, {key:'suggestedActions',label:'Suggested actions'}] as const;
  evidence(finding: Finding) { const ids = new Set(finding.sourceIds); return this.result().sources.filter(s => ids.has(s.sourceId)); }
  value(value: string | string[]) { return Array.isArray(value) ? value.join(', ') : value; }
  score(value: number | null) { return value === null ? 'No data' : value + ' / 100'; }
  difference(value: number | null) { return value === null ? '—' : (value > 0 ? '+' : '') + value + ' points'; }
}
