import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  styles: [`
    :host {
      display: block;
      height: 100vh;
      --bg: #070b1a;
      --bg-soft: #101733;
      --card: rgba(16, 24, 52, 0.74);
      --card-border: rgba(148, 163, 184, 0.22);
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #7c8cff;
      --accent-2: #57d0ff;
      --danger: #f87171;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }

    .shell {
      display: grid;
      grid-template-columns: 1fr 440px;
      min-height: 100vh;
      background:
        radial-gradient(circle at 25% 10%, rgba(87, 208, 255, 0.2) 0, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(124, 140, 255, 0.25) 0, transparent 42%),
        linear-gradient(145deg, var(--bg), var(--bg-soft));
      color: var(--text);
    }

    .visual {
      padding: 56px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .visual::before {
      content: '';
      position: absolute;
      inset: 28px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 26px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.08));
    }

    .visual-inner {
      position: relative;
      z-index: 1;
      max-width: 560px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: .76rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #bfdbfe;
      background: rgba(59, 130, 246, 0.18);
      border: 1px solid rgba(147, 197, 253, 0.35);
      margin-bottom: 18px;
    }

    .vis-title {
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1.1;
      margin: 0 0 14px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .vis-title span {
      background: linear-gradient(100deg, #93c5fd, var(--accent-2));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .vis-sub {
      color: var(--muted);
      line-height: 1.7;
      margin: 0 0 28px;
      max-width: 520px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .stat {
      background: rgba(15, 23, 42, 0.38);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      padding: 14px;
    }

    .stat-value {
      display: block;
      font-size: 1.12rem;
      font-weight: 800;
      color: #dbeafe;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: .73rem;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #94a3b8;
    }

    .form-pane {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 34px;
      border-left: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(5, 9, 20, 0.62);
      backdrop-filter: blur(8px);
    }

    .form-inner {
      width: 100%;
      max-width: 360px;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 22px;
      padding: 26px;
      box-shadow: 0 20px 50px rgba(2, 8, 23, 0.45);
    }

    .form-logo {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      font-size: 1.2rem;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      margin-bottom: 18px;
      box-shadow: 0 10px 26px rgba(87, 208, 255, 0.28);
    }

    .form-headline {
      margin: 0;
      font-size: 1.52rem;
      letter-spacing: -0.03em;
      color: #f8fafc;
    }

    .form-sub {
      margin: 8px 0 22px;
      color: var(--muted);
      font-size: .88rem;
    }

    .alert-error {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 10px 12px;
      margin-bottom: 16px;
      border-radius: 10px;
      border: 1px solid rgba(248, 113, 113, 0.45);
      background: rgba(127, 29, 29, 0.25);
      color: #fecaca;
      font-size: .8rem;
    }

    .field {
      margin-bottom: 14px;
    }

    .field-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .field-label {
      font-size: .68rem;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #a5b4fc;
      font-weight: 700;
    }

    .field-err {
      font-size: .68rem;
      color: #fca5a5;
      font-weight: 600;
    }

    .input-wrap {
      position: relative;
    }

    .input-icon {
      position: absolute;
      top: 50%;
      left: 12px;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: .8rem;
    }

    .inp {
      width: 100%;
      box-sizing: border-box;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.5);
      color: #e2e8f0;
      font: 500 .88rem Inter, sans-serif;
      padding: 11px 40px 11px 36px;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
    }

    .inp::placeholder {
      color: rgba(148, 163, 184, 0.7);
    }

    .inp:focus {
      border-color: #93c5fd;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .inp.invalid {
      border-color: rgba(248, 113, 113, 0.8);
    }

    .eye-btn {
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
    }

    .btn-submit {
      width: 100%;
      border: none;
      border-radius: 12px;
      padding: 12px;
      font: 700 .9rem Inter, sans-serif;
      color: #0b1023;
      background: linear-gradient(90deg, #93c5fd, #67e8f9);
      cursor: pointer;
      margin-top: 8px;
      transition: transform .15s ease, box-shadow .15s ease;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(56, 189, 248, 0.32);
    }

    .btn-submit:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    .btn-inner {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .spin-icon {
      animation: spin .8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .form-footer {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      color: var(--muted);
      font-size: .72rem;
      text-align: center;
    }

    .footer-links {
      margin-top: 6px;
      display: flex;
      justify-content: center;
      gap: 18px;
    }

    .footer-links a {
      color: #c4b5fd;
      text-decoration: none;
    }

    @media (max-width: 980px) {
      .shell {
        grid-template-columns: 1fr;
      }

      .visual {
        display: none;
      }

      .form-pane {
        border-left: 0;
      }
    }
  `],
  template: `
<div class="shell">
  <div class="visual">
    <div class="visual-inner">
      <div class="chip">
        <i class="pi pi-bolt"></i>
        Process Automation
      </div>
      <h1 class="vis-title">Workflow<span>Studio</span> Platform</h1>
      <p class="vis-sub">
        Modélisez, automatisez et suivez vos processus métiers dans une interface claire, rapide et pensée pour les équipes.
      </p>
      <div class="stats">
        <div class="stat">
          <span class="stat-value">99.9%</span>
          <span class="stat-label">Disponibilité</span>
        </div>
        <div class="stat">
          <span class="stat-value">+40%</span>
          <span class="stat-label">Productivité</span>
        </div>
        <div class="stat">
          <span class="stat-value">24/7</span>
          <span class="stat-label">Suivi live</span>
        </div>
      </div>
    </div>
  </div>

  <div class="form-pane">
    <div class="form-inner">
      <div class="form-logo">🔷</div>
      <h2 class="form-headline">Bon retour 👋</h2>
      <p class="form-sub">Connectez-vous pour accéder à votre espace workflow.</p>

      @if (globalError()) {
        <div class="alert-error">
          <i class="pi pi-exclamation-circle alert-icon"></i>
          <span class="alert-text">{{ globalError() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="field">
          <div class="field-head">
            <label class="field-label" for="username">Identifiant</label>
            @if (f['username'].invalid && f['username'].touched) {
              <span class="field-err">Champ requis</span>
            }
          </div>
          <div class="input-wrap">
            <i class="pi pi-user input-icon"></i>
            <input
              id="username"
              class="inp"
              [class.invalid]="f['username'].invalid && f['username'].touched"
              type="text"
              formControlName="username"
              placeholder="admin / enseignant / étudiant"
              autocomplete="username"
            />
          </div>
        </div>

        <div class="field">
          <div class="field-head">
            <label class="field-label" for="password">Mot de passe</label>
            @if (f['password'].invalid && f['password'].touched) {
              <span class="field-err">6 caractères minimum</span>
            }
          </div>
          <div class="input-wrap">
            <i class="pi pi-lock input-icon"></i>
            <input
              id="password"
              class="inp"
              [class.invalid]="f['password'].invalid && f['password'].touched"
              [type]="showPwd() ? 'text' : 'password'"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <button type="button" class="eye-btn" (click)="showPwd.set(!showPwd())" [title]="showPwd() ? 'Masquer' : 'Afficher'">
              <i class="pi" [class.pi-eye]="!showPwd()" [class.pi-eye-slash]="showPwd()"></i>
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="btn-submit"
          [disabled]="loading()">
          <span class="btn-inner">
            @if (loading()) {
              <i class="pi pi-spinner spin-icon"></i>
              Connexion en cours…
            } @else {
              <i class="pi pi-sign-in"></i>
              Se connecter
            }
          </span>
        </button>
      </form>

      <div class="form-footer">
        © {{ year }} WorkflowStudio — Tous droits réservés
        <div class="footer-links">
          <a href="#">Politique de confidentialité</a>
          <a href="#">Support</a>
        </div>
      </div>

    </div>
  </div>

</div>
  `,
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  loading     = signal(false);
  globalError = signal<string | null>(null);
  showPwd     = signal(false);
  year        = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Redirect if already logged in
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/users']);
      return;
    }

    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    this.globalError.set(null);

    if (this.form.invalid) return;

    this.loading.set(true);

    const { username, password } = this.form.value;

    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/users']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401 || err?.status === 403) {
          this.globalError.set('Identifiant ou mot de passe incorrect.');
        } else if (err?.status === 0) {
          this.globalError.set('Impossible de joindre le serveur. Vérifiez votre connexion.');
        } else {
          this.globalError.set(err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.');
        }
        // Shake the form by re-triggering the error signal
        const msg = this.globalError();
        this.globalError.set(null);
        setTimeout(() => this.globalError.set(msg), 10);
      },
    });
  }
}
