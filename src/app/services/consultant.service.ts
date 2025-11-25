import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, defer, from, switchMap } from 'rxjs';

import { Consultant, ConsultantInput, ConsultantUpdate } from '../models/consultant.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ConsultantService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiBaseUrl;

  list(): Observable<Consultant[]> {
    return this.withAuth((headers) => this.http.get<Consultant[]>(this.apiUrl, { headers }));
  }

  getById(id: string): Observable<Consultant> {
    return this.withAuth((headers) =>
      this.http.get<Consultant>(this.apiUrl, {
        headers,
        params: new HttpParams().set('id', id)
      })
    );
  }

  create(payload: ConsultantInput): Observable<Consultant> {
    return this.withAuth((headers) => this.http.post<Consultant>(this.apiUrl, payload, { headers }));
  }

  update(payload: ConsultantUpdate): Observable<{ message: string; id: string }> {
    return this.withAuth((headers) =>
      this.http.put<{ message: string; id: string }>(this.apiUrl, payload, { headers })
    );
  }

  remove(id: string): Observable<{ message: string; id: string }> {
    return this.withAuth((headers) =>
      this.http.delete<{ message: string; id: string }>(this.apiUrl, {
        headers,
        params: new HttpParams().set('id', id)
      })
    );
  }

  private withAuth<T>(requestFactory: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return defer(() => from(this.buildHeaders())).pipe(switchMap((headers) => requestFactory(headers)));
  }

  private async buildHeaders(): Promise<HttpHeaders> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    const token = await this.authService.getValidToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }
}
