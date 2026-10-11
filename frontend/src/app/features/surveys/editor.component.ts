import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { failure, type Failure, type Question, type Survey } from '../../core/models';
import { FeedbackComponent } from '../../shared/feedback.component';
@Component({ selector: 'app-editor', imports: [ReactiveFormsModule, RouterLink, FeedbackComponent], template: `
 <div class="narrow"><a routerLink="/surveys">← My surveys</a><div class="heading" style="margin-top:24px"><div><div class="eyebrow">Survey builder</div><h1>{{id ? 'Edit draft' : 'New survey'}}</h1><p class="muted">Good questions make room for honest feedback.</p></div></div>
 <app-feedback [error]="error()" [message]="message()"/>
 @if(loading()) {<p role="status">Loading draft…</p>} @else if(loadFailed()) {<button (click)="load()">Try again</button>} @else {
 <form [formGroup]="form" (ngSubmit)="save(false)"><fieldset [disabled]="busy()" style="border:0;padding:0;margin:0;min-width:0"><section class="card">
 <div class="field"><label for="title">Survey title <span class="required">*</span></label><input id="title" formControlName="title" maxlength="120" placeholder="e.g. Hackathon feedback" [attr.aria-invalid]="invalid('title')">@if(invalid('title')) {<p class="field-error">{{field('title', 'Enter a title (1–120 characters).')}}</p>}</div>
 <div class="field"><label for="description">Description <span class="muted">(optional)</span></label><textarea id="description" formControlName="description" maxlength="1000" placeholder="Tell attendees why you are collecting feedback."></textarea></div></section>
 <section class="card"><h2>Questions</h2><p class="muted">Add 1–30 questions. This order is used in the public form.</p>
 <div formArrayName="questions">@for(q of questions.controls; track q; let i = $index) {<section class="question" [formGroupName]="i"><div class="question-head"><h2>{{i+1}}. {{q.get('type')?.value === 'text' ? 'Text question' : q.get('type')?.value === 'checkbox' ? 'Checkbox question' : 'Multiple choice question'}}</h2><button class="danger" type="button" (click)="removeQuestion(i)" [attr.aria-label]="'Remove question ' + (i+1)">Remove</button></div>
 <div class="field"><label [for]="'question-' + i">Question text <span class="required">*</span></label><input [id]="'question-' + i" formControlName="label" maxlength="300" [attr.aria-invalid]="invalid('questions.' + i + '.label')">@if(invalid('questions.' + i + '.label')) {<p class="field-error">{{field('questions.' + i + '.label', 'Enter question text (1–300 characters).')}}</p>}</div>
 <label class="check"><input type="checkbox" formControlName="required">Required question</label>
 @if(q.get('type')?.value === 'checkbox' || q.get('type')?.value === 'multiple_choice') {<div formArrayName="options"><p class="muted">{{q.get('type')?.value === 'checkbox' ? 'Multiple options can be selected.' : 'One option can be selected.'}} Add 2–15 distinct options.</p>@for(o of options(i).controls; track o; let j = $index) {<div [formGroupName]="j"><label [for]="'option-' + i + '-' + j">Option {{j+1}}</label><div class="option-row"><input [id]="'option-' + i + '-' + j" formControlName="label" maxlength="150" [attr.aria-invalid]="invalid('questions.' + i + '.options.' + j + '.label')"><button type="button" class="danger" (click)="removeOption(i,j)" [attr.aria-label]="'Remove option ' + (j+1) + ' of question ' + (i+1)">×</button></div>@if(invalid('questions.' + i + '.options.' + j + '.label')) {<p class="field-error">{{field('questions.' + i + '.options.' + j + '.label', 'Enter an option label (1–150 characters).')}}</p>}</div>}<button type="button" class="secondary" (click)="addOption(i)" [disabled]="options(i).length >= 15">+ Add option</button></div>}
 </section>}</div>
 <div class="actions"><button type="button" class="secondary" (click)="addQuestion('text')" [disabled]="questions.length >= 30">+ Text question</button><button type="button" class="secondary" (click)="addQuestion('checkbox')" [disabled]="questions.length >= 30">+ Checkbox question</button><button type="button" class="secondary" (click)="addQuestion('multiple_choice')" [disabled]="questions.length >= 30">+ Multiple choice question</button></div></section>
 <div class="notice">Generating a link publishes the survey. Questions and options are then locked.</div>
 <div class="actions"><button type="submit" [disabled]="busy()">{{busy() ? 'Saving…' : 'Save draft'}}</button><button type="button" class="secondary" (click)="save(true)" [disabled]="busy()">Generate link</button><a routerLink="/surveys">Back</a></div></fieldset></form> }</div>` })
export class EditorComponent {
  private fb = inject(FormBuilder); private api = inject(Api); private router = inject(Router); private route = inject(ActivatedRoute);
  id = this.route.snapshot.paramMap.get('id'); error = signal<Failure | null>(null); message = signal(''); busy = signal(false); loading = signal(false); loadFailed = signal(false); attempted = false;
  private trimmed = (min: number, max: number) => (c: AbstractControl) => typeof c.value === 'string' && c.value.trim().length >= min && c.value.trim().length <= max ? null : { length: true };
  form = this.fb.group({ title: ['', [this.trimmed(1,120)]], description: ['', Validators.maxLength(1000)], questions: this.fb.array<FormGroup>([]) });
  get questions() { return this.form.controls.questions; }
  options(i: number) { return this.questions.at(i).get('options') as FormArray<FormGroup>; }
  constructor() { if(this.id) void this.load(); else this.addQuestion('text'); }
  makeOption(option?: {id: string; label: string}) { return this.fb.group({ id: [option?.id ?? crypto.randomUUID()], label: [option?.label ?? '', this.trimmed(1,150)] }); }
  addQuestion(type: 'text' | 'checkbox' | 'multiple_choice', q?: Question) {
    if(this.questions.length >= 30) return;
    this.questions.push(this.fb.group({ id: [q?.id ?? crypto.randomUUID()], type: [type], label: [q?.label ?? '', this.trimmed(1,300)], required: [q?.required ?? false], options: this.fb.array(type !== 'text' ? (q && q.type !== 'text' ? q.options : [{ id: crypto.randomUUID(), label: '' }, { id: crypto.randomUUID(), label: '' }]).map(o => this.makeOption(o)) : []) }));
  }
  removeQuestion(i: number) { this.questions.removeAt(i); }
  addOption(i: number) { if(this.options(i).length < 15) this.options(i).push(this.makeOption()); }
  removeOption(i: number, j: number) { this.options(i).removeAt(j); }
  invalid(path: string) { const c = this.form.get(path); return !!this.error()?.fields[path] || !!(c?.invalid && (c.touched || this.attempted)); }
  field(path: string, fallback: string) { return this.error()?.fields[path] ?? fallback; }
  async load() {
    this.loading.set(true); this.error.set(null); this.loadFailed.set(false);
    try { const {survey} = await this.api.get<{survey: Survey}>(`/surveys/${this.id}`); if(survey.status === 'published') { await this.router.navigate(['/surveys', this.id]); return; } this.form.patchValue({ title: survey.title, description: survey.description }); this.questions.clear(); survey.questions.forEach(q => this.addQuestion(q.type,q)); }
    catch(e) { this.error.set(failure(e)); this.loadFailed.set(true); } finally { this.loading.set(false); }
  }
  async save(publish: boolean) {
    if(this.busy()) return; this.attempted = true; this.error.set(null); this.message.set(''); this.form.markAllAsTouched();
    if(!this.questions.length) { this.error.set({ message: 'Add at least one question.', fields: {} }); return; }
    const fields: Record<string,string> = {};
    this.questions.controls.forEach((q,i) => { if(q.get('type')!.value === 'text') return; const opts = this.options(i).getRawValue(); if(opts.length < 2) fields[`questions.${i}.options`] = 'Add at least two options.'; const labels = opts.map(o => o.label.trim().toLowerCase()); if(new Set(labels).size !== labels.length) fields[`questions.${i}.options`] = 'Options must have distinct labels.'; });
    if(Object.keys(fields).length) this.error.set({ message: 'Check the question options.', fields });
    if(this.form.invalid || Object.keys(fields).length) return;
    this.busy.set(true);
    try {
      const raw = this.form.getRawValue(); const body = { title: raw.title, description: raw.description, questions: raw.questions.map((q: any) => q.type === 'text' ? { id: q.id, type: q.type, label: q.label, required: q.required } : q) };
      const { survey } = this.id ? await this.api.patch<{survey: Survey}>(`/surveys/${this.id}`,body) : await this.api.post<{survey: Survey}>('/surveys',body);
      this.id = survey.id;
      // Replace the new-editor URL as soon as save succeeds, even if publish fails.
      if(this.route.snapshot.routeConfig?.path === 'surveys/new') window.history.replaceState(window.history.state, '', `/surveys/${survey.id}/edit`);
      if(publish) { await this.api.post(`/surveys/${this.id}/publish`); await this.router.navigate(['/surveys',this.id]); }
      else { this.form.markAsPristine(); this.message.set('Draft saved. You can keep editing or generate a link.'); }
    } catch(e) { this.error.set(failure(e)); } finally { this.busy.set(false); }
  }
}
