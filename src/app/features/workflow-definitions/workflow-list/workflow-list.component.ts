import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TableModule }        from 'primeng/table';
import { ButtonModule }       from 'primeng/button';
import { DialogModule }       from 'primeng/dialog';
import { InputTextModule }    from 'primeng/inputtext';
import { InputNumberModule }  from 'primeng/inputnumber';
import { TagModule }          from 'primeng/tag';
import { ToastModule }        from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule }      from 'primeng/tooltip';
import { SkeletonModule }     from 'primeng/skeleton';
import { BadgeModule }        from 'primeng/badge';
import { IconFieldModule }    from 'primeng/iconfield';
import { InputIconModule }    from 'primeng/inputicon';
import { MessageService, ConfirmationService } from 'primeng/api';

import { GenericApiService } from '../../../shared/services/generic-api.service';
import { AuthService }       from '../../../core/auth/auth.service';

interface WorkFlowDefinition {
  id?: string;
  name: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule,
    SkeletonModule, BadgeModule, IconFieldModule, InputIconModule,
  ],
  providers: [MessageService, ConfirmationService],
  styles: [`
    :host { display: block; }

    ::ng-deep .wf-table .p-datatable-thead > tr > th {
      background: #f9fafc; border-color: var(--color-border);
      font-size: .68rem; font-weight: 800; letter-spacing: .07em;
      text-transform: uppercase; color: var(--color-muted); padding: .75rem 1.25rem;
    }
    ::ng-deep .wf-table .p-datatable-tbody > tr:hover { background: #f5f3ff !important; }
    ::ng-deep .wf-table .p-datatable-tbody > tr > td  {
      border-color: var(--color-border); padding: .9rem 1.25rem;
      color: var(--color-dark); font-size: .9rem;
    }
    ::ng-deep .wf-table .p-paginator {
      border-top: 1px solid var(--color-border); background: #f9fafc; padding: .6rem 1.25rem;
    }
    ::ng-deep .wf-dialog .p-dialog            { border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-lg); }
    ::ng-deep .wf-dialog .p-dialog-header     { background: var(--color-dark); color: #fff; padding: 1.25rem 1.5rem; }
    ::ng-deep .wf-dialog .p-dialog-title      { font-weight: 800; font-size: 1.05rem; }
    ::ng-deep .wf-dialog .p-dialog-header-icon { color: rgba(255,255,255,.7) !important; }
    ::ng-deep .wf-dialog .p-dialog-content    { padding: 1.5rem; }
    ::ng-deep .wf-dialog .p-dialog-footer     { border-top: 1px solid var(--color-border); padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: .75rem; }
    ::ng-deep .wf-dialog .p-inputtext, ::ng-deep .wf-dialog .p-inputnumber-input {
      border-radius: 8px; border-color: var(--color-border); width: 100%; font-size: .9rem;
      &:focus { border-color: var(--color-accent); box-shadow: 0 0 0 2px rgba(99,102,241,.15); }
    }
    ::ng-deep .wf-search .p-inputtext { border-radius: 8px; border-color: var(--color-border); font-size: .85rem; padding: .45rem .75rem .45rem 2.1rem; width: 220px; }

    /* Spectator banner */
    .spectator-banner {
      display: flex; align-items: center; gap: 10px;
      background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.25);
      border-radius: 10px; padding: 10px 16px; margin-bottom: 20px;
      font-size: .83rem; color: #92400e;
    }
    .spectator-banner i { color: #f59e0b; font-size: 1rem; }
  `],
  template: `
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<p-toast position="top-right" />
<p-confirmDialog styleClass="wf-dialog" />

<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <div class="page-breadcrumb">
        Système <span class="sep">›</span>
        <span class="current">Définitions de Workflow</span>
      </div>
      <h1 class="page-title">Workflows</h1>
      <p class="page-subtitle">
        {{ isAdmin() ? 'Gérez vos définitions de workflow' : 'Consultez les workflows disponibles (mode lecture)' }}
      </p>
    </div>
    <!-- Create button: admin only -->
    @if (isAdmin()) {
      <button class="btn-primary" (click)="openNew()">
        <i class="pi pi-plus"></i> Nouveau Workflow
      </button>
    }
  </div>

  <!-- Spectator notice for non-admins -->
  @if (!isAdmin()) {
    <div class="spectator-banner">
      <i class="pi pi-eye"></i>
      <span>Mode <strong>lecture seule</strong> — vous pouvez consulter les workflows mais pas les modifier. Cliquez sur 👁 pour ouvrir le designer en mode spectateur.</span>
    </div>
  }

  <!-- Stats -->
  <div class="stats-bar">
    <div class="stat-card">
      <div class="stat-icon indigo"><i class="pi pi-sitemap"></i></div>
      <div>
        <div class="stat-value">{{ workflows().length }}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i class="pi pi-check-circle"></i></div>
      <div>
        <div class="stat-value">{{ latestVersion() }}</div>
        <div class="stat-label">Dernière version</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber"><i class="pi pi-calendar"></i></div>
      <div>
        <div class="stat-value">{{ todayCount() }}</div>
        <div class="stat-label">Créés aujourd'hui</div>
      </div>
    </div>
  </div>

  <!-- Table card -->
  <div class="card">
    <div class="card-toolbar">
      <span class="card-section-label">Toutes les définitions</span>
      <p-iconfield styleClass="wf-search">
        <p-inputicon styleClass="pi pi-search" />
        <input pInputText placeholder="Rechercher…" [(ngModel)]="searchTerm" (input)="applyFilter()" />
      </p-iconfield>
    </div>

    <!-- Skeleton -->
    @if (loading()) {
      <p-table [value]="skeletonRows" styleClass="wf-table p-datatable-sm">
        <ng-template pTemplate="header">
          <tr><th>Nom</th><th>Version</th><th>Créé le</th><th style="width:110px">Actions</th></tr>
        </ng-template>
        <ng-template pTemplate="body">
          <tr class="skeleton-row">
            <td><p-skeleton height="36px" borderRadius="8px"/></td>
            <td><p-skeleton width="60px" height="24px" borderRadius="6px"/></td>
            <td><p-skeleton width="110px" height="18px" borderRadius="6px"/></td>
            <td><p-skeleton width="90px" height="32px" borderRadius="8px"/></td>
          </tr>
        </ng-template>
      </p-table>
    }

    <!-- Data -->
    @if (!loading()) {
      <p-table [value]="filteredWorkflows()" styleClass="wf-table p-datatable-sm"
               [paginator]="true" [rows]="8" [rowsPerPageOptions]="[8,15,30]"
               [showCurrentPageReport]="true" currentPageReportTemplate="{first}–{last} sur {totalRecords}"
               [sortMode]="'multiple'" [rowHover]="true" dataKey="id">

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Nom <p-sortIcon field="name"/></th>
            <th pSortableColumn="version">Version <p-sortIcon field="version"/></th>
            <th pSortableColumn="createdAt">Créé le <p-sortIcon field="createdAt"/></th>
            <th style="width:120px;text-align:right">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-wf>
          <tr>
            <td>
              <div class="wf-name-cell">
                <div class="wf-icon"><i class="pi pi-sitemap"></i></div>
                <div>
                  <div class="wf-name">{{ wf.name }}</div>
                  <div class="wf-id-tag">{{ (wf.id || '').slice(0,8) }}…</div>
                </div>
              </div>
            </td>
            <td>
              <span class="version-badge">
                <i class="pi pi-tag" style="font-size:.65rem"></i> v{{ wf.version | number:'1.1-1' }}
              </span>
            </td>
            <td style="font-size:.83rem;color:var(--color-muted)">{{ wf.createdAt | date:'dd MMM yyyy' }}</td>
            <td>
              <div class="actions-cell">
                <!-- Designer: everyone can open it (spectator mode for non-admins) -->
                <button class="act-btn design"
                        [title]="isAdmin() ? 'Ouvrir le designer' : 'Voir le workflow (lecture seule)'"
                        [routerLink]="['/workflows/designer', wf.id]">
                  <i class="pi" [class.pi-share-alt]="isAdmin()" [class.pi-eye]="!isAdmin()"></i>
                </button>

                <!-- Edit & Delete: admin only -->
                @if (isAdmin()) {
                  <button class="act-btn edit" title="Modifier" (click)="editWorkflow(wf)">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="act-btn delete" title="Supprimer" (click)="confirmDelete(wf)">
                    <i class="pi pi-trash"></i>
                  </button>
                }
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="4">
            <div class="empty-state">
              <div class="empty-icon">🔷</div>
              <p class="empty-title">Aucun workflow trouvé</p>
              <p class="empty-desc">
                @if (searchTerm) { Aucun résultat pour "{{ searchTerm }}" }
                @else if (isAdmin()) { Commencez par créer votre premier workflow }
                @else { Aucun workflow disponible pour le moment. }
              </p>
              @if (!searchTerm && isAdmin()) {
                <button class="btn-primary" (click)="openNew()">
                  <i class="pi pi-plus"></i> Nouveau Workflow
                </button>
              }
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>

<!-- Dialog (admin only — won't be triggered by non-admins) -->
<p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{width:'460px'}"
          [closable]="true" [draggable]="false" styleClass="wf-dialog">
  <ng-template pTemplate="header">
    <div style="display:flex;align-items:center">
      <i class="pi pi-sitemap" style="margin-right:.6rem"></i>
      {{ isEditMode ? 'Modifier le Workflow' : 'Nouveau Workflow' }}
      <span class="dialog-header-badge">{{ isEditMode ? 'Édition' : 'Création' }}</span>
    </div>
  </ng-template>

  <form [formGroup]="form">
    <div class="form-group">
      <label class="form-label">Nom du workflow *</label>
      <input pInputText formControlName="name" placeholder="ex: Workflow de validation" />
      @if (form.get('name')?.invalid && form.get('name')?.touched) {
        <div class="field-err">Le nom est obligatoire (min. 2 caractères)</div>
      }
    </div>
    <div class="form-group">
      <label class="form-label">Version *</label>
      <p-inputNumber formControlName="version" [minFractionDigits]="1" [maxFractionDigits]="1"
                     [min]="0.1" [step]="0.1" styleClass="w-full" placeholder="ex: 1.0"/>
      @if (form.get('version')?.invalid && form.get('version')?.touched) {
        <div class="field-err">La version doit être supérieure à 0</div>
      }
    </div>
  </form>

  <ng-template pTemplate="footer">
    <button class="btn-ghost" (click)="dialogVisible = false">Annuler</button>
    <button class="btn-primary" (click)="saveWorkflow()" [disabled]="saving()">
      <i class="pi" [class.pi-check]="!saving()" [class.pi-spin]="saving()" [class.pi-spinner]="saving()"></i>
      {{ saving() ? 'Enregistrement…' : (isEditMode ? 'Enregistrer' : 'Créer') }}
    </button>
  </ng-template>
</p-dialog>
  `,
})
export class WorkflowListComponent implements OnInit {
  private readonly RESOURCE = 'workflowdefinitions';

  private auth = inject(AuthService);
  isAdmin = this.auth.isAdmin;

  workflows     = signal<WorkFlowDefinition[]>([]);
  loading       = signal(true);
  saving        = signal(false);
  dialogVisible = false;
  isEditMode    = false;
  searchTerm    = '';
  skeletonRows  = new Array(5);

  filteredWorkflows = computed(() => {
    const term = this.searchTerm.toLowerCase();
    return term ? this.workflows().filter(w => w.name.toLowerCase().includes(term)) : this.workflows();
  });

  latestVersion = computed(() => {
    if (!this.workflows().length) return '—';
    return `v${Math.max(...this.workflows().map(w => w.version)).toFixed(1)}`;
  });

  todayCount = computed(() => {
    const today = new Date().toDateString();
    return this.workflows().filter(w => w.createdAt && new Date(w.createdAt).toDateString() === today).length;
  });

  form!: FormGroup;
  private editingId?: string;

  constructor(
    private api: GenericApiService,
    private fb: FormBuilder,
    private msg: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name:    ['', [Validators.required, Validators.minLength(2)]],
      version: [1.0, [Validators.required, Validators.min(0.1)]],
    });
    this.loadWorkflows();
  }

  loadWorkflows() {
    this.loading.set(true);
    this.api.getAll<WorkFlowDefinition>(this.RESOURCE).subscribe({
      next:  (data) => { this.workflows.set(data); this.loading.set(false); },
      error: ()     => { this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les workflows' }); this.loading.set(false); },
    });
  }

  applyFilter() {}

  openNew() {
    if (!this.isAdmin()) return;
    this.isEditMode = false; this.editingId = undefined;
    this.form.reset({ name: '', version: 1.0 });
    this.dialogVisible = true;
  }

  editWorkflow(wf: WorkFlowDefinition) {
    if (!this.isAdmin()) return;
    this.isEditMode = true; this.editingId = wf.id;
    this.form.patchValue({ name: wf.name, version: wf.version });
    this.dialogVisible = true;
  }

  saveWorkflow() {
    if (!this.isAdmin()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    const req$ = this.isEditMode && this.editingId
      ? this.api.update<WorkFlowDefinition>(this.RESOURCE, this.editingId, this.form.value)
      : this.api.create<WorkFlowDefinition>(this.RESOURCE, this.form.value);
    req$.subscribe({
      next:  () => { this.msg.add({ severity: 'success', summary: 'Succès', detail: this.isEditMode ? 'Workflow mis à jour' : 'Workflow créé' }); this.dialogVisible = false; this.saving.set(false); this.loadWorkflows(); },
      error: () => { this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' }); this.saving.set(false); },
    });
  }

  confirmDelete(wf: WorkFlowDefinition) {
    if (!this.isAdmin()) return;
    this.confirm.confirm({
      message: `Supprimer "<strong>${wf.name}</strong>" ?<br><small style="color:#6b7280">Cette action est irréversible.</small>`,
      header: 'Confirmer la suppression', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => this.api.delete(this.RESOURCE, wf.id!).subscribe({
        next:  () => { this.msg.add({ severity: 'success', summary: 'Supprimé', detail: 'Workflow supprimé' }); this.workflows.update(l => l.filter(w => w.id !== wf.id)); },
        error: () =>   this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer' }),
      }),
    });
  }
}