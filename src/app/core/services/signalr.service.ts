// src/app/core/services/signalr.service.ts
// ─── REAL-TIME : SignalR Hub ───────────────────────────────────────────────────
// Replaces the setInterval() simulation in the dashboard prototype.
// Install: npm install @microsoft/signalr

import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { ActivityEvent } from '../../shared/models/workflow-instance.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {

  private hub!: signalR.HubConnection;

  // Streams components can subscribe to
  readonly onInstanceTransitioned$ = new Subject<ActivityEvent>();
  readonly onSlaBreached$          = new Subject<ActivityEvent>();
  readonly onInstanceCompleted$    = new Subject<ActivityEvent>();
  readonly onTransitionFailed$     = new Subject<ActivityEvent>();

  isConnected = false;

  async connect(): Promise<void> {
    const hubUrl = '/hubs/workflow';
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('auth_token') ?? ''
      })
      .withAutomaticReconnect()
      .build();

    // ── Hub event listeners ────────────────────────────────────────────────
    this.hub.on('InstanceTransitioned', (event: ActivityEvent) => {
      this.onInstanceTransitioned$.next(event);
    });

    this.hub.on('SlaBreached', (event: ActivityEvent) => {
      this.onSlaBreached$.next(event);
    });

    this.hub.on('InstanceCompleted', (event: ActivityEvent) => {
      this.onInstanceCompleted$.next(event);
    });

    this.hub.on('TransitionFailed', (event: ActivityEvent) => {
      this.onTransitionFailed$.next(event);
    });

    // ── Reconnection logging ───────────────────────────────────────────────
    this.hub.onreconnecting(() => { this.isConnected = false; });
    this.hub.onreconnected(()   => { this.isConnected = true; });
    this.hub.onclose(()         => { this.isConnected = false; });

    await this.hub.start()
      .then(() => {
        this.isConnected = true;
        console.log('[SignalR] Connected to WorkflowHub');
      })
      .catch(err => {
        this.isConnected = false;
        console.error('[SignalR] Connection failed: ', err);
      });
  }

  async disconnect(): Promise<void> {
    if (this.hub) await this.hub.stop();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}