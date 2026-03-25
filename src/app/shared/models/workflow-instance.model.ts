// src/app/shared/models/workflow-instance.model.ts

export type InstanceStatus = 'RUNNING' | 'COMPLETED' | 'LATE' | 'ERROR' | 'PENDING';

export interface WorkflowInstance {
  id: string;                   // e.g. "WFI-0091"
  definitionId: string;
  definitionName: string;       // e.g. "Leave Request"
  category: string;             // e.g. "HR › Annual Leave"
  actualStep: string;           // ActionCode of current step
  status: InstanceStatus;
  progress: number;             // 0–100
  startedAt: Date;
  updatedAt: Date;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  stepsCount: number;
  createdAt: Date;
}

export interface KpiSummary {
  activeInstances: number;
  completedToday: number;
  slaBreached: number;
  definitionsCount: number;
  statusDistribution: StatusDistribution;
}

export interface StatusDistribution {
  running: number;
  completed: number;
  late: number;
  error: number;
}

export interface ActivityEvent {
  id: string;
  type: 'cmd' | 'qry' | 'ok' | 'warn' | 'err';
  tag: 'COMMAND' | 'QUERY';
  message: string;
  instanceId?: string;
  occurredAt: Date;
}

export interface ApiEndpointStat {
  method: 'GET' | 'POST';
  path: string;
  callsPerHour: number;
  avgLatencyMs: number;
}