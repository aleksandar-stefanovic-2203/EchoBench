import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from './core/auth';
import { failure, type Failure } from './core/models';
import { FeedbackComponent } from './shared/feedback.component';
@Component({ selector:'app-root',imports:[RouterOutlet,RouterLink,FeedbackComponent],styles:[`header {border-bottom:1px solid #dce5da;background:#fff} nav {max-width:1080px;padding:18px 24px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:16px}.brand {color:#28694f;font-size:1.5rem;font-weight:800;letter-spacing:-.06em;text-decoration:none}.account {display:flex;gap:16px;align-items:center}.brand span {display:inline-block;margin-right:8px;font-size:1.3rem} footer {max-width:1080px;margin:0 auto;padding:0 24px 28px;font-size:.8rem;color:#65796e}@media(max-width:650px){nav{padding:16px}.account {gap:8px}.account .username{display:none}}`],template:`
 <header><nav aria-label="Glavna navigacija"><a class="brand" [routerLink]="isPublic() ? null : '/surveys'"><span aria-hidden="true">◇</span>gemify</a>@if(auth.token() && !isPublic()) {<div class="account"><span class="username muted">{{auth.organizer()?.username}}</span><button class="secondary" (click)="logout()" [disabled]="busy()">Odjavi se</button></div>} @else {<small>Feedback za bolje događaje</small>}</nav></header>
 <main class="shell"><app-feedback [error]="error()"/><router-outlet/></main><footer>Gemify · Prototip. Podaci se čuvaju u memoriji i nestaju pri restartu servera.</footer>`})
export class AppComponent {
  auth=inject(Auth); private router=inject(Router); error=signal<Failure|null>(null); busy=signal(false);
  isPublic() {return this.router.url.startsWith('/s/');}
  async logout() {this.busy.set(true);this.error.set(null);try{await this.auth.logout();}catch(e){this.error.set(failure(e));}finally{this.busy.set(false);}}
}
