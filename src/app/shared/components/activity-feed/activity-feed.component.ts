// src/app/shared/components/activity-feed/activity-feed.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActivityEvent } from '../../models/workflow-instance.model';
import { SignalRService } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, DatePipe],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="activity-list">
      <div
        class="activity-item"
        *ngFor="let ev of events; trackBy: trackById"
        [@fadeIn]>

        <div class="activity-dot" [ngClass]="ev.type">
          {{ dotLabel(ev.type) }}
        </div>
        <div class="activity-line"></div>

        <div class="activity-body">
          <div class="activity-text" [innerHTML]="ev.message"></div>
          <div class="activity-meta">
            <span class="activity-time">{{ ev.occurredAt | date:'HH:mm:ss' }}</span>
            <span class="activity-tag" [ngClass]="ev.type === 'qry' ? 'qry' : 'cmd'">
              {{ ev.tag }}
            </span>
          </div>
        </div>
      </div>

      <div class="empty" *ngIf="events.length === 0">
        Waiting for events…
      </div>
    </div>
  `,
  styles: [`
    .activity-list { padding: 8px 0; max-height: 320px; overflow-y: auto; }
    .activity-item { display:flex; gap:12px; padding:10px 20px; position:relative; transition:background .15s; }
    .activity-item:hover { background: rgba(0,212,255,0.03); }
    .activity-line { position:absolute; left:32px; top:28px; bottom:-8px; width:1px; background:#1e2d45; }
    .activity-item:last-child .activity-line { display:none; }
    .activity-dot {
      width:20px; height:20px; border-radius:50%; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:10px; margin-top:2px; z-index:1; font-weight:700;
    }
    .activity-dot.cmd  { background:rgba(124,58,237,.2); color:#a78bfa; border:1px solid rgba(124,58,237,.4); }
    .activity-dot.qry  { background:rgba(0,212,255,.1);  color:#00d4ff; border:1px solid rgba(0,212,255,.3); }
    .activity-dot.ok   { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.3); }
    .activity-dot.err  { background:rgba(239,68,68,.1);  color:#ef4444; border:1px solid rgba(239,68,68,.3); }
    .activity-dot.warn { background:rgba(245,158,11,.1); color:#f59e0b; border:1px solid rgba(245,158,11,.3); }
    .activity-body { flex:1; min-width:0; }
    .activity-text { font-size:12px; color:#e2e8f0; font-weight:600; line-height:1.4; }
    .activity-meta { display:flex; align-items:center; gap:8px; margin-top:3px; }
    .activity-time { font-family:'Space Mono',monospace; font-size:10px; color:#64748b; }
    .activity-tag  { font-family:'Space Mono',monospace; font-size:9px; padding:1px 6px; border-radius:3px; letter-spacing:.06em; text-transform:uppercase; }
    .activity-tag.cmd { background:rgba(124,58,237,.15); color:#c4b5fd; }
    .activity-tag.qry { background:rgba(0,212,255,.1);   color:#00d4ff; }
    .empty { padding:20px; text-align:center; color:#64748b; font-size:12px; font-family:'Space Mono',monospace; }
  `]
})
export class ActivityFeedComponent implements OnInit, OnDestroy {

  events: ActivityEvent[] = [];
  private sub!: Subscription;
  private readonly MAX_EVENTS = 8;

  constructor(private signalR: SignalRService) {}

  ngOnInit(): void {
    // Merge ALL SignalR streams into a single activity feed
    this.sub = merge(
      this.signalR.onInstanceTransitioned$.pipe(map(e => ({ ...e, type: 'cmd' as const }))),
      this.signalR.onInstanceCompleted$.pipe(map(e =>   ({ ...e, type: 'ok'  as const }))),
      this.signalR.onSlaBreached$.pipe(map(e =>         ({ ...e, type: 'warn' as const }))),
      this.signalR.onTransitionFailed$.pipe(map(e =>    ({ ...e, type: 'err'  as const })))
    ).subscribe(event => {
      this.events.unshift(event);
      if (this.events.length > this.MAX_EVENTS) {
        this.events = this.events.slice(0, this.MAX_EVENTS);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dotLabel(type: string): string {
    return { cmd: 'C', qry: 'Q', ok: '✓', warn: '!', err: '✕' }[type] ?? 'C';
  }

  trackById(_: number, ev: ActivityEvent): string {
    return ev.id;
  }
}