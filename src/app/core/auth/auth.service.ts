import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CurrentUser {
  userId:   string;
  username: string;
  fullName: string;
  role:     string;
  exp:      number;
}

export interface LoginResponse {
  token:     string;
  fullName:  string;
  username:  string;
  role:      string;
  userId:    string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'wf_auth_token';

  // ── Reactive current-user signal ─────────────────────────────────────────
  currentUser = signal<CurrentUser | null>(this.decodeToken(this.getToken()));

  isAdmin   = computed(() => this.currentUser()?.role?.toLowerCase() === 'admin');
  isLoggedIn = computed(() => !!this.currentUser() && this.currentUser()!.exp * 1000 > Date.now());

  constructor(private http: HttpClient, private router: Router) {}

  // ── Login ─────────────────────────────────────────────────────────────────
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap(res => {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          this.currentUser.set(this.decodeToken(res.token));
        })
      );
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ── Token helpers ─────────────────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // ── JWT Decoder (no library needed) ──────────────────────────────────────
  private decodeToken(token: string | null): CurrentUser | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Map .NET ClaimTypes to short names
      const userId   = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload['sub'] || '';
      const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']           || payload['name'] || '';
      const fullName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']      || payload['given_name'] || '';
      const role     = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']         || payload['role'] || 'user';
      const exp      = payload['exp'] || 0;

      if (exp * 1000 < Date.now()) return null; // expired
      return { userId, username, fullName, role, exp };
    } catch {
      return null;
    }
  }
}