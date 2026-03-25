import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  signal,
  computed,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import * as joint from '@joint/core';
import { firstValueFrom } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { GenericApiService } from '../../shared/services/generic-api.service';
import { AuthService }       from '../../core/auth/auth.service';

// ── Domain interfaces ─────────────────────────────────────────────────────────

interface WorkFlowDefinition { id: string; name: string; version: number; createdAt?: string; }
interface NodeModel { id?: string; name: string; type: string; description?: string | null; roleReq?: string | null; workFlowDefinitionId: string; }
interface EdgeModel { id?: string; name?: string | null; condition?: string | null; nodeId: string; targetId: string; }
type NodeType = 'START' | 'TASK' | 'DECISION' | 'END';

const NODE_CFG: Record<NodeType, { label: string; sub: string; fill: string; stroke: string; text: string; icon: string }> = {
  START:    { label: 'Début',    sub: 'Point de départ',  fill: '#10b981', stroke: '#059669', text: '#fff', icon: '▶' },
  TASK:     { label: 'Tâche',    sub: 'Action ou étape',  fill: '#6366f1', stroke: '#4f46e5', text: '#fff', icon: '⚙' },
  DECISION: { label: 'Décision', sub: 'Branchement',      fill: '#f59e0b', stroke: '#d97706', text: '#fff', icon: '◆' },
  END:      { label: 'Fin',      sub: "Point d'arrivée",  fill: '#ef4444', stroke: '#dc2626', text: '#fff', icon: '■' },
};

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ToastModule],
  providers: [MessageService],
  styles: [`
    :host {
      display: flex; flex-direction: column; height: 100vh;
      font-family: 'DM Sans', system-ui, sans-serif;
      --accent: #6366f1; --accent-d: #4f46e5;
      --dark: #1a1f36; --surface: #ffffff; --bg: #eef0fb;
      --border: #e2e4f0; --muted: #6b7280;
      --success: #10b981; --danger: #ef4444; --warn: #f59e0b;
    }

    /* ── Spectator banner ── */
    .spectator-bar {
      display: flex; align-items: center; gap: 10px;
      background: rgba(245,158,11,.12); border-bottom: 1px solid rgba(245,158,11,.3);
      padding: 8px 16px; font-size: .8rem; color: #92400e; flex-shrink: 0;
      z-index: 101;
    }
    .spectator-bar i { color: #f59e0b; font-size: .95rem; }
    .spectator-bar strong { color: #78350f; }

    /* ── TOOLBAR ── */
    .toolbar {
      display: flex; align-items: center; gap: 6px;
      height: 52px; padding: 0 12px;
      background: var(--dark); border-bottom: 1px solid #252b45;
      flex-shrink: 0; z-index: 100;
    }
    .tb-sep { width: 1px; height: 22px; background: rgba(255,255,255,.1); margin: 0 3px; }
    .tb-spacer { flex: 1; }
    .tb-back {
      display: flex; align-items: center; gap: 5px;
      color: rgba(255,255,255,.65); font-size: .8rem; font-weight: 600;
      background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px; padding: 5px 10px; cursor: pointer;
      text-decoration: none; transition: all .15s;
    }
    .tb-back:hover { color: #fff; background: rgba(255,255,255,.13); }
    .tb-title-wrap { display: flex; align-items: baseline; gap: 6px; }
    .tb-title-input {
      background: transparent; border: 1px solid transparent;
      color: #fff; font: 700 .92rem 'DM Sans', sans-serif;
      border-radius: 6px; padding: 3px 7px; outline: none; width: 220px;
      transition: all .15s;
    }
    /* Read-only title in spectator mode */
    .tb-title-input[readonly] { cursor: default; }
    .tb-title-input:not([readonly]):hover,
    .tb-title-input:not([readonly]):focus { border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.07); }
    .tb-version { font-size: .7rem; color: rgba(255,255,255,.35); font-weight: 600; }

    .tb-btn {
      display: flex; align-items: center; gap: 5px;
      height: 32px; padding: 0 10px;
      border: 1px solid rgba(255,255,255,.12); border-radius: 8px;
      color: rgba(255,255,255,.7); background: rgba(255,255,255,.06);
      font: 600 .78rem 'DM Sans', sans-serif; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .tb-btn i { font-size: .72rem; }
    .tb-btn:hover:not(:disabled) { color: #fff; background: rgba(255,255,255,.13); }
    .tb-btn:disabled { opacity: .35; cursor: not-allowed; }
    .tb-btn.danger  { border-color: rgba(239,68,68,.35); color: #fca5a5; }
    .tb-btn.danger:hover:not(:disabled) { background: rgba(239,68,68,.18); color: #ef4444; }
    .tb-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 10px rgba(99,102,241,.4); }
    .tb-btn.primary:hover:not(:disabled) { background: var(--accent-d); border-color: var(--accent-d); }
    .zoom-label { font-size: .72rem; color: rgba(255,255,255,.45); font-weight: 700; min-width: 38px; text-align: center; }

    /* ── BODY ── */
    .designer-body { display: flex; flex: 1; overflow: hidden; }

    /* ── SIDEBAR ── */
    .sidebar {
      width: 176px; flex-shrink: 0;
      background: var(--surface); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow-y: auto;
    }
    /* Spectator: dim the palette */
    .sidebar.spectator { opacity: .5; pointer-events: none; }

    .sb-section { padding: 10px; }
    .sb-label {
      font-size: .62rem; font-weight: 800; letter-spacing: .1em;
      text-transform: uppercase; color: var(--muted); margin-bottom: 8px; padding: 0 3px;
    }
    .node-btn {
      display: flex; align-items: center; gap: 9px;
      width: 100%; padding: 8px 9px;
      border: 1.5px solid var(--border); border-radius: 10px;
      background: var(--surface); cursor: pointer;
      transition: all .15s; margin-bottom: 5px; text-align: left;
    }
    .node-btn:hover { border-color: var(--accent); background: #f0f0ff; transform: translateX(2px); }
    .node-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: .95rem; flex-shrink: 0; }
    .node-lbl  { font-size: .8rem; font-weight: 700; color: var(--dark); }
    .node-sub  { font-size: .65rem; color: var(--muted); margin-top: 1px; }
    .sb-divider { height: 1px; background: var(--border); margin: 4px 10px; }
    .help-text { font-size: .7rem; color: var(--muted); line-height: 1.6; padding: 0 3px; }
    .help-text kbd { background: var(--bg); padding: 1px 5px; border-radius: 3px; font-size: .64rem; font-family: monospace; }

    /* ── CANVAS ── */
    .canvas-wrap { flex: 1; position: relative; overflow: hidden; cursor: grab; }
    #jc { width: 100%; height: 100%; display: block; }
    .loading-overlay {
      position: absolute; inset: 0; background: rgba(238,240,251,.8);
      display: flex; align-items: center; justify-content: center; z-index: 10; backdrop-filter: blur(3px);
    }
    .spinner { width: 38px; height: 38px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .75s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .canvas-empty { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; color: rgba(99,102,241,.25); }
    .canvas-empty .ce-icon { font-size: 3.5rem; margin-bottom: 6px; }
    .canvas-empty .ce-text { font-size: .82rem; font-weight: 600; }
    .canvas-badge { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); background: rgba(26,31,54,.72); color: rgba(255,255,255,.7); font-size: .7rem; font-weight: 600; padding: 4px 14px; border-radius: 20px; pointer-events: none; backdrop-filter: blur(5px); }

    /* ── PROPERTIES PANEL ── */
    .props-panel { width: 256px; flex-shrink: 0; background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; transition: width .2s ease, opacity .2s ease; }
    .props-panel.closed { width: 0; opacity: 0; overflow: hidden; }
    /* Spectator: inputs disabled */
    .props-panel.spectator .prop-inp,
    .props-panel.spectator .prop-sel,
    .props-panel.spectator .prop-ta { background: #f9fafc; cursor: default; color: var(--muted); }
    .props-panel.spectator .pp-head { background: rgba(245,158,11,.06); }
    .props-panel.spectator .pp-title::after { content: ' (lecture)'; color: #f59e0b; font-size: .58rem; }

    .pp-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8f9fc; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .pp-title { font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
    .pp-type-badge { font-size: .62rem; font-weight: 700; padding: 2px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: .05em; }
    .pp-body { flex: 1; overflow-y: auto; padding: 14px; }
    .prop-g  { margin-bottom: 13px; }
    .prop-lbl { display: block; font-size: .66rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: 5px; }
    .prop-inp, .prop-sel, .prop-ta { width: 100%; box-sizing: border-box; padding: 7px 9px; border: 1.5px solid var(--border); border-radius: 8px; font: .84rem 'DM Sans', sans-serif; color: var(--dark); background: #fff; transition: border-color .15s; }
    .prop-inp:focus, .prop-sel:focus, .prop-ta:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
    .prop-ta { resize: vertical; }
    .prop-sel { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath stroke='%236b7280' stroke-width='1.5' d='M1 1l4 4 4-4' fill='none'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 9px center; padding-right: 26px; cursor: pointer; }
    .pp-footer { padding: 10px 14px; border-top: 1px solid var(--border); }
    .btn-del-cell { width: 100%; padding: 8px; border: 1.5px solid #fee2e2; border-radius: 8px; background: #fff5f5; color: var(--danger); font: 700 .8rem 'DM Sans', sans-serif; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; gap: 5px; }
    .btn-del-cell:hover { background: var(--danger); color: #fff; border-color: var(--danger); }

    ::ng-deep .joint-paper { cursor: default; }
    ::ng-deep .joint-paper .available-magnet { fill: #6366f1 !important; }
    ::ng-deep .joint-paper .available-cell .body { stroke: #6366f1 !important; stroke-dasharray: 5,3; }
    ::ng-deep .joint-paper svg { display: block; }
  `],
  template: `
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<p-toast position="top-right" />

<!-- ── SPECTATOR BANNER ── -->
@if (spectatorMode()) {
  <div class="spectator-bar">
    <i class="pi pi-eye"></i>
    <span>Mode <strong>spectateur</strong> — vous consultez ce workflow en lecture seule. Aucune modification n'est possible.</span>
  </div>
}

<!-- ── TOOLBAR ── -->
<div class="toolbar">
  <a class="tb-back" routerLink="/workflows">
    <i class="pi pi-arrow-left"></i> Workflows
  </a>

  <div class="tb-sep"></div>

  <div class="tb-title-wrap">
    @if (wfDef()) {
      <input class="tb-title-input"
             [value]="wfDef()?.name"
             [readonly]="spectatorMode()"
             (change)="onNameChange($event)"
             placeholder="Nom du workflow" />
      <span class="tb-version">v{{ wfDef()?.version | number:'1.1-1' }}</span>
    } @else {
      <span style="color:rgba(255,255,255,.3);font-size:.85rem">Chargement…</span>
    }
  </div>

  <div class="tb-spacer"></div>

  <!-- Zoom controls (available to everyone) -->
  <button class="tb-btn" (click)="doZoom(-0.15)" title="Zoom arrière"><i class="pi pi-minus"></i></button>
  <span class="zoom-label">{{ (zoom() * 100) | number:'1.0-0' }}%</span>
  <button class="tb-btn" (click)="doZoom(+0.15)" title="Zoom avant"><i class="pi pi-plus"></i></button>
  <button class="tb-btn" (click)="fitView()" title="Ajuster la vue"><i class="pi pi-expand"></i></button>

  <!-- Admin-only controls -->
  @if (!spectatorMode()) {
    <div class="tb-sep"></div>
    <button class="tb-btn" (click)="clearCanvas()" title="Effacer tout" [disabled]="loading()">
      <i class="pi pi-refresh"></i> Vider
    </button>
    <button class="tb-btn danger" [disabled]="!selId()" (click)="deleteSelected()" title="Supprimer (Suppr)">
      <i class="pi pi-trash"></i> Supprimer
    </button>
    <div class="tb-sep"></div>
    <button class="tb-btn primary" [disabled]="saving() || loading()" (click)="save()">
      <i class="pi" [class.pi-save]="!saving()" [class.pi-spin]="saving()" [class.pi-spinner]="saving()"></i>
      {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
    </button>
  }
</div>

<!-- ── BODY ── -->
<div class="designer-body">

  <!-- LEFT SIDEBAR — dimmed in spectator mode -->
  <div class="sidebar" [class.spectator]="spectatorMode()">
    <div class="sb-section">
      <div class="sb-label">{{ spectatorMode() ? 'Types de nœuds' : 'Ajouter un nœud' }}</div>
      @for (nt of paletteItems; track nt.type) {
        <button class="node-btn" (click)="addNode(nt.type)" [title]="nt.sub" [disabled]="spectatorMode()">
          <div class="node-icon" [style.background]="nt.fill + '22'" [style.color]="nt.fill">{{ nt.icon }}</div>
          <div>
            <div class="node-lbl">{{ nt.label }}</div>
            <div class="node-sub">{{ nt.sub }}</div>
          </div>
        </button>
      }
    </div>
    <div class="sb-divider"></div>
    <div class="sb-section">
      <div class="sb-label">{{ spectatorMode() ? 'Navigation' : 'Aide rapide' }}</div>
      @if (spectatorMode()) {
        <div class="help-text">
          <div>• Cliquer → sélectionner</div>
          <div>• Molette → zoom</div>
          <div>• Glisser fond → déplacer vue</div>
          <div><kbd>Échap</kbd> → désélectionner</div>
        </div>
      } @else {
        <div class="help-text">
          <div>• Cliquer palette → ajouter</div>
          <div>• Glisser nœud → déplacer</div>
          <div>• Tirer port → connecter</div>
          <div>• Double-clic → éditer</div>
          <div><kbd>Suppr</kbd> → supprimer</div>
          <div><kbd>Échap</kbd> → désélectionner</div>
        </div>
      }
    </div>
    <div class="sb-divider"></div>
    <div class="sb-section" style="margin-top:auto">
      <div class="sb-label">Statistiques</div>
      <div style="font-size:.75rem;color:var(--muted)">
        <div style="margin-bottom:3px"><span style="font-weight:700;color:var(--dark)">{{ nCount() }}</span> nœud{{ nCount() !== 1 ? 's' : '' }}</div>
        <div><span style="font-weight:700;color:var(--dark)">{{ eCount() }}</span> connexion{{ eCount() !== 1 ? 's' : '' }}</div>
      </div>
    </div>
  </div>

  <!-- CANVAS -->
  <div class="canvas-wrap" [class.spectator]="spectatorMode()">
    <div id="jc" #canvasEl></div>
    @if (loading()) {
      <div class="loading-overlay"><div class="spinner"></div></div>
    }
    @if (!loading() && isEmpty()) {
      <div class="canvas-empty">
        <div class="ce-icon">🔷</div>
        <div class="ce-text">{{ spectatorMode() ? 'Ce workflow ne contient aucun nœud' : 'Ajoutez des nœuds depuis la palette gauche' }}</div>
      </div>
    }
    <div class="canvas-badge">
      {{ nCount() }} nœud{{ nCount() !== 1 ? 's' : '' }} · {{ eCount() }} lien{{ eCount() !== 1 ? 's' : '' }}
      @if (spectatorMode()) { · 👁 Lecture seule }
    </div>
  </div>

  <!-- PROPERTIES PANEL -->
  <div class="props-panel" [class.closed]="!selId()" [class.spectator]="spectatorMode()">
    <div class="pp-head">
      <span class="pp-title">{{ selIsLink() ? 'Connexion' : 'Nœud' }}</span>
      @if (!selIsLink() && selId()) {
        <span class="pp-type-badge"
              [style.background]="typeColor(nodeForm.get('type')?.value) + '22'"
              [style.color]="typeColor(nodeForm.get('type')?.value)">
          {{ nodeForm.get('type')?.value }}
        </span>
      }
    </div>

    <div class="pp-body">

      <!-- NODE FORM -->
      @if (!selIsLink()) {
        <form [formGroup]="nodeForm">
          <div class="prop-g">
            <label class="prop-lbl">Nom</label>
            <input class="prop-inp" formControlName="name" placeholder="Nom du nœud"
                   [readonly]="spectatorMode()"
                   (input)="!spectatorMode() && syncNodeLabel()" />
          </div>
          <div class="prop-g">
            <label class="prop-lbl">Type</label>
            <select class="prop-sel" formControlName="type"
                    [attr.disabled]="spectatorMode() ? true : null"
                    (change)="!spectatorMode() && syncNodeStyle()">
              <option value="START">▶ Début (START)</option>
              <option value="TASK">⚙ Tâche (TASK)</option>
              <option value="DECISION">◆ Décision (DECISION)</option>
              <option value="END">■ Fin (END)</option>
            </select>
          </div>
          <div class="prop-g">
            <label class="prop-lbl">Description</label>
            <textarea class="prop-ta" formControlName="description" rows="3"
                      placeholder="Description…" [readonly]="spectatorMode()"
                      (input)="!spectatorMode() && syncNodeData()"></textarea>
          </div>
          <div class="prop-g">
            <label class="prop-lbl">Rôle requis</label>
            <input class="prop-inp" formControlName="roleReq"
                   placeholder="ex: admin…" [readonly]="spectatorMode()"
                   (input)="!spectatorMode() && syncNodeData()" />
          </div>
        </form>
      }

      <!-- EDGE FORM -->
      @if (selIsLink()) {
        <form [formGroup]="edgeForm">
          <div class="prop-g">
            <label class="prop-lbl">Libellé</label>
            <input class="prop-inp" formControlName="name"
                   placeholder="ex: Approuvé…" [readonly]="spectatorMode()"
                   (input)="!spectatorMode() && syncLinkLabel()" />
          </div>
          <div class="prop-g">
            <label class="prop-lbl">Condition</label>
            <textarea class="prop-ta" formControlName="condition" rows="4"
                      placeholder="ex: status === 'approved'" [readonly]="spectatorMode()"
                      (input)="!spectatorMode() && syncLinkData()"></textarea>
          </div>
          <div class="prop-g">
            <label class="prop-lbl">Connexion</label>
            <div style="font-size:.75rem;color:var(--muted);line-height:1.6">
              <div><strong style="color:var(--dark)">De :</strong> {{ linkSrcName() }}</div>
              <div><strong style="color:var(--dark)">Vers :</strong> {{ linkTgtName() }}</div>
            </div>
          </div>
        </form>
      }

    </div>

    <!-- Delete button: hidden in spectator mode -->
    @if (!spectatorMode()) {
      <div class="pp-footer">
        <button class="btn-del-cell" (click)="deleteSelected()">
          <i class="pi pi-trash"></i>
          Supprimer {{ selIsLink() ? 'la connexion' : 'le nœud' }}
        </button>
      </div>
    }
  </div>

</div>
  `,
})
export class WorkflowDesignerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLDivElement>;

  private auth = inject(AuthService);

  /** True when the current user is NOT an admin */
  spectatorMode = computed(() => !this.auth.isAdmin());

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    // Block keyboard shortcuts in spectator mode
    if (this.spectatorMode()) {
      if (e.key === 'Escape') this.clearSel();
      return;
    }
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.deleteSelected(); }
    if (e.key === 'Escape') this.clearSel();
  }

  // ── Signals ───────────────────────────────────────────────────────────────
  wfDef     = signal<WorkFlowDefinition | null>(null);
  loading   = signal(true);
  saving    = signal(false);
  selId     = signal<string | null>(null);
  selIsLink = signal(false);
  zoom      = signal(1.0);
  nCount    = signal(0);
  eCount    = signal(0);
  isEmpty   = computed(() => this.nCount() === 0);
  linkSrcName = signal('—');
  linkTgtName = signal('—');

  readonly paletteItems = (Object.keys(NODE_CFG) as NodeType[]).map(k => ({ type: k, ...NODE_CFG[k] }));

  nodeForm!: FormGroup;
  edgeForm!: FormGroup;

  private graph!: joint.dia.Graph;
  private paper!: joint.dia.Paper;
  private ro?: ResizeObserver;
  private wfId!: string;
  private origNodes: NodeModel[] = [];
  private origEdges: EdgeModel[] = [];

  // Panning state
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };

  constructor(
    private route: ActivatedRoute,
    private api: GenericApiService,
    private fb: FormBuilder,
    private msg: MessageService,
  ) {}

  ngOnInit() {
    this.wfId = this.route.snapshot.params['id'];
    this.buildForms();
    this.loadData();
  }

  ngAfterViewInit() { this.initJoint(); }
  ngOnDestroy() {
    this.ro?.disconnect();
    document.removeEventListener('mousemove', this.onPanMove);
    document.removeEventListener('mouseup', this.onPanEnd);
  }

  // Panning handlers (arrow functions to preserve 'this')
  private onPanMove = (evt: MouseEvent) => {
    if (!this.isPanning) return;
    const dx = evt.clientX - this.panStart.x;
    const dy = evt.clientY - this.panStart.y;
    this.paper.translate(this.panOrigin.x + dx, this.panOrigin.y + dy);
  };

  private onPanEnd = () => {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvasEl.nativeElement.style.cursor = '';
    }
  };

  private buildForms() {
    this.nodeForm = this.fb.group({ name: [''], type: ['TASK'], description: [''], roleReq: [''] });
    this.edgeForm = this.fb.group({ name: [''], condition: [''] });
  }

  private initJoint() {
    const el = this.canvasEl.nativeElement;
    this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

    const isSpectator = this.spectatorMode();

    this.paper = new joint.dia.Paper({
      el,
      model: this.graph,
      width:  el.offsetWidth  || 900,
      height: el.offsetHeight || 600,
      gridSize: 20,
      drawGrid: { name: 'dot', args: { color: '#b8bce0', thickness: 1.5 } },
      background: { color: '#eef0fb' },
      cellViewNamespace: joint.shapes,
      defaultRouter:    { name: 'manhattan', args: { padding: 20, step: 20 } },
      defaultConnector: { name: 'rounded',   args: { radius: 10 } },
      defaultLink: () => new joint.shapes.standard.Link({
        attrs: { line: { stroke: '#6366f1', strokeWidth: 2, targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 Z', fill: '#6366f1' } } },
        labels: [{ position: .5, attrs: { text: { text: '', fontSize: 11 } } }],
      }),
      // In spectator mode: disable all interactions
      interactive: isSpectator
        ? false
        : { labelMove: false },
      validateConnection: isSpectator
        ? () => false
        : (vS, _mS, vT, magnet) => vS !== vT && !!magnet,
      validateMagnet: isSpectator
        ? () => false
        : (_cv, magnet) => magnet.getAttribute('magnet') !== 'passive',
      snapLinks:    { radius: 24 },
      markAvailable: !isSpectator,
    });

    // Click to select (spectator can still inspect properties, just can't edit)
    this.paper.on('cell:pointerclick', (cv) => this.selectCell(cv.model));
    this.paper.on('blank:pointerclick', () => this.clearSel());

    // Panning: drag on blank area to move the canvas
    this.paper.on('blank:pointerdown', (evt: any) => {
      const e = evt.originalEvent || evt;
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      const translate = this.paper.translate();
      this.panOrigin = { x: translate.tx, y: translate.ty };
      el.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', this.onPanMove);
    document.addEventListener('mouseup', this.onPanEnd);

    // Double-click opens properties panel
    this.paper.on('cell:pointerdblclick', (cv) => {
      this.selectCell(cv.model);
      setTimeout(() => (document.querySelector('.pp-body input') as HTMLInputElement)?.focus(), 80);
    });

    // Hover tools — only for admins
    if (!isSpectator) {
      this.paper.on('element:mouseenter', (ev) => {
        ev.addTools(new joint.dia.ToolsView({
          tools: [new joint.elementTools.Remove({ x: '100%', y: '0%', offset: { x: 10, y: -10 } })],
        }));
      });
      this.paper.on('element:mouseleave', (ev) => ev.removeTools());
      this.paper.on('link:mouseenter', (lv) => {
        lv.addTools(new joint.dia.ToolsView({
          tools: [new joint.linkTools.Remove(), new joint.linkTools.TargetArrowhead(), new joint.linkTools.Vertices({ redundancyRemoval: true })],
        }));
      });
      this.paper.on('link:mouseleave', (lv) => lv.removeTools());
    }

    this.graph.on('add remove', () => this.refreshCounts());

    this.ro = new ResizeObserver(() => {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (w > 0 && h > 0) this.paper.setDimensions(w, h);
    });
    this.ro.observe(el);

    if (!this.loading()) this.renderGraph();
  }

  // ════════ SELECTION ════════

  private selectCell(cell: joint.dia.Cell) {
    this.selId.set(String(cell.id));
    this.selIsLink.set(cell.isLink());
    if (cell.isLink()) {
      const d = cell.get('customData') || {};
      this.edgeForm.patchValue({ name: d.name || '', condition: d.condition || '' });
      const src = cell.getSourceCell(); const tgt = cell.getTargetCell();
      this.linkSrcName.set(src ? (src.get('customData')?.name || 'Nœud') : '—');
      this.linkTgtName.set(tgt ? (tgt.get('customData')?.name || 'Nœud') : '—');
    } else {
      const d = cell.get('customData') || {};
      this.nodeForm.patchValue({ name: d.name || cell.attr('label/text') || '', type: d.type || 'TASK', description: d.description || '', roleReq: d.roleReq || '' });
    }
  }

  clearSel() { this.selId.set(null); this.selIsLink.set(false); }

  // ════════ FORM → CELL SYNC (admin only) ════════

  syncNodeLabel() {
    const cell = this.getSelCell(); if (!cell || cell.isLink()) return;
    const name = this.nodeForm.get('name')?.value || '';
    cell.attr('label/text', name); this.updateCustomData(cell, { name });
  }
  syncNodeStyle() {
    const cell = this.getSelCell(); if (!cell || cell.isLink()) return;
    const type = (this.nodeForm.get('type')?.value || 'TASK') as NodeType;
    const cfg  = NODE_CFG[type];
    cell.attr({ body: { fill: cfg.fill, stroke: cfg.stroke }, label: { fill: cfg.text } });
    this.updateCustomData(cell, { type });
  }
  syncNodeData() {
    const cell = this.getSelCell(); if (!cell || cell.isLink()) return;
    this.updateCustomData(cell, { description: this.nodeForm.get('description')?.value, roleReq: this.nodeForm.get('roleReq')?.value });
  }
  syncLinkLabel() {
    const cell = this.getSelCell(); if (!cell?.isLink()) return;
    const name = this.edgeForm.get('name')?.value || '';
    (cell as joint.dia.Link).label(0, { attrs: { text: { text: name, fontSize: 11, fill: '#4f46e5', fontWeight: 700 } } });
    this.updateCustomData(cell, { name });
  }
  syncLinkData() {
    const cell = this.getSelCell(); if (!cell?.isLink()) return;
    this.updateCustomData(cell, { condition: this.edgeForm.get('condition')?.value });
  }
  private getSelCell(): joint.dia.Cell | null { const id = this.selId(); return id ? this.graph.getCell(id) : null; }
  private updateCustomData(cell: joint.dia.Cell, patch: Record<string, any>) { cell.set('customData', { ...(cell.get('customData') || {}), ...patch }); }

  // ════════ DATA LOADING ════════

  private loadData() {
    this.loading.set(true);
    forkJoin({
      wf:    this.api.getById<WorkFlowDefinition>('workflowdefinitions', this.wfId),
      nodes: this.api.getAll<NodeModel>('nodes'),
      edges: this.api.getAll<EdgeModel>('edges'),
    }).pipe(
      catchError(err => {
        this.msg.add({ severity: 'error', summary: 'Erreur de chargement', detail: err?.error?.message || `HTTP ${err?.status || '?'}` });
        return of({ wf: null as WorkFlowDefinition | null, nodes: [] as NodeModel[], edges: [] as EdgeModel[] });
      }),
    ).subscribe(({ wf, nodes, edges }) => {
      if (wf) this.wfDef.set(wf);
      const myNodes = (nodes ?? []).filter(n => n.workFlowDefinitionId === this.wfId);
      const myNIds  = new Set(myNodes.map(n => n.id!));
      const myEdges = (edges ?? []).filter(e => myNIds.has(e.nodeId) || myNIds.has(e.targetId));
      this.origNodes = myNodes; this.origEdges = myEdges;
      this.loading.set(false);
      if (this.paper) this.renderGraph();
    });
  }

  // ════════ RENDER ════════

  private renderGraph() {
    this.graph.clear();
    if (!this.origNodes.length) { this.refreshCounts(); return; }
    const positions = this.autoLayout(this.origNodes, this.origEdges);
    const cellById  = new Map<string, string>();
    for (const node of this.origNodes) {
      const pos = positions.get(node.id!) || { x: 80, y: 80 };
      const el  = this.makeElement(node.type as NodeType, node.name, pos.x, pos.y);
      el.set('apiId', node.id);
      el.set('customData', { name: node.name, type: node.type, description: node.description || '', roleReq: node.roleReq || '' });
      this.graph.addCell(el);
      cellById.set(node.id!, String(el.id));
    }
    for (const edge of this.origEdges) {
      const srcCid = cellById.get(edge.nodeId); const tgtCid = cellById.get(edge.targetId);
      if (!srcCid || !tgtCid) continue;
      const link = new joint.shapes.standard.Link({
        source: { id: srcCid, port: 'out' }, target: { id: tgtCid, port: 'in' },
        attrs: { line: { stroke: '#6366f1', strokeWidth: 2, targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 Z', fill: '#6366f1' } } },
        labels: edge.name ? [{ position: .5, attrs: { text: { text: edge.name, fontSize: 11, fill: '#4f46e5', fontWeight: 700 } } }] : [{ position: .5, attrs: { text: { text: '' } } }],
      });
      link.set('apiId', edge.id);
      link.set('customData', { name: edge.name || '', condition: edge.condition || '' });
      this.graph.addCell(link);
    }
    this.refreshCounts();
    setTimeout(() => this.fitView(), 120);
  }

  private autoLayout(nodes: NodeModel[], edges: EdgeModel[]): Map<string, { x: number; y: number }> {
    const children = new Map<string, string[]>(); const inDeg = new Map<string, number>();
    nodes.forEach(n => { children.set(n.id!, []); inDeg.set(n.id!, 0); });
    edges.forEach(e => { children.get(e.nodeId)?.push(e.targetId); inDeg.set(e.targetId, (inDeg.get(e.targetId) || 0) + 1); });
    const levels = new Map<string, number>();
    const queue  = nodes.filter(n => n.type === 'START' || (inDeg.get(n.id!) ?? 0) === 0);
    if (!queue.length && nodes.length) queue.push(nodes[0]);
    const bfsQ = queue.map(n => n.id!);
    bfsQ.forEach(id => levels.set(id, 0));
    while (bfsQ.length) { const id = bfsQ.shift()!; const lv = levels.get(id) ?? 0; for (const ch of (children.get(id) ?? [])) { if (!levels.has(ch)) { levels.set(ch, lv + 1); bfsQ.push(ch); } } }
    nodes.forEach(n => { if (!levels.has(n.id!)) levels.set(n.id!, 0); });
    const cols = new Map<number, string[]>();
    nodes.forEach(n => { const lv = levels.get(n.id!) ?? 0; if (!cols.has(lv)) cols.set(lv, []); cols.get(lv)!.push(n.id!); });
    const W = 200, H = 110, PX = 80, PY = 80;
    const pos = new Map<string, { x: number; y: number }>();
    cols.forEach((ids, col) => { ids.forEach((id, row) => pos.set(id, { x: PX + col * W, y: PY + row * H })); });
    return pos;
  }

  private makeElement(type: NodeType, name: string, x: number, y: number): joint.dia.Element {
    const cfg = NODE_CFG[type] || NODE_CFG['TASK'];
    const ports = {
      groups: {
        in:  { position: { name: 'left'  }, attrs: { portBody: { magnet: 'passive', r: 5, fill: '#fff', stroke: cfg.stroke, strokeWidth: 2 } }, markup: [{ tagName: 'circle', selector: 'portBody' }] },
        out: { position: { name: 'right' }, attrs: { portBody: { magnet: true,      r: 5, fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 2 } }, markup: [{ tagName: 'circle', selector: 'portBody' }] },
      },
      items: [{ id: 'in', group: 'in' }, { id: 'out', group: 'out' }],
    };
    const labelAttrs = { text: name, fill: cfg.text, fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' };
    if (type === 'START' || type === 'END') return new joint.shapes.standard.Circle({ position: { x, y }, size: { width: 72, height: 72 }, ports, attrs: { body: { fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 2.5 }, label: labelAttrs } });
    if (type === 'DECISION') return new joint.shapes.standard.Polygon({ position: { x, y }, size: { width: 140, height: 80 }, ports, attrs: { body: { fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 2, refPoints: '70,0 140,40 70,80 0,40' }, label: labelAttrs } });
    return new joint.shapes.standard.Rectangle({ position: { x, y }, size: { width: 150, height: 64 }, ports, attrs: { body: { fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 2, rx: 12, ry: 12 }, label: { ...labelAttrs, fontSize: 13 } } });
  }

  // ════════ ADD / DELETE (admin only) ════════

  addNode(type: NodeType) {
    if (this.spectatorMode()) return;
    const el = this.canvasEl.nativeElement;
    let cx: number, cy: number;
    try {
      const pt = this.paper.clientToLocalPoint(el.offsetLeft + el.offsetWidth / 2 + (Math.random() - .5) * 100, el.offsetTop + el.offsetHeight / 2 + (Math.random() - .5) * 80);
      cx = pt.x; cy = pt.y;
    } catch { cx = 200 + Math.random() * 300; cy = 100 + Math.random() * 200; }
    const cfg = NODE_CFG[type];
    const el2 = this.makeElement(type, cfg.label, cx - 60, cy - 30);
    el2.set('customData', { name: cfg.label, type, description: '', roleReq: '' });
    this.graph.addCell(el2); this.selectCell(el2); this.refreshCounts();
  }

  deleteSelected() {
    if (this.spectatorMode()) return;
    const id = this.selId(); if (!id) return;
    const cell = this.graph.getCell(id);
    if (cell) { this.clearSel(); cell.remove(); this.refreshCounts(); }
  }

  clearCanvas() {
    if (this.spectatorMode()) return;
    if (!confirm('Effacer tout le canvas ?')) return;
    this.clearSel(); this.graph.clear(); this.refreshCounts();
  }

  // ════════ ZOOM / FIT ════════

  doZoom(delta: number) { const next = Math.min(Math.max(this.zoom() + delta, 0.2), 3.0); this.zoom.set(next); this.paper.scale(next); }
  fitView() { if (!this.graph.getCells().length) return; this.paper.scaleContentToFit({ padding: 60, maxScale: 1.25 }); this.zoom.set(this.paper.scale().sx); }
  private refreshCounts() { this.nCount.set(this.graph.getElements().length); this.eCount.set(this.graph.getLinks().length); }

  onNameChange(e: Event) {
    if (this.spectatorMode()) return;
    const v = (e.target as HTMLInputElement).value;
    this.wfDef.update(w => w ? { ...w, name: v } : w);
  }

  // ════════ SAVE (admin only) ════════

  async save() {
    if (this.spectatorMode()) return;
    const wf = this.wfDef();
    if (!wf) { this.msg.add({ severity: 'warn', summary: 'Attention', detail: 'Définition introuvable.' }); return; }
    this.saving.set(true);
    try {
      const elements = this.graph.getElements(); const links = this.graph.getLinks();
      try { await firstValueFrom(this.api.update('workflowdefinitions', wf.id, { name: wf.name, version: wf.version })); } catch (e: any) { throw new Error(`Étape 1 : ${e?.error?.message || e?.message}`); }
      const cellToApi = new Map<string, string>(); const keepNodeIds = new Set<string>();
      for (const el of elements) {
        const d = el.get('customData') || {}; const apiId = el.get('apiId') as string | undefined;
        const payload: Partial<NodeModel> = { name: d.name || 'Nœud', type: d.type || 'TASK', description: d.description || null, roleReq: d.roleReq || null, workFlowDefinitionId: this.wfId };
        try {
          if (apiId) { await firstValueFrom(this.api.update<NodeModel>('nodes', apiId, payload)); cellToApi.set(String(el.id), apiId); keepNodeIds.add(apiId); }
          else { const created = await firstValueFrom(this.api.create<NodeModel>('nodes', payload)); if (created?.id) { el.set('apiId', created.id); cellToApi.set(String(el.id), created.id); keepNodeIds.add(created.id); } else throw new Error('Pas d\'ID retourné.'); }
        } catch (e: any) { throw new Error(`Nœud "${payload.name}" : ${e?.error?.message || e?.message}`); }
      }
      const currentLinkApiIds = new Set(links.map(l => l.get('apiId')).filter(Boolean));
      for (const edge of this.origEdges) { if (edge.id && !currentLinkApiIds.has(edge.id)) { try { await firstValueFrom(this.api.delete('edges', edge.id)); } catch {} } }
      const keepEdgeIds = new Set<string>();
      for (const link of links) {
        const srcCell = link.getSourceCell(); const tgtCell = link.getTargetCell();
        if (!srcCell || !tgtCell) continue;
        const srcApi = cellToApi.get(String(srcCell.id)); const tgtApi = cellToApi.get(String(tgtCell.id));
        if (!srcApi || !tgtApi) continue;
        const d = link.get('customData') || {}; const apiId = link.get('apiId') as string | undefined;
        const payload: Partial<EdgeModel> = { name: d.name || null, condition: d.condition || null, nodeId: srcApi, targetId: tgtApi };
        try {
          if (apiId) { await firstValueFrom(this.api.update<EdgeModel>('edges', apiId, payload)); keepEdgeIds.add(apiId); }
          else { const created = await firstValueFrom(this.api.create<EdgeModel>('edges', payload)); if (created?.id) { link.set('apiId', created.id); keepEdgeIds.add(created.id); } else throw new Error('Pas d\'ID retourné.'); }
        } catch (e: any) { throw new Error(`Connexion : ${e?.error?.message || e?.message}`); }
      }
      for (const node of this.origNodes) { if (node.id && !keepNodeIds.has(node.id)) { try { await firstValueFrom(this.api.delete('nodes', node.id)); } catch {} } }
      this.origNodes = elements.map(el => ({ id: el.get('apiId'), ...(el.get('customData') || {}), workFlowDefinitionId: this.wfId })) as NodeModel[];
      this.origEdges = links.filter(lk => lk.get('apiId')).map(lk => ({ id: lk.get('apiId'), ...(lk.get('customData') || {}), nodeId: cellToApi.get(String(lk.getSourceCell()?.id)) || '', targetId: cellToApi.get(String(lk.getTargetCell()?.id)) || '' })) as EdgeModel[];
      this.msg.add({ severity: 'success', summary: 'Enregistré ✓', detail: `« ${wf.name} » — ${elements.length} nœud(s), ${links.length} connexion(s).` });
    } catch (err: any) {
      this.msg.add({ severity: 'error', summary: 'Échec', detail: err?.message || 'Erreur inattendue.', life: 8000 });
    } finally {
      this.saving.set(false);
    }
  }

  typeColor(type: string): string { return NODE_CFG[type as NodeType]?.fill || '#6366f1'; }
}