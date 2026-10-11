import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { failure, type Failure } from '../../core/models';
import { FeedbackComponent } from '../../shared/feedback.component';
@Component({ selector: 'app-auth', imports: [ReactiveFormsModule, RouterLink, FeedbackComponent], template: `
  <div class="auth-layout"><section class="auth-intro"><div class="eyebrow">From feedback to better events</div><h1>Every response<br>makes a difference.</h1><p class="muted">Create a survey, share the link, and discover what mattered to your attendees.</p><p class="muted">EventBench prototype · Data lasts until the server restarts.</p></section>
  <section class="card"><h2>{{register ? 'Create an account' : 'Welcome back'}}</h2><p class="muted">{{register ? 'Your workspace for event feedback.' : 'Log in to view your surveys.'}}</p>
  <app-feedback [error]="error()"/>
  <form [formGroup]="form" (ngSubmit)="submit()">
    @if(register) { <div class="field"><label for="username">Username</label><input id="username" formControlName="username" autocomplete="username" minlength="3" maxlength="40" [attr.aria-invalid]="invalid('username')"><small>3–40 characters</small>@if(invalid('username')) {<p class="field-error">{{field('username', 'Enter a username (3–40 characters).')}}</p>}</div> }
    <div class="field"><label for="email">Email</label><input id="email" type="email" formControlName="email" autocomplete="email" maxlength="254" [attr.aria-invalid]="invalid('email')">@if(invalid('email')) {<p class="field-error">{{field('email', 'Enter a valid email address.')}}</p>}</div>
    <div class="field"><label for="password">Password</label><input id="password" type="password" formControlName="password" [autocomplete]="register ? 'new-password' : 'current-password'" minlength="6" maxlength="128" [attr.aria-invalid]="invalid('password')">@if(invalid('password')) {<p class="field-error">Enter a password (6–128 characters).</p>}</div>
    @if(register) { <div class="field"><label for="confirm">Confirm password</label><input id="confirm" type="password" formControlName="confirm" autocomplete="new-password">@if(attempted && form.value.password !== form.value.confirm) {<p class="field-error">Passwords do not match.</p>}</div> }
    <button type="submit" [disabled]="busy()">{{busy() ? 'Please wait…' : register ? 'Sign up' : 'Log in'}}</button>
  </form><p class="muted">{{register ? 'Already have an account?' : 'New here?'}} <a [routerLink]="register ? '/login' : '/register'">{{register ? 'Log in' : 'Create an account'}}</a></p></section></div>` })
export class AuthComponent {
  private fb = inject(FormBuilder); private auth = inject(Auth); private router = inject(Router);
  register = inject(ActivatedRoute).snapshot.routeConfig?.path === 'register'; busy = signal(false); error = signal<Failure | null>(null); attempted = false;
  form = this.fb.nonNullable.group({ username: ['', this.register ? [Validators.required, Validators.minLength(3), Validators.maxLength(40)] : []], email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]], password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]], confirm: [''] });
  invalid(key: string) { const c = this.form.get(key); return !!this.error()?.fields[key] || !!(c?.invalid && (c.touched || this.attempted)); }
  field(key: string, fallback: string) { return this.error()?.fields[key] ?? fallback; }
  async submit() {
    if (this.busy()) return; this.attempted = true; this.form.markAllAsTouched(); this.error.set(null);
    if (this.form.invalid || (this.register && this.form.value.confirm !== this.form.value.password)) return;
    this.busy.set(true);
    try { const { username, email, password } = this.form.getRawValue(); await this.auth.enter(this.register ? 'register' : 'login', this.register ? { username, email, password } : { email, password }); await this.router.navigateByUrl('/surveys'); }
    catch (e) { this.error.set(failure(e)); } finally { this.busy.set(false); }
  }
}
