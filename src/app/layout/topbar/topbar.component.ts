import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header class="topbar">
      <span class="page-title">Workflow Management</span>
      <button (click)="logout()">Logout</button>
    </header>
  `,
  styles: [`
    .topbar { display: flex; justify-content: space-between; align-items: center; padding: 0 1.5rem; height: 56px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
    button { padding: 0.4rem 1rem; background: #ef4444; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
  `]
})
export class TopbarComponent {
  constructor(private auth: AuthService) {}
  logout() { this.auth.logout(); }
}