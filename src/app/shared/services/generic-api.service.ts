import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GenericApiService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── READ ──────────────────────────────────────────────────────────────────

  getAll<T>(resource: string): Observable<T[]> {
    return this.http.get<T[]>(`${this.base}/${resource}`);
  }

  getById<T>(resource: string, id: string): Observable<T> {
    return this.http.get<T>(`${this.base}/${resource}/${id}`);
  }

  // ── WRITE ─────────────────────────────────────────────────────────────────

  create<T>(resource: string, body: Partial<T>): Observable<T> {
    return this.http.post<T>(`${this.base}/${resource}`, body);
  }

  update<T>(resource: string, id: string, body: Partial<T>): Observable<T> {
    return this.http.put<T>(`${this.base}/${resource}/${id}`, body);
  }

  delete(resource: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${resource}/${id}`);
  }
}