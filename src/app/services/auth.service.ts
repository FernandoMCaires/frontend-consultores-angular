import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

type AuthSession = {
  email: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
};

type SignInResponse = {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
};

type RefreshResponse = {
  id_token: string;
  refresh_token: string;
  expires_in: string;
  user_id: string;
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'consultores.auth.session';
  private readonly apiKey = environment.firebase.apiKey;

  private readonly session = signal<AuthSession | null>(this.restoreSession());

  readonly isAuthenticated = computed(() => !!this.session());
  readonly userEmail = computed(() => this.session()?.email ?? null);

  constructor() {
    void this.ensureSessionValidity();
  }

  async login(email: string, password: string): Promise<void> {
    this.assertApiKey();
    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`;
    const body = {
      email: email.trim(),
      password: password.trim(),
      returnSecureToken: true
    };

    const response = await firstValueFrom(this.http.post<SignInResponse>(endpoint, body));
    const session = this.toSession(response);
    this.persistSession(session);
  }

  logout(): void {
    this.session.set(null);
    this.persistSession(null);
  }

  async getValidToken(): Promise<string> {
    const current = this.session();
    if (!current) {
      throw new Error('Usuário não autenticado.');
    }

    if (current.expiresAt - 60_000 > Date.now()) {
      return current.idToken;
    }

    const refreshed = await this.refreshSession(current);
    this.persistSession(refreshed);
    return refreshed.idToken;
  }

  private async ensureSessionValidity(): Promise<void> {
    const current = this.session();
    if (!current) {
      return;
    }

    if (current.expiresAt <= Date.now()) {
      try {
        const refreshed = await this.refreshSession(current);
        this.persistSession(refreshed);
      } catch {
        this.logout();
      }
    }
  }

  private async refreshSession(current: AuthSession): Promise<AuthSession> {
    this.assertApiKey();
    const endpoint = `https://securetoken.googleapis.com/v1/token?key=${this.apiKey}`;
    const body = {
      grant_type: 'refresh_token',
      refresh_token: current.refreshToken
    };

    const response = await firstValueFrom(this.http.post<RefreshResponse>(endpoint, body));

    return {
      email: current.email,
      idToken: response.id_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + Number(response.expires_in) * 1000
    };
  }

  private toSession(response: SignInResponse): AuthSession {
    return {
      email: response.email,
      idToken: response.idToken,
      refreshToken: response.refreshToken,
      expiresAt: Date.now() + Number(response.expiresIn) * 1000
    };
  }

  private restoreSession(): AuthSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }

  private persistSession(session: AuthSession | null): void {
    this.session.set(session);

    if (typeof window === 'undefined') {
      return;
    }

    if (!session) {
      window.localStorage.removeItem(this.storageKey);
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private assertApiKey(): void {
    if (!this.apiKey) {
      throw new Error('Firebase API Key não configurada no environment.');
    }
  }
}
