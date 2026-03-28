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
      /* ─── CYBER THEME VARIABLES ────────────────────────────────────────── */
      --cyber-bg: #0a0a0f;
      --cyber-dark: #050508;
      --neon-cyan: #00f5ff;
      --neon-magenta: #ff00ff;
      --neon-purple: #bf00ff;
      --neon-pink: #ff2a6d;
      --grid-color: rgba(0, 245, 255, .15);
      --card-bg: rgba(10, 10, 20, .85);
      --card-border: rgba(0, 245, 255, .2);
      --text: #e0f7ff;
      --text-muted: #5a8a99;
      --danger: #ff4757;
      --radius: 4px;
      --radius-lg: 8px;

      display: block;
      width: 100%;
      height: 100vh;
      font-family: 'DM Sans', system-ui, sans-serif;
    }

    /* ─── MAIN SHELL ─────────────────────────────────────────────────────── */
    .cyber-shell {
      position: relative;
      width: 100%;
      height: 100vh;
      background: var(--cyber-bg);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ─── GRADIENT SKY ───────────────────────────────────────────────────── */
    .sky {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(
          to bottom,
          #0a0a0f 0%,
          #0a0a1a 30%,
          #1a0a2e 50%,
          #2d1b4e 70%,
          #1a0a2e 85%,
          #0a0a0f 100%
        );
    }

    /* ─── SUN / HORIZON GLOW ─────────────────────────────────────────────── */
    .sun {
      position: absolute;
      bottom: 25%;
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
      height: 150px;
      background: linear-gradient(
        to top,
        var(--neon-magenta) 0%,
        var(--neon-pink) 30%,
        var(--neon-purple) 60%,
        transparent 100%
      );
      border-radius: 50% 50% 0 0;
      filter: blur(2px);
      opacity: .8;
      box-shadow:
        0 0 60px var(--neon-magenta),
        0 0 120px var(--neon-pink);
    }

    /* Sun lines */
    .sun::before {
      content: '';
      position: absolute;
      bottom: 20%;
      left: 0;
      right: 0;
      height: 60%;
      background: repeating-linear-gradient(
        to top,
        transparent 0px,
        transparent 8px,
        var(--cyber-bg) 8px,
        var(--cyber-bg) 12px
      );
    }

    /* Horizon glow line */
    .horizon-glow {
      position: absolute;
      bottom: 25%;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--neon-cyan);
      box-shadow:
        0 0 20px var(--neon-cyan),
        0 0 40px var(--neon-cyan),
        0 0 80px var(--neon-cyan);
    }

    /* ─── PERSPECTIVE GRID ───────────────────────────────────────────────── */
    .grid-container {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 45%;
      perspective: 400px;
      overflow: hidden;
    }

    .grid {
      position: absolute;
      width: 200%;
      height: 200%;
      left: -50%;
      bottom: 0;
      background-image:
        linear-gradient(var(--grid-color) 2px, transparent 2px),
        linear-gradient(90deg, var(--grid-color) 2px, transparent 2px);
      background-size: 60px 60px;
      transform: rotateX(75deg);
      transform-origin: center bottom;
      animation: grid-scroll 15s linear infinite;
    }

    @keyframes grid-scroll {
      0% { background-position: 0 0; }
      100% { background-position: 0 60px; }
    }

    /* Grid glow overlay */
    .grid::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        rgba(0, 245, 255, .05) 50%,
        rgba(0, 245, 255, .1) 100%
      );
    }

    /* ─── SCAN LINES ─────────────────────────────────────────────────────── */
    .scanlines {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent 2px,
        rgba(0, 0, 0, .1) 2px,
        rgba(0, 0, 0, .1) 4px
      );
      pointer-events: none;
      z-index: 100;
    }

    /* ─── FLOATING SHAPES ────────────────────────────────────────────────── */
    .shapes {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .shape {
      position: absolute;
      border: 2px solid;
      animation: float-shape 8s ease-in-out infinite;
    }

    .shape.s1 {
      width: 40px; height: 40px;
      top: 15%; left: 10%;
      border-color: var(--neon-cyan);
      transform: rotate(45deg);
      box-shadow: 0 0 15px var(--neon-cyan);
      animation-delay: 0s;
    }

    .shape.s2 {
      width: 60px; height: 60px;
      top: 25%; right: 15%;
      border-color: var(--neon-magenta);
      border-radius: 50%;
      box-shadow: 0 0 15px var(--neon-magenta);
      animation-delay: -2s;
    }

    .shape.s3 {
      width: 0; height: 0;
      top: 40%; left: 8%;
      border: 25px solid transparent;
      border-bottom: 40px solid var(--neon-purple);
      box-shadow: 0 0 15px var(--neon-purple);
      animation-delay: -4s;
    }

    .shape.s4 {
      width: 30px; height: 30px;
      top: 20%; right: 30%;
      border-color: var(--neon-pink);
      transform: rotate(45deg);
      box-shadow: 0 0 15px var(--neon-pink);
      animation-delay: -6s;
    }

    @keyframes float-shape {
      0%, 100% { transform: translateY(0) rotate(45deg); opacity: .6; }
      50% { transform: translateY(-20px) rotate(45deg); opacity: 1; }
    }

    .shape.s2 {
      animation-name: float-circle;
    }

    @keyframes float-circle {
      0%, 100% { transform: translateY(0) scale(1); opacity: .6; }
      50% { transform: translateY(-25px) scale(1.1); opacity: 1; }
    }

    .shape.s3 {
      animation-name: float-triangle;
    }

    @keyframes float-triangle {
      0%, 100% { transform: translateY(0); opacity: .6; }
      50% { transform: translateY(-15px); opacity: 1; }
    }

    /* ─── LOGIN CARD ─────────────────────────────────────────────────────── */
    .cyber-card {
      position: relative;
      z-index: 50;
      width: 100%;
      max-width: 380px;
      padding: 40px 36px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      backdrop-filter: blur(10px);
      box-shadow:
        0 0 30px rgba(0, 245, 255, .1),
        inset 0 1px 0 rgba(0, 245, 255, .1);
    }

    /* Corner accents */
    .cyber-card::before,
    .cyber-card::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border: 2px solid var(--neon-cyan);
    }

    .cyber-card::before {
      top: -1px;
      left: -1px;
      border-right: none;
      border-bottom: none;
      box-shadow: -2px -2px 10px var(--neon-cyan);
    }

    .cyber-card::after {
      bottom: -1px;
      right: -1px;
      border-left: none;
      border-top: none;
      box-shadow: 2px 2px 10px var(--neon-cyan);
    }

    /* ─── HEADER ─────────────────────────────────────────────────────────── */
    .card-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .cyber-logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cyber-logo::before {
      content: '';
      position: absolute;
      inset: 0;
      border: 2px solid var(--neon-cyan);
      transform: rotate(45deg);
      box-shadow:
        0 0 20px var(--neon-cyan),
        inset 0 0 20px rgba(0, 245, 255, .2);
    }

    .cyber-logo i {
      font-size: 1.6rem;
      color: var(--neon-cyan);
      text-shadow: 0 0 20px var(--neon-cyan);
      position: relative;
      z-index: 1;
    }

    .card-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 6px;
      letter-spacing: .05em;
      text-transform: uppercase;
      text-shadow: 0 0 20px rgba(0, 245, 255, .5);
    }

    .card-subtitle {
      font-size: .85rem;
      color: var(--text-muted);
      margin: 0;
      letter-spacing: .03em;
    }

    /* ─── ERROR ALERT ────────────────────────────────────────────────────── */
    .alert-error {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(255, 71, 87, .1);
      border: 1px solid rgba(255, 71, 87, .3);
      border-left: 3px solid var(--danger);
      padding: 12px 14px;
      margin-bottom: 24px;
      animation: glitch-shake .3s ease;
    }

    .alert-icon {
      font-size: .9rem;
      color: var(--danger);
      flex-shrink: 0;
    }

    .alert-text {
      font-size: .82rem;
      color: var(--danger);
      line-height: 1.5;
    }

    @keyframes glitch-shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }

    /* ─── FORM FIELDS ────────────────────────────────────────────────────── */
    .field {
      margin-bottom: 20px;
    }

    .field-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .field-label {
      font-size: .7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .12em;
      color: var(--neon-cyan);
      text-shadow: 0 0 10px rgba(0, 245, 255, .5);
    }

    .field-err {
      font-size: .7rem;
      color: var(--danger);
      font-weight: 600;
      text-shadow: 0 0 10px rgba(255, 71, 87, .5);
    }

    /* ─── INPUT ──────────────────────────────────────────────────────────── */
    .input-wrap {
      position: relative;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: .85rem;
      pointer-events: none;
      transition: all .25s ease;
    }

    .field:focus-within .input-icon {
      color: var(--neon-cyan);
      text-shadow: 0 0 10px var(--neon-cyan);
    }

    .inp {
      width: 100%;
      box-sizing: border-box;
      padding: 14px 14px 14px 44px;
      background: rgba(0, 0, 0, .4);
      border: 1px solid rgba(0, 245, 255, .2);
      border-radius: var(--radius);
      color: var(--text);
      font: 500 .88rem 'DM Sans', sans-serif;
      outline: none;
      transition: all .25s ease;
    }

    .inp::placeholder {
      color: rgba(90, 138, 153, .6);
    }

    .inp:focus {
      border-color: var(--neon-cyan);
      background: rgba(0, 245, 255, .05);
      box-shadow:
        0 0 0 1px var(--neon-cyan),
        0 0 20px rgba(0, 245, 255, .2),
        inset 0 0 20px rgba(0, 245, 255, .05);
    }

    .inp.invalid {
      border-color: var(--danger);
      box-shadow:
        0 0 0 1px var(--danger),
        0 0 15px rgba(255, 71, 87, .2);
    }

    /* ─── EYE TOGGLE ─────────────────────────────────────────────────────── */
    .eye-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      background: transparent;
      border: 1px solid rgba(0, 245, 255, .2);
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--text-muted);
      font-size: .8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .2s ease;
    }

    .eye-btn:hover {
      border-color: var(--neon-cyan);
      color: var(--neon-cyan);
      box-shadow: 0 0 10px rgba(0, 245, 255, .3);
    }

    /* ─── SUBMIT BUTTON ──────────────────────────────────────────────────── */
    .btn-submit {
      width: 100%;
      padding: 14px 24px;
      margin-top: 16px;
      background: transparent;
      border: 2px solid var(--neon-cyan);
      border-radius: var(--radius);
      color: var(--neon-cyan);
      font: 700 .9rem 'DM Sans', sans-serif;
      text-transform: uppercase;
      letter-spacing: .1em;
      cursor: pointer;
      transition: all .3s ease;
      position: relative;
      overflow: hidden;
    }

    .btn-submit::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta));
      opacity: 0;
      transition: opacity .3s ease;
    }

    .btn-submit:hover:not(:disabled) {
      color: var(--cyber-bg);
      box-shadow:
        0 0 20px var(--neon-cyan),
        0 0 40px rgba(0, 245, 255, .3),
        inset 0 0 20px rgba(0, 245, 255, .1);
    }

    .btn-submit:hover:not(:disabled)::before {
      opacity: 1;
    }

    .btn-submit:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .btn-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    .spin-icon {
      animation: spin .7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ─── FOOTER ─────────────────────────────────────────────────────────── */
    .card-footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid rgba(0, 245, 255, .1);
      text-align: center;
    }

    .footer-text {
      font-size: .7rem;
      color: var(--text-muted);
      margin: 0 0 10px;
      letter-spacing: .05em;
    }

    .footer-links {
      display: flex;
      gap: 20px;
      justify-content: center;
    }

    .footer-links a {
      font-size: .72rem;
      color: var(--text-muted);
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: .05em;
      transition: all .2s ease;
    }

    .footer-links a:hover {
      color: var(--neon-cyan);
      text-shadow: 0 0 10px var(--neon-cyan);
    }

    /* ─── BRANDING ───────────────────────────────────────────────────────── */
    .branding {
      position: absolute;
      top: 28px;
      left: 32px;
      z-index: 60;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-box {
      width: 40px;
      height: 40px;
      border: 2px solid var(--neon-magenta);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px var(--neon-magenta);
    }

    .brand-box i {
      font-size: 1rem;
      color: var(--neon-magenta);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: .9rem;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .brand-name span {
      color: var(--neon-magenta);
      text-shadow: 0 0 10px var(--neon-magenta);
    }

    .brand-tagline {
      font-size: .65rem;
      color: var(--text-muted);
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    /* ─── RESPONSIVE ─────────────────────────────────────────────────────── */
    @media (max-width: 520px) {
      .cyber-card {
        margin: 20px;
        padding: 32px 24px;
      }

      .branding {
        top: 16px;
        left: 16px;
      }

      .sun {
        width: 200px;
        height: 100px;
      }
    }
  `],
  template: `
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<div class="cyber-shell">
  <!-- Sky Gradient -->
  <div class="sky"></div>

  <!-- Retro Sun -->
  <div class="sun"></div>
  <div class="horizon-glow"></div>

  <!-- Perspective Grid -->
  <div class="grid-container">
    <div class="grid"></div>
  </div>

  <!-- Floating Shapes -->
  <div class="shapes">
    <div class="shape s1"></div>
    <div class="shape s2"></div>
    <div class="shape s3"></div>
    <div class="shape s4"></div>
  </div>

  <!-- Scanlines -->
  <div class="scanlines"></div>

  <!-- Branding -->
  <div class="branding">
    <div class="brand-box"><i class="pi pi-box"></i></div>
    <div class="brand-text">
      <div class="brand-name">Workflow<span>Studio</span></div>
      <div class="brand-tagline">System v1.0</div>
    </div>
  </div>

  <!-- Cyber Card -->
  <div class="cyber-card">
    <div class="card-header">
      <div class="cyber-logo"><i class="pi pi-box"></i></div>
      <h1 class="card-title">Access Terminal</h1>
      <p class="card-subtitle">Enter credentials to continue</p>
    </div>

    <!-- Global error -->
    @if (globalError()) {
      <div class="alert-error">
        <i class="pi pi-exclamation-triangle alert-icon"></i>
        <span class="alert-text">{{ globalError() }}</span>
      </div>
    }

    <!-- FORM -->
    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

      <!-- Username -->
      <div class="field">
        <div class="field-head">
          <label class="field-label" for="username">User ID</label>
          @if (f['username'].invalid && f['username'].touched) {
            <span class="field-err">Required</span>
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
            placeholder="Enter user ID"
            autocomplete="username"
          />
        </div>
      </div>

      <!-- Password -->
      <div class="field">
        <div class="field-head">
          <label class="field-label" for="password">Access Code</label>
          @if (f['password'].invalid && f['password'].touched) {
            <span class="field-err">Min 6 chars</span>
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
            placeholder="Enter access code"
            autocomplete="current-password"
          />
          <button type="button" class="eye-btn" (click)="showPwd.set(!showPwd())">
            <i class="pi" [class.pi-eye]="!showPwd()" [class.pi-eye-slash]="showPwd()"></i>
          </button>
        </div>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        class="btn-submit"
        [disabled]="loading()">
        <span class="btn-inner">
          @if (loading()) {
            <i class="pi pi-spinner spin-icon"></i>
            Authenticating...
          } @else {
            <i class="pi pi-sign-in"></i>
            Initialize
          }
        </span>
      </button>

    </form>

    <!-- Footer -->
    <div class="card-footer">
      <p class="footer-text">WorkflowStudio // {{ year }}</p>
      <div class="footer-links">
        <a href="#">Protocol</a>
        <a href="#">Support</a>
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
