// src/app/core/services/instance-query.service.ts
// ─── CQRS : QUERY SIDE (Read) ─────────────────────────────────────────────────
// All GET endpoints. Never mutates state.

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  WorkflowInstance,
  WorkflowDefinition,
  KpiSummary,
  ActivityEvent,
  ApiEndpointStat,
  InstanceStatus
} from '../../shared/models/workflow-instance.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InstanceQueryService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // GET /api/WorkFlowInstances  — list with optional status filter
  getInstances(status?: InstanceStatus): Observable<WorkflowInstance[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<WorkflowInstance[]>(`${this.base}/WorkFlowInstances`, { params });
  }

  // GET /api/WorkFlowInstances/:id/state  — current step for one instance
  getInstanceState(id: string): Observable<WorkflowInstance> {
    return this.http.get<WorkflowInstance>(`${this.base}/WorkFlowInstances/${id}/state`);
  }

  // GET /api/WorkFlowInstances/:id/history  — immutable audit trail
  getInstanceHistory(id: string): Observable<ActivityEvent[]> {
    return this.http.get<ActivityEvent[]>(`${this.base}/WorkFlowInstances/${id}/history`);
  }

  // GET /api/WorkFlowDefinitions
  getDefinitions(): Observable<WorkflowDefinition[]> {
    return this.http.get<WorkflowDefinition[]>(`${this.base}/WorkFlowDefinitions`);
  }

  // GET /api/dashboard/kpi
  getKpiSummary(): Observable<KpiSummary> {
    return this.http.get<KpiSummary>(`${this.base}/dashboard/kpi`);
  }

  // GET /api/dashboard/endpoints
  getEndpointStats(): Observable<ApiEndpointStat[]> {
    return this.http.get<ApiEndpointStat[]>(`${this.base}/dashboard/endpoints`);
  }

  // GET /api/audit/trail
  getAuditTrail(page = 1, size = 20): Observable<ActivityEvent[]> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ActivityEvent[]>(`${this.base}/audit/trail`, { params });
  }
}