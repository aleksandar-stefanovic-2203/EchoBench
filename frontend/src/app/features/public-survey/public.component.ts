import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Api } from '../../core/api';
import { failure, type Failure, type PublicSurvey, type Question } from '../../core/models';
import { FeedbackComponent } from '../../shared/feedback.component';
@Component({ selector: 'app-public-survey', imports: [ReactiveFormsModule, FeedbackComponent], template: `
 <div class="narrow">@if(loading()) {<p role="status">Učitavanje ankete…</p>} @else if(done()) {<section class="card empty"><div class="success-mark" aria-hidden="true">✓</div><div class="eyebrow">Feedback je predat</div><h1>Hvala na utiscima!</h1><p class="muted">Vaš odgovor pomaže da sledeći događaj bude bolji.</p><button class="secondary" (click)="again()">Popuni ponovo</button></section>} @else if(survey(); as s) {
 <div class="eyebrow">Vaš glas je važan</div><h1>{{s.title}}</h1>@if(s.description) {<p class="muted answer">{{s.description}}</p>}
 <div class="notice">Popunjavanje bez prijave; mejl se prikuplja, ali se ne prikazuje organizatoru.</div>
 <app-feedback [error]="error()"/>
 <form [formGroup]="form" (ngSubmit)="submit()"><fieldset [disabled]="busy()" style="border:0;padding:0;margin:0;min-width:0"><section class="card"><div class="field"><label for="respondentEmail">Vaš mejl <span class="required">*</span></label><input id="respondentEmail" type="email" formControlName="respondentEmail" autocomplete="email" maxlength="254" [attr.aria-invalid]="invalidEmail()" aria-describedby="email-note"><small id="email-note">Mejl se čuva odvojeno od odgovora. Adresa se ne verifikuje.</small>@if(invalidEmail()) {<p class="field-error">{{error()?.fields?.['respondentEmail'] ?? 'Unesite ispravnu mejl adresu.'}}</p>}</div></section>
 <div formGroupName="answers">@for(q of s.questions; track q.id; let i = $index) {<section class="card">
 @if(q.type === 'text') {<label [for]="q.id">{{i+1}}. {{q.label}} @if(q.required) {<span class="required">*</span>} @else {<span class="muted">(opciono)</span>}</label><textarea [id]="q.id" [formControlName]="q.id" maxlength="2000" [attr.aria-required]="q.required" [attr.aria-invalid]="invalid(q.id)" [attr.aria-describedby]="invalid(q.id) ? 'error-' + q.id : null"></textarea>}
 @else if(q.type === 'checkbox') {<fieldset style="border:0;padding:0;margin:0;min-width:0"><legend style="font-weight:600">{{i+1}}. {{q.label}} @if(q.required) {<span class="required">*</span>} @else {<span class="muted">(opciono)</span>}</legend><small>Možete izabrati više opcija.</small>@for(o of q.options; track o.id) {<label class="check"><input type="checkbox" [checked]="selected(q.id,o.id)" (change)="toggle(q.id,o.id,$event)" [attr.aria-describedby]="invalid(q.id) ? 'error-' + q.id : null">{{o.label}}</label>}</fieldset>}
 @else {<fieldset style="border:0;padding:0;margin:0;min-width:0"><legend style="font-weight:600">{{i+1}}. {{q.label}} @if(q.required) {<span class="required">*</span>} @else {<span class="muted">(opciono)</span>}</legend><small>Izaberite jednu opciju.</small>@for(o of q.options; track o.id) {<label class="check"><input type="radio" [name]="q.id" [value]="o.id" [formControlName]="q.id" [attr.aria-describedby]="invalid(q.id) ? 'error-' + q.id : null">{{o.label}}</label>}</fieldset>}
 @if(invalid(q.id)) {<p class="field-error" [id]="'error-' + q.id">{{error()?.fields?.['answers.' + q.id] ?? (q.type === 'text' ? 'Unesite odgovor (najviše 2.000 znakova).' : q.type === 'multiple_choice' ? 'Izaberite jednu opciju.' : 'Izaberite najmanje jednu opciju.')}}</p>}
 </section>}</div><p class="muted">* Obavezna polja</p><button type="submit" [disabled]="busy()">{{busy() ? 'Slanje…' : 'Pošalji feedback'}}</button></fieldset></form>
 } @else {<section class="card"><h1>Anketa nije dostupna</h1><app-feedback [error]="error()"/><p class="muted">Proverite link sa organizatorom. Podaci ovog prototipa nestaju pri restartu servera.</p><button class="secondary" (click)="load()">Pokušaj ponovo</button></section>}</div>` })
export class PublicComponent {
  private api = inject(Api); private fb = inject(FormBuilder); private token = inject(ActivatedRoute).snapshot.paramMap.get('publicToken');
  survey = signal<PublicSurvey | null>(null); loading = signal(true); busy = signal(false); done = signal(false); error = signal<Failure | null>(null); attempted = false;
  form = this.fb.nonNullable.group({ respondentEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]], answers: this.fb.group<Record<string,FormControl>>({}) });
  private pending: { clientRequestId: string; respondentEmail: string; answers: {questionId: string; value: string | string[]}[] } | null = null;
  private pendingContent = '';
  constructor() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set(null);
    try { const {survey} = await this.api.get<{survey:PublicSurvey}>(`/public/surveys/${this.token}`); this.survey.set(survey);
      for(const q of survey.questions) { if(!this.form.controls.answers.contains(q.id)) this.form.controls.answers.addControl(q.id, new FormControl(q.type === 'text' || q.type === 'multiple_choice' ? '' : [], { nonNullable: true, validators: q.type === 'text' ? [Validators.maxLength(2000), ...(q.required ? [(c: AbstractControl) => typeof c.value === 'string' && c.value.trim() ? null : { required: true }] : [])] : q.required ? [Validators.required] : [] })); }
    } catch(e) { this.error.set(failure(e)); } finally { this.loading.set(false); }
  }
  selected(qid:string, oid:string) { return (this.form.controls.answers.get(qid)!.value as string[]).includes(oid); }
  toggle(qid:string,oid:string,event:Event) { const c = this.form.controls.answers.get(qid)!; const checked = (event.target as HTMLInputElement).checked; c.setValue(checked ? [...c.value,oid] : c.value.filter((id:string) => id !== oid)); c.markAsTouched(); }
  invalidEmail() { const c=this.form.controls.respondentEmail; return !!this.error()?.fields['respondentEmail'] || (c.invalid && (c.touched || this.attempted)); }
  invalid(id:string) { const c=this.form.controls.answers.get(id)!; return !!this.error()?.fields[`answers.${id}`] || (c.invalid && (c.touched || this.attempted)); }
  async submit() {
    if(this.busy()) return; this.attempted=true; this.error.set(null); this.form.markAllAsTouched(); if(this.form.invalid) return;
    const raw=this.form.getRawValue(); const data={ respondentEmail:raw.respondentEmail, answers:this.survey()!.questions.map(q => ({ questionId:q.id, value:raw.answers[q.id] as string | string[] })) };
    const content=JSON.stringify(data); if(!this.pending || content !== this.pendingContent) { this.pending={ ...data, clientRequestId:crypto.randomUUID() }; this.pendingContent=content; }
    this.busy.set(true);
    try { await this.api.post(`/public/surveys/${this.token}/responses`,this.pending); this.done.set(true); }
    catch(e) { this.error.set(failure(e)); } finally { this.busy.set(false); }
  }
  again() { this.pending=null; this.pendingContent=''; this.done.set(false); this.attempted=false; this.error.set(null); this.form.controls.respondentEmail.reset(''); this.survey()!.questions.forEach((q: Question) => this.form.controls.answers.get(q.id)!.reset(q.type === 'text' || q.type === 'multiple_choice' ? '' : [])); }
}
