import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  get<T>(path: string) { return firstValueFrom(this.http.get<T>(`/api${path}`)); }
  post<T>(path: string, body: unknown = {}) { return firstValueFrom(this.http.post<T>(`/api${path}`, body)); }
  patch<T>(path: string, body: unknown) { return firstValueFrom(this.http.patch<T>(`/api${path}`, body)); }
}
