import { Component, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  styles: [`
    :host { display: block; }

    /* ─── CYBER THEME VARIABLES ──────────────────────────────────────────── */
    :host {
      --cyber-bg: #0a0a0f;
      --cyber-panel: #0d0d14;
      --neon-cyan: #00f5ff;
      --neon-magenta: #ff00ff;
      --neon-purple: #bf00ff;
      --neon-pink: #ff2a6d;
      --border-color: rgba(0, 245, 255, .15);
      --text: #e0f7ff;
      --text-muted: #5a8a99;
      --danger: #ff4757;
      --radius: 4px;
    }

    /* ─── SIDEBAR SHELL ──────────────────────────────────────────────────── */
    .sidebar {
      width: 240px;
      min-width: 240px;
      height: 100vh;
      background: var(--cyber-bg);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      font-family: 'DM Sans', system-ui, sans-serif;
      border-right: 1px solid var(--border-color);
    }

    /* ─── SCANLINES OVERLAY ──────────────────────────────────────────────── */
    .sidebar::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent 2px,
        rgba(0, 0, 0, .15) 2px,
        rgba(0, 0, 0, .15) 4px
      );
      pointer-events: none;
      z-index: 100;
    }

    /* ─── GLOWING EDGE LINE ──────────────────────────────────────────────── */
    .edge-glow {
      position: absolute;
      top: 0;
      right: 0;
      width: 1px;
      height: 100%;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        var(--neon-cyan) 20%,
        var(--neon-magenta) 50%,
        var(--neon-cyan) 80%,
        transparent 100%
      );
      box-shadow:
        0 0 10px var(--neon-cyan),
        0 0 20px var(--neon-cyan);
      animation: edge-pulse 3s ease-in-out infinite;
    }

    @keyframes edge-pulse {
      0%, 100% { opacity: .6; }
      50% { opacity: 1; }
    }

    /* ─── LOGO AREA ──────────────────────────────────────────────────────── */
    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 20px 20px;
      border-bottom: 1px solid var(--border-color);
      position: relative;
    }

    .logo-mark {
      width: 42px;
      height: 42px;
      border: 2px solid var(--neon-cyan);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      box-shadow:
        0 0 10px rgba(0, 245, 255, .3),
        inset 0 0 10px rgba(0, 245, 255, .1);
    }

    .logo-mark i {
      font-size: 1.1rem;
      color: var(--neon-cyan);
      text-shadow: 0 0 10px var(--neon-cyan);
    }

    /* Corner accents */
    .logo-mark::before,
    .logo-mark::after {
      content: '';
      position: absolute;
      width: 8px;
      height: 8px;
      border: 2px solid var(--neon-magenta);
    }
    .logo-mark::before {
      top: -4px;
      left: -4px;
      border-right: none;
      border-bottom: none;
    }
    .logo-mark::after {
      bottom: -4px;
      right: -4px;
      border-left: none;
      border-top: none;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .logo-title {
      font-size: .9rem;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .logo-title span {
      color: var(--neon-magenta);
      text-shadow: 0 0 10px var(--neon-magenta);
    }

    .logo-badge {
      font-size: .6rem;
      font-weight: 600;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    /* ─── SECTION LABEL ──────────────────────────────────────────────────── */
    .section-label {
      padding: 20px 20px 10px;
      font-size: .65rem;
      font-weight: 700;
      letter-spacing: .15em;
      text-transform: uppercase;
      color: var(--neon-cyan);
      text-shadow: 0 0 10px rgba(0, 245, 255, .5);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, var(--border-color), transparent);
    }

    /* ─── NAV LIST ────────────────────────────────────────────────────────── */
    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    /* ─── NAV ITEM ────────────────────────────────────────────────────────── */
    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid transparent;
      border-radius: var(--radius);
      background: transparent;
      color: var(--text-muted);
      text-decoration: none;
      font-size: .8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .05em;
      transition: all .2s ease;
      position: relative;
    }

    .nav-link:hover {
      background: rgba(0, 245, 255, .05);
      border-color: rgba(0, 245, 255, .2);
      color: var(--text);
    }

    .nav-link:hover .nav-icon {
      color: var(--neon-cyan);
      text-shadow: 0 0 10px var(--neon-cyan);
    }

    /* ─── ACTIVE STATE ───────────────────────────────────────────────────── */
    .nav-link.active {
      background: rgba(0, 245, 255, .08);
      border-color: var(--neon-cyan);
      color: var(--neon-cyan);
      box-shadow:
        0 0 15px rgba(0, 245, 255, .2),
        inset 0 0 15px rgba(0, 245, 255, .05);
    }

    .nav-link.active .nav-icon {
      color: var(--neon-cyan);
      text-shadow: 0 0 15px var(--neon-cyan);
    }

    /* Active indicator line */
    .nav-link.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: var(--neon-cyan);
      border-radius: 0 2px 2px 0;
      box-shadow: 0 0 10px var(--neon-cyan);
    }

    /* ─── ICON ───────────────────────────────────────────────────────────── */
    .nav-icon {
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .9rem;
      transition: all .2s ease;
    }

    .nav-label {
      flex: 1;
    }

    /* ─── FOOTER AREA ────────────────────────────────────────────────────── */
    .footer-area {
      padding: 16px 12px;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* ─── USER CARD ──────────────────────────────────────────────────────── */
    .user-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      background: rgba(0, 245, 255, .03);
      cursor: pointer;
      transition: all .2s ease;
    }

    .user-card:hover {
      border-color: rgba(0, 245, 255, .3);
      background: rgba(0, 245, 255, .06);
      box-shadow: 0 0 15px rgba(0, 245, 255, .1);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border: 2px solid var(--neon-magenta);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .75rem;
      font-weight: 700;
      color: var(--neon-magenta);
      flex-shrink: 0;
      box-shadow: 0 0 10px rgba(255, 0, 255, .3);
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: .78rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: uppercase;
      letter-spacing: .03em;
    }

    .user-role-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }

    .role-dot {
      width: 6px;
      height: 6px;
      background: #00ff88;
      box-shadow: 0 0 8px #00ff88;
      flex-shrink: 0;
    }

    .user-role {
      font-size: .65rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .user-arrow {
      color: var(--text-muted);
      font-size: .7rem;
      transition: all .2s ease;
    }

    .user-card:hover .user-arrow {
      color: var(--neon-cyan);
      transform: translateX(2px);
    }

    /* ─── LOGOUT BUTTON ──────────────────────────────────────────────────── */
    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 14px;
      border: 1px solid rgba(255, 71, 87, .3);
      border-radius: var(--radius);
      background: transparent;
      color: var(--danger);
      font: 600 .75rem 'DM Sans', system-ui, sans-serif;
      text-transform: uppercase;
      letter-spacing: .08em;
      cursor: pointer;
      transition: all .2s ease;
    }

    .logout-btn:hover {
      background: rgba(255, 71, 87, .1);
      border-color: var(--danger);
      box-shadow: 0 0 15px rgba(255, 71, 87, .2);
      text-shadow: 0 0 10px rgba(255, 71, 87, .5);
    }

    .logout-btn i {
      font-size: .8rem;
    }

    /* ─── VERSION LINE ───────────────────────────────────────────────────── */
    .version-line {
      text-align: center;
      font-size: .6rem;
      color: var(--text-muted);
      font-weight: 600;
      letter-spacing: .1em;
      text-transform: uppercase;
      padding-top: 8px;
      opacity: 0.5;
    }

    /* ─── DECORATIVE SHAPES ──────────────────────────────────────────────── */
    .deco-shapes {
      position: absolute;
      bottom: 120px;
      left: 20px;
      pointer-events: none;
      opacity: .15;
    }

    .deco-shape {
      position: absolute;
      border: 1px solid var(--neon-cyan);
    }

    .deco-shape.d1 {
      width: 30px;
      height: 30px;
      transform: rotate(45deg);
    }

    .deco-shape.d2 {
      width: 20px;
      height: 20px;
      left: 40px;
      top: 10px;
      border-color: var(--neon-magenta);
      border-radius: 50%;
    }

    /* ─── GRID PATTERN ───────────────────────────────────────────────────── */
    .grid-pattern {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background-image:
        linear-gradient(rgba(0, 245, 255, .03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, .03) 1px, transparent 1px);
      background-size: 20px 20px;
      mask-image: linear-gradient(to top, rgba(0,0,0,.3), transparent);
      -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,.3), transparent);
      pointer-events: none;
    }
  `],
  template: `
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<aside class="sidebar">
  <!-- Glowing Edge -->
  <div class="edge-glow"></div>

  <!-- Grid Pattern -->
  <div class="grid-pattern"></div>

  <!-- Decorative Shapes -->
  <div class="deco-shapes">
    <div class="deco-shape d1"></div>
    <div class="deco-shape d2"></div>
  </div>

  <!-- Logo -->
  <div class="logo-area">
    <div class="logo-mark">
      <i class="pi pi-box"></i>
    </div>
    <div class="logo-text">
      <div class="logo-title">Workflow<span>Studio</span></div>
      <div class="logo-badge">System v1.0</div>
    </div>
  </div>

  <!-- Navigation -->
  <div class="section-label">Navigation</div>
  <ul class="nav-list">
    <li>
      <a class="nav-link" routerLink="/workflows" routerLinkActive="active">
        <div class="nav-icon"><i class="pi pi-sitemap"></i></div>
        <span class="nav-label">Workflows</span>
      </a>
    </li>

    <li>
      <a class="nav-link" routerLink="/instances" routerLinkActive="active">
        <div class="nav-icon"><i class="pi pi-play-circle"></i></div>
        <span class="nav-label">Instances</span>
      </a>
    </li>

    <li>
      <a class="nav-link" routerLink="/users" routerLinkActive="active">
        <div class="nav-icon"><i class="pi pi-users"></i></div>
        <span class="nav-label">Users</span>
      </a>
    </li>
  </ul>

  <!-- Footer -->
  <div class="footer-area">
    @if (currentUser()) {
      <div class="user-card">
        <div class="user-avatar">{{ initials(currentUser()?.fullName) }}</div>
        <div class="user-info">
          <div class="user-name">{{ currentUser()?.fullName || currentUser()?.username }}</div>
          <div class="user-role-row">
            <div class="role-dot"></div>
            <span class="user-role">{{ currentUser()?.role || 'user' }}</span>
          </div>
        </div>
        <i class="pi pi-chevron-right user-arrow"></i>
      </div>
    }

    <button class="logout-btn" (click)="logout()">
      <i class="pi pi-power-off"></i>
      Disconnect
    </button>

    <div class="version-line">WorkflowStudio // 2026</div>
  </div>
</aside>
  `,
})
export class SidebarComponent {
  currentUser = signal<any>(null);

  constructor(private auth: AuthService) {
    this.currentUser = this.auth.currentUser;
  }

  initials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  logout() {
    this.auth.logout();
  }
}
