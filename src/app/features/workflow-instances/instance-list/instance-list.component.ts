// src/app/features/workflow-instances/instance-list/instance-list.component.ts

import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { FormsModule, ReactiveFormsModule,
         FormBuilder, FormGroup, Validators }  from '@angular/forms';
import { RouterModule }                        from '@angular/router';
import { HttpClient }                          from '@angular/common/http';
import { forkJoin, of, Subscription }          from 'rxjs';
import { catchError }                          from 'rxjs/operators';

import { TableModule }         from 'primeng/table';
import { DialogModule }        from 'primeng/dialog';
import { ButtonModule }        from 'primeng/button';
import { InputTextModule }     from 'primeng/inputtext';
import { SelectModule }        from 'primeng/select';
import { TagModule }           from 'primeng/tag';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { IconFieldModule }     from 'primeng/iconfield';
import { InputIconModule }     from 'primeng/inputicon';
import { BadgeModule }         from 'primeng/badge';
import { TimelineModule }      from 'primeng/timeline';
import { DividerModule }       from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';

import { environment }  from '../../../../environments/environment';
import { AuthService }  from '../../../core/auth/auth.service';
import { SignalRService } from '../../../core/services/signalr.service';

// ── Domain interfaces ────────────────────────────────────────────────────────

interface WorkFlowDefinitionDto {
  id: string;
  name: string;
  version: number;
  createdAt?: string;
}

interface NodeDto {
  id: string;
  name: string;
  type: string;
  description?: string;
  roleReq?: string;
  workFlowDefinitionId: string;
}

interface EdgeDto {
  id: string;
  name?: string;
  condition?: string;
  nodeId: string;
  targetId: string;
  targetNode?: NodeDto;
}

interface WorkFlowInstanceDto {
  id: string;
  workFlowDefinitionId: string;
  nodeId: string;
  status: string;
  completedAt?: string;
  initiatedBy: string;
  currentNode?: NodeDto;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkFlowInstanceHistoryDto {
  id: string;
  workFlowInstanceId: string;
  fromNodeId: string;
  toNodeId: string;
  fromNode?: NodeDto;
  toNode?: NodeDto;
  comment?: string;
  transitionedAt: string;
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; icon: string; cls: string; color: string; bg: string }> = {
  Pending:    { label: 'En attente',    icon: 'pi-clock',          cls: 'pending',    color: '#a78bfa', bg: 'rgba(124,58,237,.1)' },
  InProgress: { label: 'En cours',      icon: 'pi-spin pi-spinner', cls: 'running',    color: '#00d4ff', bg: 'rgba(0,212,255,.1)' },
  Completed:  { label: 'Terminé',       icon: 'pi-check-circle',   cls: 'completed',  color: '#10b981', bg: 'rgba(16,185,129,.1)' },
  Cancelled:  { label: 'Annulé',        icon: 'pi-times-circle',   cls: 'cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
};

const nodeTypeIcon: Record<string, string> = {
  START:    '▶',
  TASK:     '⚙',
  DECISION: '◆',
  END:      '■',
};
const nodeTypeColor: Record<string, string> = {
  START:    '#10b981',
  TASK:     '#6366f1',
  DECISION: '#f59e0b',
  END:      '#ef4444',
};

@Component({
  selector: 'app-instance-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    TableModule, DialogModule, ButtonModule, InputTextModule,
    SelectModule, TagModule, ToastModule, ConfirmDialogModule,
    SkeletonModule, TooltipModule, IconFieldModule, InputIconModule,
    BadgeModule, TimelineModule, DividerModule,
  ],
  providers: [MessageService, ConfirmationService],
  styles: [`
    :host { display: block; }

    /* ── PrimeNG table overrides ────────────────────────────────────────── */
    ::ng-deep .inst-table .p-datatable-thead > tr > th {
      background: #f9fafc; border-color: var(--color-border);
      font-size: .68rem; font-weight: 800; letter-spacing: .07em;
      text-transform: uppercase; color: var(--color-muted); padding: 10px 16px;
    }
    ::ng-deep .inst-table .p-datatable-tbody > tr:hover { background: #f5f3ff !important; }
    ::ng-deep .inst-table .p-datatable-tbody > tr > td  { border-color: var(--color-border); padding: 12px 16px; font-size: .87rem; }
    ::ng-deep .inst-table .p-paginator { border-top: 1px solid var(--color-border); background: #f9fafc; padding: 7px 14px; }
    ::ng-deep .inst-dialog .p-dialog       { border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-lg); }
    ::ng-deep .inst-dialog .p-dialog-header { background: var(--color-dark); color: #fff; padding: 14px 18px; }
    ::ng-deep .inst-dialog .p-dialog-title  { font-weight: 800; font-size: 1rem; }
    ::ng-deep .inst-dialog .p-dialog-header-icon { color: rgba(255,255,255,.5) !important; }
    ::ng-deep .inst-dialog .p-dialog-content { padding: 20px; }
    ::ng-deep .inst-dialog .p-dialog-footer { border-top: 1px solid var(--color-border); padding: 12px 18px; display:flex; justify-content:flex-end; gap:8px; }
    ::ng-deep .inst-dialog .p-dropdown { width:100%; border-radius:8px; border-color: var(--color-border); }
    ::ng-deep .inst-search .p-inputtext { border-radius: 8px; border-color: var(--color-border); font-size: .83rem; padding: 6px 10px 6px 30px; width: 220px; }

    /* ── Status pill ────────────────────────────────────────────────────── */
    .status-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 20px;
      font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
      white-space: nowrap;
    }
    .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .status-pill.pending    { background: rgba(124,58,237,.1);  color: #a78bfa; }
    .status-pill.pending  .dot { background: #a78bfa; }
    .status-pill.running    { background: rgba(0,212,255,.1);   color: #00d4ff; }
    .status-pill.running  .dot { background: #00d4ff; animation: pulse 2s infinite; }
    .status-pill.completed  { background: rgba(16,185,129,.1);  color: #10b981; }
    .status-pill.completed .dot { background: #10b981; }
    .status-pill.cancelled  { background: rgba(239,68,68,.1);   color: #ef4444; }
    .status-pill.cancelled .dot { background: #ef4444; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(1.3);} }

    /* ── Node badge ─────────────────────────────────────────────────────── */
    .node-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 8px;
      font-size: .75rem; font-weight: 700;
    }
    .node-icon { font-size: .8rem; }

    /* ── History timeline ──────────────────────────────────────────────── */
    .history-panel { max-height: 460px; overflow-y: auto; padding: 0 4px; }
    .hist-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid var(--color-border);
    }
    .hist-item:last-child { border-bottom: none; }
    .hist-dot {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: .72rem; font-weight: 800;
    }
    .hist-content { flex: 1; }
    .hist-title { font-size: .84rem; font-weight: 700; color: var(--color-dark); }
    .hist-sub   { font-size: .75rem; color: var(--color-muted); margin-top: 2px; }
    .hist-time  { font-size: .68rem; color: var(--color-muted2); font-family: monospace; margin-top: 3px; }
    .hist-arrow { color: var(--color-muted); font-size: .8rem; margin: 0 2px; }

    /* ── Advance dialog ─────────────────────────────────────────────────── */
    .edge-list { display: flex; flex-direction: column; gap: 8px; }
    .edge-option {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border: 1.5px solid var(--color-border);
      border-radius: 10px; cursor: pointer; transition: all .15s;
      background: var(--color-surface);
    }
    .edge-option:hover { border-color: var(--color-accent); background: #f5f3ff; }
    .edge-option.selected { border-color: var(--color-accent); background: var(--color-accent-dim); }
    .edge-opt-icon {
      width: 36px; height: 36px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: .9rem; flex-shrink: 0;
    }
    .edge-opt-name  { font-size: .9rem; font-weight: 700; color: var(--color-dark); }
    .edge-opt-cond  { font-size: .72rem; color: var(--color-muted); font-family: monospace; }
    .edge-opt-tgt   { font-size: .73rem; color: var(--color-muted2); margin-top: 2px; }

    /* ── WF Definition select card ─────────────────────────────────────── */
    .def-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border: 1.5px solid var(--color-border);
      border-radius: 10px; cursor: pointer; transition: all .15s;
      margin-bottom: 8px; background: var(--color-surface);
    }
    .def-card:hover { border-color: var(--color-accent); background: #f5f3ff; }
    .def-card.selected { border-color: var(--color-accent); background: var(--color-accent-dim); }
    .def-ico {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, var(--color-accent), var(--color-accent-g));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: .9rem; flex-shrink: 0;
    }
    .def-name    { font-size: .92rem; font-weight: 700; color: var(--color-dark); }
    .def-version { font-size: .72rem; color: var(--color-muted); margin-top: 1px; }

    /* ── Filter chips ───────────────────────────────────────────────────── */
    .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
    .chip {
      padding: 5px 14px; border-radius: 20px; font-size: .75rem; font-weight: 700;
      border: 1.5px solid var(--color-border); background: var(--color-surface);
      color: var(--color-muted); cursor: pointer; transition: all .15s;
    }
    .chip:hover { border-color: var(--color-accent); color: var(--color-accent); }
    .chip.active { border-color: var(--color-accent); background: var(--color-accent-dim); color: var(--color-accent); }

    /* ── Instance ID ────────────────────────────────────────────────────── */
    .inst-id {
      font-family: monospace; font-size: .78rem;
      color: var(--color-accent); font-weight: 700;
    }

    /* ── Progress bar ───────────────────────────────────────────────────── */
    .progress-wrap { width: 80px; }
    .progress-bar  { height: 4px; border-radius: 2px; background: var(--color-border); overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 2px; transition: width .4s ease; }
    .progress-pct  { font-size: .65rem; color: var(--color-muted); margin-top: 2px; text-align: right; }

    /* ── Empty state ────────────────────────────────────────────────────── */
    .empty-state { text-align: center; padding: 3rem 1rem; }
    .empty-ico   { font-size: 3rem; margin-bottom: 8px; }
    .empty-title { font-size: 1rem; font-weight: 700; color: var(--color-dark); margin: 0 0 4px; }
    .empty-sub   { font-size: .82rem; color: var(--color-muted); }

    /* ── Initiator cell ─────────────────────────────────────────────────── */
    .initiator-cell { display: flex; align-items: center; gap: 8px; }
    .init-avatar {
      width: 28px; height: 28px; border-radius: 7px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: #fff; font-size: .65rem; font-weight: 800;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .init-name { font-size: .83rem; font-weight: 600; color: var(--color-dark); }
  `],
  template: `
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<p-toast position="top-right" />
<p-confirmDialog styleClass="inst-dialog" />

<div class="page">

  <!-- ── Page header ─────────────────────────────────────────────────────── -->
  <div class="page-header">
    <div>
      <div class="page-breadcrumb">Système <span class="sep">›</span> <span class="current">Instances</span></div>
      <h1 class="page-title">Instances de Workflow</h1>
      <p class="page-subtitle">Suivi en temps réel de l'exécution des processus métier.</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <button class="btn-ghost" (click)="loadAll()" [disabled]="loading()">
        <i class="pi pi-refresh" [class.pi-spin]="loading()"></i> Actualiser
      </button>
      @if (auth.isAdmin()) {
        <button class="btn-primary" (click)="openStartDialog()">
          <i class="pi pi-play-circle"></i> Démarrer une instance
        </button>
      }
    </div>
  </div>

  <!-- ── KPI strip ─────────────────────────────────────────────────────────── -->
  <div class="stats-bar">
    <div class="stat-card">
      <div class="stat-icon violet"><i class="pi pi-list"></i></div>
      <div>
        <div class="stat-value">{{ instances().length }}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue"><i class="pi pi-spin pi-spinner"></i></div>
      <div>
        <div class="stat-value">{{ countByStatus('InProgress') }}</div>
        <div class="stat-label">En cours</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i class="pi pi-check-circle"></i></div>
      <div>
        <div class="stat-value">{{ countByStatus('Completed') }}</div>
        <div class="stat-label">Terminées</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber"><i class="pi pi-clock"></i></div>
      <div>
        <div class="stat-value">{{ countByStatus('Pending') }}</div>
        <div class="stat-label">En attente</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red"><i class="pi pi-times-circle"></i></div>
      <div>
        <div class="stat-value">{{ countByStatus('Cancelled') }}</div>
        <div class="stat-label">Annulées</div>
      </div>
    </div>
  </div>

  <!-- ── Filter chips ──────────────────────────────────────────────────────── -->
  <div class="filter-chips">
    <span class="chip" [class.active]="!activeFilter()" (click)="setFilter(null)">Tous</span>
    <span class="chip" [class.active]="activeFilter()==='Pending'"    (click)="setFilter('Pending')">⏳ En attente</span>
    <span class="chip" [class.active]="activeFilter()==='InProgress'" (click)="setFilter('InProgress')">▶ En cours</span>
    <span class="chip" [class.active]="activeFilter()==='Completed'"  (click)="setFilter('Completed')">✓ Terminées</span>
    <span class="chip" [class.active]="activeFilter()==='Cancelled'"  (click)="setFilter('Cancelled')">✕ Annulées</span>
  </div>

  <!-- ── Main table card ───────────────────────────────────────────────────── -->
  <div class="card">
    <div class="card-toolbar">
      <span class="card-section-label">{{ filteredInstances().length }} instance{{ filteredInstances().length !== 1 ? 's' : '' }}</span>
      <p-iconfield styleClass="inst-search">
        <p-inputicon styleClass="pi pi-search"/>
        <input pInputText [(ngModel)]="searchTerm" (input)="onSearch()" placeholder="Rechercher…"/>
      </p-iconfield>
    </div>

    <!-- Skeleton loading -->
    @if (loading()) {
      <p-table [value]="[1,2,3,4,5]" styleClass="inst-table p-datatable-sm">
        <ng-template pTemplate="header">
          <tr><th>ID</th><th>Workflow</th><th>Étape courante</th><th>Statut</th><th>Lancé par</th><th>Créé le</th><th style="width:140px"></th></tr>
        </ng-template>
        <ng-template pTemplate="body">
          <tr><td><p-skeleton width="110px" height="18px" borderRadius="5px"/></td><td><p-skeleton height="34px" borderRadius="8px"/></td><td><p-skeleton width="100px" height="26px" borderRadius="8px"/></td><td><p-skeleton width="90px" height="22px" borderRadius="20px"/></td><td><p-skeleton width="110px" height="18px" borderRadius="5px"/></td><td><p-skeleton width="90px" height="16px" borderRadius="5px"/></td><td><p-skeleton width="120px" height="30px" borderRadius="7px"/></td></tr>
        </ng-template>
      </p-table>
    }

    <!-- Data table -->
    @if (!loading()) {
      <p-table
        [value]="filteredInstances()"
        styleClass="inst-table p-datatable-sm"
        [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10,20,50]"
        [showCurrentPageReport]="true" currentPageReportTemplate="{first}–{last} sur {totalRecords}"
        [sortMode]="'multiple'" [rowHover]="true" dataKey="id">

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="id">ID <p-sortIcon field="id"/></th>
            <th>Workflow</th>
            <th>Étape courante</th>
            <th pSortableColumn="status">Statut <p-sortIcon field="status"/></th>
            <th>Lancé par</th>
            <th pSortableColumn="createdAt">Créé le <p-sortIcon field="createdAt"/></th>
            <th style="width:160px;text-align:right">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-inst>
          <tr>
            <!-- ID -->
            <td>
              <span class="inst-id">#{{ (inst.id || '').slice(0,8) }}…</span>
            </td>

            <!-- Workflow definition -->
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="def-ico" style="width:28px;height:28px;border-radius:6px;font-size:.7rem">🔷</div>
                <div>
                  <div style="font-weight:700;font-size:.87rem;color:var(--color-dark)">{{ getDefName(inst.workFlowDefinitionId) }}</div>
                  <div style="font-size:.68rem;color:var(--color-muted);font-family:monospace">{{ (inst.workFlowDefinitionId||'').slice(0,8) }}…</div>
                </div>
              </div>
            </td>

            <!-- Current node -->
            <td>
              @if (inst.currentNode) {
                <span class="node-badge"
                      [style.background]="nodeTypeColor[inst.currentNode.type?.toUpperCase()] + '22'"
                      [style.color]="nodeTypeColor[inst.currentNode.type?.toUpperCase()]">
                  <span class="node-icon">{{ nodeTypeIcon[inst.currentNode.type?.toUpperCase()] || '⚙' }}</span>
                  {{ inst.currentNode.name }}
                </span>
              } @else {
                <span style="color:var(--color-muted);font-size:.8rem">—</span>
              }
            </td>

            <!-- Status -->
            <td>
              <span class="status-pill" [ngClass]="statusCls(inst.status)">
                <span class="dot"></span>
                {{ statusLabel(inst.status) }}
              </span>
            </td>

            <!-- Initiator -->
            <td>
              <div class="initiator-cell">
                <div class="init-avatar">{{ initials(inst.initiatedBy) }}</div>
                <span class="init-name">{{ inst.initiatedBy || '—' }}</span>
              </div>
            </td>

            <!-- Date -->
            <td style="font-size:.78rem;color:var(--color-muted)">
              {{ inst.createdAt | date:'dd MMM yyyy HH:mm' }}
            </td>

            <!-- Actions -->
            <td>
              <div class="actions-cell">
                <!-- History -->
                <button class="act-btn edit" title="Voir l'historique" (click)="openHistory(inst)">
                  <i class="pi pi-history"></i>
                </button>

                @if (auth.isAdmin()) {
                  <!-- Start (only pending) -->
                  @if (inst.status === 'Pending') {
                    <button class="act-btn role" title="Démarrer" (click)="startInstance(inst)">
                      <i class="pi pi-play"></i>
                    </button>
                  }

                  <!-- Advance (only InProgress) -->
                  @if (inst.status === 'InProgress') {
                    <button class="act-btn design" title="Avancer (nextProcess)" (click)="openAdvanceDialog(inst)">
                      <i class="pi pi-step-forward"></i>
                    </button>
                  }

                  <!-- Cancel -->
                  @if (inst.status !== 'Completed' && inst.status !== 'Cancelled') {
                    <button class="act-btn delete" title="Annuler" (click)="confirmCancel(inst)">
                      <i class="pi pi-ban"></i>
                    </button>
                  }
                }
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="empty-state">
              <div class="empty-ico">🔷</div>
              <p class="empty-title">Aucune instance trouvée</p>
              <p class="empty-sub">
                @if (searchTerm || activeFilter()) { Aucun résultat pour le filtre actuel. }
                @else { Démarrez votre première instance de workflow. }
              </p>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>

</div>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- DIALOG: Start new instance                                                 -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
<p-dialog [(visible)]="startDialogVisible" [modal]="true" [style]="{width:'500px'}"
          [draggable]="false" styleClass="inst-dialog">
  <ng-template pTemplate="header">
    <span><i class="pi pi-play-circle" style="margin-right:7px"></i> Démarrer une instance</span>
  </ng-template>

  <form [formGroup]="startForm">

    <!-- Workflow definition select -->
    <div class="form-group">
      <label class="form-label">Définition de workflow *</label>
      @if (definitions().length === 0) {
        <div style="font-size:.82rem;color:var(--color-muted);padding:10px;border:1px dashed var(--color-border);border-radius:8px;text-align:center">
          <i class="pi pi-inbox" style="margin-right:5px"></i>Aucune définition disponible.
        </div>
      }
      @for (def of definitions(); track def.id) {
        <div class="def-card" [class.selected]="startForm.get('wfDefId')?.value === def.id"
             (click)="startForm.get('wfDefId')?.setValue(def.id)">
          <div class="def-ico"><i class="pi pi-sitemap"></i></div>
          <div style="flex:1">
            <div class="def-name">{{ def.name }}</div>
            <div class="def-version">Version {{ def.version?.toFixed(1) }}</div>
          </div>
          @if (startForm.get('wfDefId')?.value === def.id) {
            <i class="pi pi-check-circle" style="color:var(--color-accent);font-size:1.1rem"></i>
          }
        </div>
      }
      @if (startForm.get('wfDefId')?.invalid && startForm.get('wfDefId')?.touched) {
        <div class="field-err">Veuillez sélectionner une définition.</div>
      }
    </div>

    <!-- Initiated by -->
    <div class="form-group">
      <label class="form-label">Lancé par *</label>
      <input class="form-input" formControlName="initiatedBy" placeholder="ex: jdupont, système, API…"/>
      @if (startForm.get('initiatedBy')?.invalid && startForm.get('initiatedBy')?.touched) {
        <div class="field-err">Champ requis.</div>
      }
    </div>

  </form>

  <ng-template pTemplate="footer">
    <button class="btn-ghost" (click)="startDialogVisible = false">Annuler</button>
    <button class="btn-primary" (click)="submitStartInstance()" [disabled]="saving()">
      <i class="pi" [class.pi-play]="!saving()" [class.pi-spinner]="saving()" [class.pi-spin]="saving()"></i>
      {{ saving() ? 'Démarrage…' : 'Démarrer' }}
    </button>
  </ng-template>
</p-dialog>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- DIALOG: Advance instance (nextProcess)                                     -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
<p-dialog [(visible)]="advanceDialogVisible" [modal]="true" [style]="{width:'480px'}"
          [draggable]="false" styleClass="inst-dialog">
  <ng-template pTemplate="header">
    <span><i class="pi pi-step-forward" style="margin-right:7px"></i> Avancer l'instance</span>
  </ng-template>

  @if (selectedInstance()) {
    <!-- Current state recap -->
    <div style="background:#f9fafc;border-radius:10px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--color-border)">
      <div style="font-size:.68rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--color-muted);margin-bottom:8px">Étape actuelle</div>
      @if (selectedInstance()?.currentNode) {
        <span class="node-badge"
              [style.background]="nodeTypeColor[selectedInstance()!.currentNode!.type?.toUpperCase() || 'TASK'] + '22'"
              [style.color]="nodeTypeColor[selectedInstance()!.currentNode!.type?.toUpperCase() || 'TASK']">
          <span class="node-icon">{{ nodeTypeIcon[selectedInstance()!.currentNode!.type?.toUpperCase() || 'TASK'] || '⚙' }}</span>
          {{ selectedInstance()?.currentNode?.name }}
        </span>
      }
      @if (selectedInstance()?.currentNode?.description) {
        <div style="font-size:.75rem;color:var(--color-muted);margin-top:6px">{{ selectedInstance()?.currentNode?.description }}</div>
      }
      @if (selectedInstance()?.currentNode?.roleReq) {
        <div style="margin-top:6px;font-size:.72rem"><span style="font-weight:700;color:var(--color-dark)">Rôle requis : </span><span style="color:var(--color-accent)">{{ selectedInstance()?.currentNode?.roleReq }}</span></div>
      }
    </div>

    <!-- Outgoing edges -->
    <div class="form-group">
      <label class="form-label">Choisissez la transition *</label>
      @if (loadingEdges()) {
        <div style="text-align:center;padding:20px"><i class="pi pi-spinner pi-spin" style="font-size:1.5rem;color:var(--color-accent)"></i></div>
      } @else if (outgoingEdges().length === 0) {
        <div style="text-align:center;padding:16px;font-size:.83rem;color:var(--color-muted);border:1px dashed var(--color-border);border-radius:8px">
          <i class="pi pi-exclamation-triangle" style="margin-right:5px;color:var(--color-warn)"></i>
          Aucune transition disponible depuis cette étape.
        </div>
      } @else {
        <div class="edge-list">
          @for (edge of outgoingEdges(); track edge.id) {
            <div class="edge-option" [class.selected]="selectedEdgeId() === edge.id"
                 (click)="selectedEdgeId.set(edge.id)">
              <div class="edge-opt-icon"
                   [style.background]="(nodeTypeColor[edge.targetNode?.type?.toUpperCase() ?? 'TASK'] ?? '#6366f1') + '22'"
                   [style.color]="nodeTypeColor[edge.targetNode?.type?.toUpperCase() ?? 'TASK'] ?? '#6366f1'">
                {{ nodeTypeIcon[edge.targetNode?.type?.toUpperCase() ?? 'TASK'] || '⚙' }}
              </div>
              <div style="flex:1">
                <div class="edge-opt-name">{{ edge.name || 'Transition sans nom' }}</div>
                @if (edge.targetNode) {
                  <div class="edge-opt-tgt">→ {{ edge.targetNode.name }}</div>
                }
                @if (edge.condition) {
                  <div class="edge-opt-cond">{{ edge.condition }}</div>
                }
              </div>
              @if (selectedEdgeId() === edge.id) {
                <i class="pi pi-check-circle" style="color:var(--color-accent);font-size:1rem"></i>
              }
            </div>
          }
        </div>
      }
    </div>
  }

  <ng-template pTemplate="footer">
    <button class="btn-ghost" (click)="advanceDialogVisible = false">Annuler</button>
    <button class="btn-primary" (click)="submitAdvance()"
            [disabled]="!selectedEdgeId() || saving() || loadingEdges()">
      <i class="pi" [class.pi-step-forward]="!saving()" [class.pi-spinner]="saving()" [class.pi-spin]="saving()"></i>
      {{ saving() ? 'Transition…' : 'Confirmer la transition' }}
    </button>
  </ng-template>
</p-dialog>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- DIALOG: History / Audit trail                                              -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->
<p-dialog [(visible)]="historyDialogVisible" [modal]="true" [style]="{width:'520px'}"
          [draggable]="false" styleClass="inst-dialog">
  <ng-template pTemplate="header">
    <span><i class="pi pi-history" style="margin-right:7px"></i> Historique de l'instance</span>
  </ng-template>

  @if (selectedInstance()) {
    <!-- Instance recap header -->
    <div style="background:#f9fafc;border-radius:10px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--color-border);display:flex;gap:14px;align-items:center">
      <div>
        <div style="font-size:.68rem;font-weight:800;color:var(--color-muted);text-transform:uppercase;letter-spacing:.07em">Workflow</div>
        <div style="font-weight:700;color:var(--color-dark);margin-top:2px">{{ getDefName(selectedInstance()!.workFlowDefinitionId) }}</div>
      </div>
      <div style="margin-left:auto">
        <span class="status-pill" [ngClass]="statusCls(selectedInstance()!.status)">
          <span class="dot"></span>{{ statusLabel(selectedInstance()!.status) }}
        </span>
      </div>
    </div>

    <!-- Timeline -->
    @if (loadingHistory()) {
      <div style="text-align:center;padding:30px"><i class="pi pi-spinner pi-spin" style="font-size:1.5rem;color:var(--color-accent)"></i></div>
    } @else if (history().length === 0) {
      <div style="text-align:center;padding:24px;font-size:.85rem;color:var(--color-muted)">
        <i class="pi pi-inbox" style="font-size:2rem;display:block;margin-bottom:8px;opacity:.4"></i>
        Aucune transition enregistrée.
      </div>
    } @else {
      <div class="history-panel">
        @for (h of history(); track h.id; let i = $index; let last = $last) {
          <div class="hist-item">
            <div class="hist-dot"
                 [style.background]="nodeTypeColor[h.toNode?.type?.toUpperCase() ?? 'TASK'] + '22'"
                 [style.color]="nodeTypeColor[h.toNode?.type?.toUpperCase() ?? 'TASK']">
              {{ i + 1 }}
            </div>
            <div class="hist-content">
              <div class="hist-title">
                <span>{{ h.fromNode?.name || 'Étape inconnue' }}</span>
                <span class="hist-arrow">→</span>
                <span>{{ h.toNode?.name || 'Étape inconnue' }}</span>
              </div>
              @if (h.fromNode?.type || h.toNode?.type) {
                <div class="hist-sub">
                  {{ h.fromNode?.type || '?' }} → {{ h.toNode?.type || '?' }}
                </div>
              }
              @if (h.comment) {
                <div style="font-size:.75rem;color:var(--color-muted);margin-top:3px;font-style:italic">"{{ h.comment }}"</div>
              }
              <div class="hist-time">{{ h.transitionedAt | date:'dd MMM yyyy HH:mm:ss' }}</div>
            </div>
          </div>
        }
      </div>
    }
  }

  <ng-template pTemplate="footer">
    <button class="btn-ghost" (click)="historyDialogVisible = false">Fermer</button>
  </ng-template>
</p-dialog>
  `,
})
export class InstanceListComponent implements OnInit, OnDestroy {
  private http  = inject(HttpClient);
  auth  = inject(AuthService);
  private fb    = inject(FormBuilder);
  private msg   = inject(MessageService);
  private conf  = inject(ConfirmationService);
  private signalR = inject(SignalRService);
  private base  = environment.apiUrl;
  private subs: Subscription[] = [];

  // ── Public helpers (used in template) ──────────────────────────────────────
  readonly nodeTypeIcon  = nodeTypeIcon;
  readonly nodeTypeColor = nodeTypeColor;

  // ── State ──────────────────────────────────────────────────────────────────
  instances    = signal<WorkFlowInstanceDto[]>([]);
  definitions  = signal<WorkFlowDefinitionDto[]>([]);
  history      = signal<WorkFlowInstanceHistoryDto[]>([]);
  outgoingEdges = signal<EdgeDto[]>([]);

  loading        = signal(true);
  saving         = signal(false);
  loadingHistory = signal(false);
  loadingEdges   = signal(false);

  activeFilter  = signal<string | null>(null);
  searchTerm    = '';

  // Dialog visibility
  startDialogVisible   = false;
  advanceDialogVisible = false;
  historyDialogVisible = false;

  selectedInstance = signal<WorkFlowInstanceDto | null>(null);
  selectedEdgeId   = signal<string | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  filteredInstances = computed(() => {
    let list = this.instances();
    const f  = this.activeFilter();
    if (f)               list = list.filter(i => i.status === f);
    const t = this.searchTerm.toLowerCase();
    if (t) list = list.filter(i =>
      i.id.toLowerCase().includes(t) ||
      i.initiatedBy.toLowerCase().includes(t) ||
      (i.currentNode?.name || '').toLowerCase().includes(t) ||
      this.getDefName(i.workFlowDefinitionId).toLowerCase().includes(t)
    );
    return list;
  });

  // ── Forms ──────────────────────────────────────────────────────────────────
  startForm!: FormGroup;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    this.startForm = this.fb.group({
      wfDefId:     ['', Validators.required],
      initiatedBy: [this.auth.currentUser()?.fullName || this.auth.currentUser()?.username || '', Validators.required],
    });
    this.loadAll();
    this.connectRealTime();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.signalR.disconnect();
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  loadAll() {
    this.loading.set(true);
    forkJoin({
      instances:   this.http.get<WorkFlowInstanceDto[]>(`${this.base}/WorkFlowInstances`),
      definitions: this.http.get<WorkFlowDefinitionDto[]>(`${this.base}/WorkFlowDefinitions`),
    }).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données.' });
        return of({ instances: [], definitions: [] });
      })
    ).subscribe(({ instances, definitions }) => {
      this.instances.set(instances);
      this.definitions.set(definitions);
      this.loading.set(false);
    });
  }

  // ── Filter / search ────────────────────────────────────────────────────────
  setFilter(f: string | null) { this.activeFilter.set(f); }
  onSearch() {}

  // ── Counts ─────────────────────────────────────────────────────────────────
  countByStatus(s: string): number { return this.instances().filter(i => i.status === s).length; }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getDefName(id: string): string {
    return this.definitions().find(d => d.id === id)?.name || '—';
  }

  statusCls(s: string): string {
    const map: Record<string, string> = {
      Pending: 'pending', InProgress: 'running', Completed: 'completed', Cancelled: 'cancelled'
    };
    return map[s] ?? 'pending';
  }

  statusLabel(s: string): string { return STATUS_CFG[s]?.label ?? s; }

  initials(name?: string): string {
    if (!name) return '?';
    return name.split(/[\s._@-]/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  // ── START DIALOG ───────────────────────────────────────────────────────────
  openStartDialog() {
    this.startForm.reset({
      wfDefId:     '',
      initiatedBy: this.auth.currentUser()?.fullName || this.auth.currentUser()?.username || '',
    });
    this.startDialogVisible = true;
  }

  submitStartInstance() {
    this.startForm.markAllAsTouched();
    if (this.startForm.invalid) return;
    this.saving.set(true);

    const { wfDefId, initiatedBy } = this.startForm.value;

    // 1️⃣ Fetch nodes to find the START node (required for non-nullable FK)
    this.http.get<NodeDto[]>(`${this.base}/WorkFlowDefinitions/${wfDefId}/nodes`).subscribe({
      next: (nodes) => {
        const startNode = nodes.find(n => n.type?.toUpperCase() === 'START');

        if (!startNode) {
          this.msg.add({
            severity: 'warn',
            summary: 'Aucun nœud de départ',
            detail: 'Ce workflow ne possède pas de nœud de type START. Ajoutez-en un dans le designer.',
            life: 7000,
          });
          this.saving.set(false);
          return;
        }

        // 2️⃣ Create instance — do NOT send status (backend sets it to Pending automatically)
        const createPayload = {
          workFlowDefinitionId: wfDefId,
          nodeId:               startNode.id,
          initiatedBy:          initiatedBy,
        };

        console.log('[Instances] Creating instance with payload:', createPayload);

        this.http.post<any>(`${this.base}/WorkFlowInstances`, createPayload).subscribe({
          next: (created) => {
            console.log('[Instances] Create response:', created);

            // Handle both camelCase (id) and PascalCase (Id) from backend
            const createdId: string = created?.id ?? created?.Id ?? created?.instanceId ?? created?.InstanceId;

            if (!createdId) {
              console.error('[Instances] Cannot resolve instance ID from response:', created);
              this.msg.add({
                severity: 'error',
                summary: 'Erreur inattendue',
                detail: 'Instance peut-être créée, mais l\'ID est introuvable dans la réponse. Vérifiez la console.',
                life: 8000,
              });
              this.saving.set(false);
              this.startDialogVisible = false;
              this.loadAll();
              return;
            }

            // 3️⃣ Start the instance (Pending → InProgress)
            this.http.post<any>(`${this.base}/WorkFlowInstances/${createdId}/start`, {}).subscribe({
              next: (started) => {
                console.log('[Instances] Start response:', started);
                const nodeName = started?.currentNode?.name ?? started?.CurrentNode?.name ?? startNode.name;
                this.msg.add({
                  severity: 'success',
                  summary: 'Instance démarrée ✓',
                  detail: `Instance #${createdId.slice(0, 8)}… lancée — étape : ${nodeName}`,
                });
                this.startDialogVisible = false;
                this.saving.set(false);
                this.loadAll();
              },
              error: (e) => {
                console.error('[Instances] /start error:', e);
                // Created but /start failed — show as Pending with manual start button
                this.msg.add({
                  severity: 'warn',
                  summary: 'Créée (en attente)',
                  detail: `Instance créée (#${createdId.slice(0, 8)}…) mais le démarrage a échoué : ${this.extractError(e)}. Utilisez le bouton ▶ manuellement.`,
                  life: 10000,
                });
                this.startDialogVisible = false;
                this.saving.set(false);
                this.loadAll();
              },
            });
          },
          error: (e) => {
            console.error('[Instances] Create error:', e);
            this.msg.add({
              severity: 'error',
              summary: 'Erreur de création',
              detail: this.extractError(e),
              life: 10000,
            });
            this.saving.set(false);
          },
        });
      },
      error: (e) => {
        console.error('[Instances] Load nodes error:', e);
        this.msg.add({
          severity: 'error',
          summary: 'Erreur',
          detail: `Impossible de charger les nœuds : ${this.extractError(e)}`,
        });
        this.saving.set(false);
      },
    });
  }

  // ── START (Pending → InProgress) ───────────────────────────────────────────
  startInstance(inst: WorkFlowInstanceDto) {
    this.saving.set(true);
    console.log('[Instances] Starting instance:', inst.id);
    this.http.post<any>(`${this.base}/WorkFlowInstances/${inst.id}/start`, {}).subscribe({
      next: (res) => {
        console.log('[Instances] Start response:', res);
        this.msg.add({ severity: 'success', summary: 'Démarrée ✓', detail: 'L\'instance est maintenant en cours.' });
        this.saving.set(false);
        this.loadAll();
      },
      error: (e) => {
        console.error('[Instances] Start error:', e);
        this.msg.add({ severity: 'error', summary: 'Erreur de démarrage', detail: this.extractError(e), life: 10000 });
        this.saving.set(false);
      },
    });
  }

  /** Extract a human-readable error message from an HttpErrorResponse */
  private extractError(e: any): string {
    if (!e) return 'Erreur inconnue.';
    const body = e?.error;
    if (typeof body === 'string' && body.length < 300) return body;
    if (body?.message)  return body.message;
    if (body?.Message)  return body.Message;
    if (body?.title)    return body.title;   // ASP.NET ProblemDetails
    if (body?.errors) {
      // ASP.NET ValidationProblemDetails: { errors: { field: [msg] } }
      const errs = Object.values(body.errors).flat().join(' | ');
      if (errs) return errs;
    }
    if (e?.message) return e.message;
    return `HTTP ${e?.status ?? '?'} — voir la console pour le détail.`;
  }

  // ── ADVANCE DIALOG ─────────────────────────────────────────────────────────
  openAdvanceDialog(inst: WorkFlowInstanceDto) {
    this.selectedInstance.set(inst);
    this.selectedEdgeId.set(null);
    this.outgoingEdges.set([]);
    this.advanceDialogVisible = true;
    this.loadOutgoingEdges(inst.nodeId);
  }

  private loadOutgoingEdges(nodeId: string) {
    this.loadingEdges.set(true);
    this.http.get<EdgeDto[]>(`${this.base}/Nodes/${nodeId}/outgoingedges`).pipe(
      catchError(() => of([] as EdgeDto[]))
    ).subscribe(edges => {
      this.outgoingEdges.set(edges);
      this.loadingEdges.set(false);
    });
  }

  submitAdvance() {
    const inst   = this.selectedInstance();
    const edgeId = this.selectedEdgeId();
    if (!inst || !edgeId) return;
    this.saving.set(true);
    this.http.post<WorkFlowInstanceDto>(`${this.base}/WorkFlowInstances/${inst.id}/advance`, { edgeId }).subscribe({
      next: (updated) => {
        this.msg.add({ severity: 'success', summary: 'Transition effectuée ✓', detail: `Étape → ${updated.currentNode?.name || '…'}` });
        this.advanceDialogVisible = false;
        this.saving.set(false);
        this.loadAll();
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: 'Erreur', detail: e?.error?.message || 'Transition impossible.' });
        this.saving.set(false);
      },
    });
  }

  // ── CANCEL ─────────────────────────────────────────────────────────────────
  confirmCancel(inst: WorkFlowInstanceDto) {
    this.conf.confirm({
      message: `Annuler l'instance <strong>#${inst.id.slice(0, 8)}…</strong> ?<br><small style="color:#6b7280">Cette action est irréversible.</small>`,
      header: 'Confirmer l\'annulation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Annuler l\'instance',
      rejectLabel: 'Conserver',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.http.post<WorkFlowInstanceDto>(`${this.base}/WorkFlowInstances/${inst.id}/cancel`, {}).subscribe({
          next: () => { this.msg.add({ severity: 'success', summary: 'Annulée', detail: 'Instance annulée.' }); this.loadAll(); },
          error: (e) => this.msg.add({ severity: 'error', summary: 'Erreur', detail: e?.error?.message || 'Impossible d\'annuler.' }),
        });
      },
    });
  }

  // ── HISTORY ────────────────────────────────────────────────────────────────
  openHistory(inst: WorkFlowInstanceDto) {
    this.selectedInstance.set(inst);
    this.history.set([]);
    this.historyDialogVisible = true;
    this.loadingHistory.set(true);
    this.http.get<WorkFlowInstanceHistoryDto[]>(`${this.base}/WorkFlowInstances/${inst.id}/history`).pipe(
      catchError(() => of([] as WorkFlowInstanceHistoryDto[]))
    ).subscribe(h => {
      this.history.set(h);
      this.loadingHistory.set(false);
    });
  }

  // ── REAL-TIME ──────────────────────────────────────────────────────────────
  private connectRealTime() {
    this.signalR.connect().then(() => {
      this.subs.push(
        this.signalR.onInstanceTransitioned$.subscribe(() => this.loadAll()),
        this.signalR.onInstanceCompleted$.subscribe(()    => this.loadAll()),
        this.signalR.onSlaBreached$.subscribe(ev => {
          this.msg.add({ severity: 'warn', summary: 'SLA dépassé ⚠', detail: ev.message || 'Un délai a été dépassé.', life: 6000 });
          this.loadAll();
        }),
        this.signalR.onTransitionFailed$.subscribe(ev => {
          this.msg.add({ severity: 'error', summary: 'Transition échouée', detail: ev.message || 'Une transition a échoué.', life: 6000 });
        }),
      );
    }).catch(() => {
      // SignalR optional — fallback to polling-free static mode
    });
  }
}