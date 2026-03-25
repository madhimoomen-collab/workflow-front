// src/app/shared/components/status-pill/status-pill.component.ts

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstanceStatus } from '../../models/workflow-instance.model';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-pill" [ngClass]="cssClass">
      <span class="dot"></span>
      {{ label }}
    </span>
  `,
  styles: [`
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .running  { background: rgba(0,212,255,0.1);   color: #00d4ff; }
    .running .dot { background: #00d4ff; animation: pulse 2s infinite; }

    .completed { background: rgba(16,185,129,0.1); color: #10b981; }
    .completed .dot { background: #10b981; }

    .late   { background: rgba(245,158,11,0.1);  color: #f59e0b; }
    .late .dot { background: #f59e0b; animation: pulse 1.5s infinite; }

    .error  { background: rgba(239,68,68,0.1);   color: #ef4444; }
    .error .dot { background: #ef4444; }

    .pending { background: rgba(124,58,237,0.1); color: #a78bfa; }
    .pending .dot { background: #a78bfa; }

    @keyframes pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:0.5; transform:scale(1.3); }
    }
  `]
})
export class StatusPillComponent {
  @Input() status!: InstanceStatus;

  get cssClass(): string {
    return this.status.toLowerCase();
  }

  get label(): string {
    const labels: Record<InstanceStatus, string> = {
      RUNNING:   'Running',
      COMPLETED: 'Done',
      LATE:      'Late',
      ERROR:     'Error',
      PENDING:   'Pending'
    };
    return labels[this.status] ?? this.status;
  }
}