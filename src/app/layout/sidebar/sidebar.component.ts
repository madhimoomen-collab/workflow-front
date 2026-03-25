import { Component, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  styles: [`
    :host { display: block; }

    .sidebar {
      width: 240px;
      min-width: 240px;
      height: 100vh;
      background: #1a1f36;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #252b45;
      position: relative;
      z-index: 10;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 22px 20px 18px;
      border-bottom: 1px solid #252b45;
      text-decoration: none;
    }
    .logo-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(99,102,241,.4);
    }
    .logo-text { font-size: 1.05rem; font-weight: 900; color: #f1f2f8; letter-spacing: -.02em; }
    .logo-text span { color: #818cf8; }

    .nav-section { padding: 20px 12px 6px; flex: 1; }
    .nav-label {
      font-size: .58rem; font-weight: 800; letter-spacing: .12em;
      text-transform: uppercase; color: rgba(255,255,255,.2);
      padding: 0 8px; margin-bottom: 6px;
    }
    .nav-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

    .nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      color: rgba(255,255,255,.45); text-decoration: none;
      font-size: .875rem; font-weight: 600;
      transition: all .15s ease; position: relative;
    }
    .nav-link:hover { color: rgba(255,255,255,.85); background: rgba(255,255,255,.07); }
    .nav-link.active { color: #818cf8; background: rgba(99,102,241,.15); }
    .nav-link.active::before {
      content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
      width: 3px; height: 20px; background: #818cf8; border-radius: 0 3px 3px 0;
    }
    .nav-icon {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: .8rem; flex-shrink: 0;
      transition: all .15s; background: rgba(255,255,255,.05);
    }
    .nav-link:hover .nav-icon { background: rgba(255,255,255,.1); }
    .nav-link.active .nav-icon { background: rgba(99,102,241,.25); color: #818cf8; }
    .nav-text { flex: 1; }

    /* Spectator badge shown next to Workflows for non-admins */
    .spectator-badge {
      font-size: .55rem; font-weight: 800; letter-spacing: .06em;
      text-transform: uppercase; padding: 2px 6px; border-radius: 4px;
      background: rgba(245,158,11,.15); color: #f59e0b;
      border: 1px solid rgba(245,158,11,.25);
    }

    .sidebar-footer { border-top: 1px solid #252b45; padding: 14px 12px; }
    .user-card {
      display: flex; align-items: center; gap: 10px;
      padding: 10px; border-radius: 10px;
      background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
      margin-bottom: 8px;
    }
    .user-avatar {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      display: flex; align-items: center; justify-content: center;
      font-size: .72rem; font-weight: 800; color: #fff; flex-shrink: 0;
    }
    .user-info { flex: 1; min-width: 0; }
    .user-name {
      font-size: .82rem; font-weight: 700; color: rgba(255,255,255,.85);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .user-role {
      font-size: .68rem; color: rgba(255,255,255,.3); font-weight: 600;
      text-transform: uppercase; letter-spacing: .05em; margin-top: 1px;
    }
    /* Role pill colour */
    .role-admin   { color: #818cf8 !important; }
    .role-other   { color: #f59e0b !important; }

    .logout-btn {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 9px 12px; border-radius: 9px;
      background: transparent; border: 1px solid rgba(239,68,68,.2);
      color: rgba(239,68,68,.6); font: 600 .82rem inherit;
      cursor: pointer; transition: all .15s;
    }
    .logout-btn:hover { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.45); color: #ef4444; }
    .logout-btn i { font-size: .8rem; }
    .version-tag {
      text-align: center; font-size: .6rem; color: rgba(255,255,255,.12);
      font-weight: 600; letter-spacing: .08em; padding-top: 8px;
    }
  `],
  template: `
    <aside class="sidebar">

      <!-- Logo -->
      <a class="sidebar-logo" routerLink="/workflows">
        <div class="logo-icon">🔷</div>
        <div class="logo-text">Workflow<span>Studio</span></div>
      </a>

      <!-- Navigation -->
      <div class="nav-section">
        <div class="nav-label">Navigation</div>
        <ul class="nav-list">

          <!-- Workflows — visible to everyone -->
          <li>
            <a class="nav-link" routerLink="/workflows" routerLinkActive="active">
              <div class="nav-icon"><i class="pi pi-sitemap"></i></div>
              <span class="nav-text">Workflows</span>
              @if (!isAdmin()) {
                <span class="spectator-badge">Lecture</span>
              }
            </a>
          </li>

          <!-- Instances — admin only -->
          @if (isAdmin()) {
            <li>
              <a class="nav-link" routerLink="/instances" routerLinkActive="active">
                <div class="nav-icon"><i class="pi pi-play-circle"></i></div>
                <span class="nav-text">Instances</span>
              </a>
            </li>
          }

          <!-- Users — visible to everyone (non-admin sees profile/password only) -->
          <li>
            <a class="nav-link" routerLink="/users" routerLinkActive="active">
              <div class="nav-icon"><i class="pi pi-users"></i></div>
              <span class="nav-text">{{ isAdmin() ? 'Utilisateurs' : 'Mon profil' }}</span>
            </a>
          </li>

        </ul>
      </div>

      <!-- Footer -->
      <div class="sidebar-footer">
        @if (currentUser()) {
          <div class="user-card">
            <div class="user-avatar">{{ initials(currentUser()?.fullName) }}</div>
            <div class="user-info">
              <div class="user-name">{{ currentUser()?.fullName || currentUser()?.username }}</div>
              <div class="user-role"
                   [class.role-admin]="isAdmin()"
                   [class.role-other]="!isAdmin()">
                {{ currentUser()?.role || 'user' }}
              </div>
            </div>
          </div>
        }
        <button class="logout-btn" (click)="logout()">
          <i class="pi pi-sign-out"></i> Déconnexion
        </button>
        <div class="version-tag">WorkflowStudio v1.0</div>
      </div>

    </aside>
  `,
})
export class SidebarComponent {
  currentUser = signal<any>(null);
  isAdmin;

  constructor(private auth: AuthService) {
    this.currentUser = this.auth.currentUser;
    this.isAdmin = this.auth.isAdmin;
  }

  initials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  logout() { this.auth.logout(); }
}