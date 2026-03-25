// src/app/core/services/instance-command.service.ts
// ─── CQRS : COMMAND SIDE (Write) ──────────────────────────────────────────────
// All POST endpoints that mutate state. Each call is logged immutably (Audit Trail).

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkflowInstance } from '../../shared/models/workflow-instance.model';
import { environment } from '../../../environments/environment';

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface StartInstancePayload {
  wfDefinitionId: string;       // ID of the WF definition to instantiate
  initiatedBy: string;          // User/app identity (for Audit Trail)
  payload?: Record<string, any>;// Optional initial context data
}

export interface NextProcessPayload {
  instanceId: string;
  actionCode: string;           // Must match a valid transition from ActualStep
  payload: Record<string, any>; // Data used to evaluate transition conditions
  triggeredBy: string;          // User/app identity (immutably logged)
}

export interface StartInstanceResponse {
  instanceId: string;
  actualStep: string;
  startedAt: Date;
}

export interface NextProcessResponse {
  instanceId: string;
  previousStep: string;
  actualStep: string;
  transitionedAt: Date;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InstanceCommandService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // POST /api/WorkFlowInstances/start
  // Creates a new WF instance. Returns the initial ActualStep.
  startInstance(cmd: StartInstancePayload): Observable<StartInstanceResponse> {
    return this.http.post<StartInstanceResponse>(
      `${this.base}/WorkFlowInstances/start`,
      cmd
    );
  }

  // POST /api/nextProcess
  // Validates the requested ActionCode, evaluates conditions from Payload,
  // and transitions to the next step if allowed.
  nextProcess(cmd: NextProcessPayload): Observable<NextProcessResponse> {
    return this.http.post<NextProcessResponse>(
      `${this.base}/nextProcess`,
      cmd
    );
  }

  // POST /api/WorkFlowInstances/:id/cancel
  cancelInstance(instanceId: string, reason: string): Observable<void> {
    return this.http.post<void>(
      `${this.base}/WorkFlowInstances/${instanceId}/cancel`,
      { reason }
    );
  }
}