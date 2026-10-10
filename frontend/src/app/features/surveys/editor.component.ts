import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { failure, type Failure, type Question, type Survey } from '../../core/models';
import { FeedbackComponent } from '../../shared/feedback.component';
@Component({ selector: 'app-editor', imports: [ReactiveFormsModule, RouterLink, FeedbackComponent], template: `
 <div class="narrow"><a routerLink="/surveys">← Moje ankete</a><div class="heading" style="margin-top:24px"><div><div class="eyebrow">Kreiranje ankete</div><h1>{{id ? 'Izmeni nacrt' : 'Nova anketa'}}</h1><p class="muted">Dobra pitanja otvaraju prostor za iskrene utiske.</p></div></div>
 <app-feedback [error]="error()" [message]="message()"/>
 @if(loading()) {<p role="status">Učitavanje nacrta…</p>} @else if(loadFailed()) {<button (click)="load()">Pokušaj ponovo</button>} @else {
 <form [formGroup]="form" (ngSubmit)="save(false)"><fieldset [disabled]="busy()" style="border:0;padding:0;margin:0;min-width:0"><section class="card">
 <div class="field"><label for="title">Naslov ankete <span class="required">*</span></label><input id="title" formControlName="title" maxlength="120" placeholder="Npr. Feedback posle hakatona" [attr.aria-invalid]="invalid('title')">@if(invalid('title')) {<p class="field-error">{{field('title', 'Unesite naslov (1–120 znakova).')}}</p>}</div>
 <div class="field"><label for="description">Opis <span class="muted">(opciono)</span></label><textarea id="description" formControlName="description" maxlength="1000" placeholder="Recite učesnicima zašto prikupljate utiske."></textarea></div></section>
 <section class="card"><h2>Pitanja</h2><p class="muted">Dodajte 1–30 pitanja. Redosled ovde je redosled u javnoj formi.</p>
 <div formArrayName="questions">@for(q of questions.controls; track q; let i = $index) {<section class="question" [formGroupName]="i"><div class="question-head"><h2>{{i+1}}. {{q.get('type')?.value === 'text' ? 'Tekstualno pitanje' : 'Checkbox pitanje'}}</h2><button class="danger" type="button" (click)="removeQuestion(i)" [attr.aria-label]="'Ukloni pitanje ' + (i+1)">Ukloni</button></div>
 <div class="field"><label [for]="'question-' + i">Tekst pitanja <span class="required">*</span></label><input [id]="'question-' + i" formControlName="label" maxlength="300" [attr.aria-invalid]="invalid('questions.' + i + '.label')">@if(invalid('questions.' + i + '.label')) {<p class="field-error">{{field('questions.' + i + '.label', 'Unesite tekst pitanja (1–300 znakova).')}}</p>}</div>
 <label class="check"><input type="checkbox" formControlName="required">Obavezno pitanje</label>
 @if(q.get('type')?.value === 'checkbox') {<div formArrayName="options"><p class="muted">Moguće je izabrati više opcija. Dodajte 2–15 različitih opcija.</p>@for(o of options(i).controls; track o; let j = $index) {<div [formGroupName]="j"><label [for]="'option-' + i + '-' + j">Opcija {{j+1}}</label><div class="option-row"><input [id]="'option-' + i + '-' + j" formControlName="label" maxlength="150" [attr.aria-invalid]="invalid('questions.' + i + '.options.' + j + '.label')"><button type="button" class="danger" (click)="removeOption(i,j)" [attr.aria-label]="'Ukloni opciju ' + (j+1) + ' pitanja ' + (i+1)">×</button></div>@if(invalid('questions.' + i + '.options.' + j + '.label')) {<p class="field-error">{{field('questions.' + i + '.options.' + j + '.label', 'Unesite naziv opcije (1–150 znakova).')}}</p>}</div>}<button type="button" class="secondary" (click)="addOption(i)" [disabled]="options(i).length >= 15">+ Dodaj opciju</button></div>}
 </section>}</div>
 <div class="actions"><button type="button" class="secondary" (click)="addQuestion('text')" [disabled]="questions.length >= 30">+ Tekstualno pitanje</button><button type="button" class="secondary" (click)="addQuestion('checkbox')" [disabled]="questions.length >= 30">+ Checkbox pitanje</button></div></section>
 <div class="notice">Generisanjem linka objavljujete anketu. Pitanja i opcije se nakon toga zaključavaju.</div>
 <div class="actions"><button type="submit" [disabled]="busy()">{{busy() ? 'Čuvanje…' : 'Sačuvaj nacrt'}}</button><button type="button" class="secondary" (click)="save(true)" [disabled]="busy()">Generiši link</button><a routerLink="/surveys">Nazad</a></div></fieldset></form> }</div>` })
export class EditorComponent {
  private fb = inject(FormBuilder); private api = inject(Api); private router = inject(Router); private route = inject(ActivatedRoute);
  id = this.route.snapshot.paramMap.get('id'); error = signal<Failure | null>(null); message = signal(''); busy = signal(false); loading = signal(false); loadFailed = signal(false); attempted = false;
  private trimmed = (min: number, max: number) => (c: AbstractControl) => typeof c.value === 'string' && c.value.trim().length >= min && c.value.trim().length <= max ? null : { length: true };
  form = this.fb.group({ title: ['', [this.trimmed(1,120)]], description: ['', Validators.maxLength(1000)], questions: this.fb.array<FormGroup>([]) });
  get questions() { return this.form.controls.questions; }
  options(i: number) { return this.questions.at(i).get('options') as FormArray<FormGroup>; }
  constructor() { if(this.id) void this.load(); else this.addQuestion('text'); }
  makeOption(option?: {id: string; label: string}) { return this.fb.group({ id: [option?.id ?? crypto.randomUUID()], label: [option?.label ?? '', this.trimmed(1,150)] }); }
  addQuestion(type: 'text' | 'checkbox', q?: Question) {
    if(this.questions.length >= 30) return;
    this.questions.push(this.fb.group({ id: [q?.id ?? crypto.randomUUID()], type: [type], label: [q?.label ?? '', this.trimmed(1,300)], required: [q?.required ?? false], options: this.fb.array(type === 'checkbox' ? (q?.options ?? [{ id: crypto.randomUUID(), label: '' }, { id: crypto.randomUUID(), label: '' }]).map(o => this.makeOption(o)) : []) }));
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
    if(!this.questions.length) { this.error.set({ message: 'Dodajte najmanje jedno pitanje.', fields: {} }); return; }
    const fields: Record<string,string> = {};
    this.questions.controls.forEach((q,i) => { if(q.get('type')!.value !== 'checkbox') return; const opts = this.options(i).getRawValue(); if(opts.length < 2) fields[`questions.${i}.options`] = 'Dodajte najmanje dve opcije.'; const labels = opts.map(o => o.label.trim().toLowerCase()); if(new Set(labels).size !== labels.length) fields[`questions.${i}.options`] = 'Opcije moraju imati različite nazive.'; });
    if(Object.keys(fields).length) this.error.set({ message: 'Proverite opcije pitanja.', fields });
    if(this.form.invalid || Object.keys(fields).length) return;
    this.busy.set(true);
    try {
      const raw = this.form.getRawValue(); const body = { title: raw.title, description: raw.description, questions: raw.questions.map((q: any) => q.type === 'text' ? { id: q.id, type: q.type, label: q.label, required: q.required } : q) };
      const { survey } = this.id ? await this.api.patch<{survey: Survey}>(`/surveys/${this.id}`,body) : await this.api.post<{survey: Survey}>('/surveys',body);
      this.id = survey.id;
      // Replace the new-editor URL as soon as save succeeds, even if publish fails.
      if(this.route.snapshot.routeConfig?.path === 'surveys/new') window.history.replaceState(window.history.state, '', `/surveys/${survey.id}/edit`);
      if(publish) { await this.api.post(`/surveys/${this.id}/publish`); await this.router.navigate(['/surveys',this.id]); }
      else { this.form.markAsPristine(); this.message.set('Nacrt je sačuvan. Možete nastaviti sa izmenama ili generisati link.'); }
    } catch(e) { this.error.set(failure(e)); } finally { this.busy.set(false); }
  }
}
