import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  styles: [`
    :host { display: flex; height: 100vh; overflow: hidden; background: #f4f6fb; }

    .shell-layout {
      display: flex;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }

    .shell-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f4f6fb;
    }

    .shell-content {
      flex: 1;
      overflow-y: auto;
      background: #f4f6fb;
    }
  `],
  template: `
    <div class="shell-layout">
      <app-sidebar />
      <div class="shell-main">
        <div class="shell-content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class ShellComponent {}