import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Api } from './api';
import type { Organizer } from './models';
@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api); private router = inject(Router);
  token = signal(sessionStorage.getItem('gemify.session')); organizer = signal<Organizer | null>(null);
  async enter(path: 'login' | 'register', body: unknown) {
    const result = await this.api.post<{ organizer: Organizer; sessionToken: string }>(`/auth/${path}`, body);
    sessionStorage.setItem('gemify.session', result.sessionToken); this.token.set(result.sessionToken); this.organizer.set(result.organizer);
  }
  clear() { sessionStorage.removeItem('gemify.session'); this.token.set(null); this.organizer.set(null); }
  async check() { if (!this.token()) return false; const result = await this.api.get<{ organizer: Organizer }>('/auth/me'); this.organizer.set(result.organizer); return true; }
  async logout() { await this.api.post('/auth/logout'); this.clear(); await this.router.navigateByUrl('/login'); }
}
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth); const router = inject(Router);
  const privateRequest = req.url.startsWith('/api/surveys') || req.url === '/api/auth/me' || req.url === '/api/auth/logout';
  if (privateRequest && auth.token()) req = req.clone({ setHeaders: { Authorization: `Bearer ${auth.token()}` } });
  return next(req).pipe(catchError((error: HttpErrorResponse) => {
    if (privateRequest && error.status === 401) { auth.clear(); void router.navigateByUrl('/login'); }
    return throwError(() => error);
  }));
};
export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth); const router = inject(Router);
  try { return await auth.check() || router.createUrlTree(['/login']); }
  catch (error) { if (error instanceof HttpErrorResponse && error.status === 401) return router.createUrlTree(['/login']); return true; }
};
