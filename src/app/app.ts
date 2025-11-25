import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Consultant, ConsultantInput } from './models/consultant.model';
import { ConsultantService } from './services/consultant.service';
import { AuthService } from './services/auth.service';

type Feedback = { type: 'success' | 'error'; message: string } | null;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly consultantService = inject(ConsultantService);
  private readonly authService = inject(AuthService);

  readonly consultants = signal<Consultant[]>([]);
  readonly loading = signal(false);
  readonly formBusy = signal(false);
  readonly authBusy = signal(false);
  readonly feedback = signal<Feedback>(null);
  readonly filterTerm = signal('');
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly userEmail = this.authService.userEmail;

  readonly filteredConsultants = computed(() => {
    const term = this.filterTerm().trim().toLowerCase();
    if (!term) {
      return this.consultants();
    }

    return this.consultants().filter((consultant) => {
      return [consultant.nome, consultant.email, consultant.area]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  });

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly consultantForm = this.fb.group({
    id: this.fb.control<string | null>(null),
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    telefone: [''],
    area: ['']
  });

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        void this.loadConsultants();
      } else {
        this.consultants.set([]);
      }
    });
  }

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      void this.loadConsultants();
    }
  }

  async login(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authBusy.set(true);
    const { email, password } = this.loginForm.getRawValue();

    try {
      await this.authService.login(email!, password!);
      this.loginForm.reset();
      this.showFeedback('success', 'Login realizado com sucesso.');
      await this.loadConsultants();
    } catch (error) {
      this.handleError('Não foi possível autenticar. Verifique o e-mail e a senha.', error);
    } finally {
      this.authBusy.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
    this.consultants.set([]);
    this.showFeedback('success', 'Sessão encerrada.');
  }

  async loadConsultants(showToast = false): Promise<void> {
    if (!this.isAuthenticated()) {
      return;
    }

    this.loading.set(true);
    try {
      const consultores = await firstValueFrom(this.consultantService.list());

      consultores.sort((a, b) => a.nome.localeCompare(b.nome));
      this.consultants.set(consultores);

      if (showToast) {
        this.showFeedback('success', 'Lista atualizada com sucesso.');
      }
    } catch (error) {
      this.handleError('Falha ao carregar os consultores.', error);
    } finally {
      this.loading.set(false);
    }
  }

  async submitConsultant(): Promise<void> {
    if (this.consultantForm.invalid) {
      this.consultantForm.markAllAsTouched();
      return;
    }

    this.formBusy.set(true);
    const { id, nome, email, telefone, area } = this.consultantForm.getRawValue();
    const payload: ConsultantInput = {
      nome: nome!.trim(),
      email: email!.trim(),
      telefone: telefone?.trim() || undefined,
      area: area?.trim() || undefined
    };

    try {
      if (id) {
        await firstValueFrom(this.consultantService.update({ id, ...payload }));
        this.showFeedback('success', 'Consultor atualizado com sucesso.');
      } else {
        await firstValueFrom(this.consultantService.create(payload));
        this.showFeedback('success', 'Consultor criado com sucesso.');
      }

      this.resetForm();
      await this.loadConsultants();
    } catch (error) {
      this.handleError('Não foi possível salvar os dados.', error);
    } finally {
      this.formBusy.set(false);
    }
  }

  editConsultant(consultant: Consultant): void {
    this.consultantForm.reset({
      id: consultant.id,
      nome: consultant.nome,
      email: consultant.email,
      telefone: consultant.telefone ?? '',
      area: consultant.area ?? ''
    });
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetForm(): void {
    this.consultantForm.reset({
      id: null,
      nome: '',
      email: '',
      telefone: '',
      area: ''
    });
  }

  async deleteConsultant(consultant: Consultant): Promise<void> {
    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(`Deseja realmente remover ${consultant.nome}?`);
    if (!confirmed) {
      return;
    }

    this.loading.set(true);
    try {
      await firstValueFrom(
        this.consultantService.remove(consultant.id)
      );
      this.showFeedback('success', `${consultant.nome} foi removido.`);
      await this.loadConsultants();
    } catch (error) {
      this.handleError('Não foi possível remover o consultor.', error);
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.filterTerm.set(value);
  }

  trackById(_: number, consultant: Consultant): string {
    return consultant.id;
  }

  private showFeedback(type: 'success' | 'error', message: string): void {
    this.feedback.set({ type, message });
    setTimeout(() => this.feedback.set(null), 5000);
  }

  private handleError(message: string, error: unknown): void {
    console.error(message, error);
    this.showFeedback('error', message);
  }
}
