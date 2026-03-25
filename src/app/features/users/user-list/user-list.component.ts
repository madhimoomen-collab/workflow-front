import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators, AbstractControl 
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

import { TableModule }        from 'primeng/table';
import { DialogModule }       from 'primeng/dialog';
import { ButtonModule }       from 'primeng/button';
import { InputTextModule }    from 'primeng/inputtext';
import { SelectModule }       from 'primeng/select';
import { TagModule }          from 'primeng/tag';
import { ToastModule }        from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule }     from 'primeng/skeleton';
import { TooltipModule }      from 'primeng/tooltip';
import { IconFieldModule }    from 'primeng/iconfield';
import { InputIconModule }    from 'primeng/inputicon';
import { AvatarModule }       from 'primeng/avatar';
import { MessageService, ConfirmationService } from 'primeng/api';

interface UserDto     { id: string; fullName: string; username: string; createdAt?: string; }
interface RoleDto     { id: string; roleName: string; }
interface UserRoleDto { id: string; userId: string; roleId: string; role: RoleDto; }

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    TableModule, DialogModule, ButtonModule, InputTextModule,
    SelectModule, TagModule, ToastModule, ConfirmDialogModule,
    SkeletonModule, TooltipModule, IconFieldModule, InputIconModule, AvatarModule,
  ],
  providers: [MessageService, ConfirmationService],
  styles: [`
    :host { display: block; }

    /* ── PrimeNG table scoped overrides ─────────────────────────────────── */
    ::ng-deep .usr-table .p-datatable-thead > tr > th {
      background: #f9fafc;
      border-color: var(--color-border);
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .07em;
      text-transform: uppercase;
      color: var(--color-muted);
      padding: 12px 20px;
    }
    ::ng-deep .usr-table .p-datatable-tbody > tr:hover { background: #f5f3ff !important; }
    ::ng-deep .usr-table .p-datatable-tbody > tr > td  {
      border-color: var(--color-border);
      padding: 12px 20px;
      font-size: .87rem;
    }
    ::ng-deep .usr-table .p-paginator {
      border-top: 1px solid var(--color-border);
      background: #f9fafc;
      padding: 8px 20px;
    }

    /* ── Search input fix ──────────────────────────────────────────────── */
    ::ng-deep .usr-search {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    /* The icon inside p-iconfield */
    ::ng-deep .usr-search .p-inputicon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-muted);
      font-size: .85rem;
      pointer-events: none;
      z-index: 1;
    }

    /* The actual input — enough left-padding so icon never overlaps text */
    ::ng-deep .usr-search .p-inputtext {
      border-radius: 9px;
      border: 1.5px solid var(--color-border);
      background: #fff;
      font-size: .88rem;
      color: var(--color-dark);
      padding: 8px 14px 8px 36px;   /* 36px left = icon width + gap */
      width: 260px;
      height: 38px;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
      transition: border-color .15s, box-shadow .15s;

      &::placeholder { color: #b0b5c8; font-size: .85rem; }
      &:focus {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px rgba(99,102,241,.12);
        outline: none;
      }
    }

    /* ── Dialog overrides ───────────────────────────────────────────────── */
    ::ng-deep .usr-dialog .p-dialog       { border-radius: 16px; overflow: visible; box-shadow: var(--shadow-lg); background: #fff !important; }
    ::ng-deep .usr-dialog .p-dialog-header { background: var(--color-dark) !important; color: #fff; padding: 14px 18px; border-radius: 16px 16px 0 0; }
    ::ng-deep .usr-dialog .p-dialog-title  { font-weight: 800; font-size: 1rem; }
    ::ng-deep .usr-dialog .p-dialog-header-icon { color: rgba(255,255,255,.5) !important; }
    ::ng-deep .usr-dialog .p-dialog-content { padding: 18px; background: #fff !important; overflow: visible !important; }
    ::ng-deep .usr-dialog .p-dialog-footer  { border-top: 1px solid var(--color-border); padding: 12px 18px; display: flex; justify-content: flex-end; gap: 8px; background: #fff !important; border-radius: 0 0 16px 16px; }
    ::ng-deep .usr-dialog .p-dropdown { width: 100%; border-radius: 8px; border-color: var(--color-border); background: #fff !important; }
    ::ng-deep .usr-dialog .p-dropdown:not(.p-disabled).p-focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }

    /* Password form grid */
    .pwd-form { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; align-items: flex-end; }
  `],
  template: `
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<p-toast position="top-right" />
<p-confirmDialog styleClass="usr-dialog" />

<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <div class="page-breadcrumb">Système <span class="sep">›</span> Utilisateurs</div>
      <h1 class="page-title">{{ isAdmin() ? 'Gestion des Utilisateurs' : 'Mon Profil' }}</h1>
      <p class="page-subtitle">
        {{ isAdmin() ? 'Gérez les comptes, rôles et permissions.' : 'Consultez votre profil et gérez votre mot de passe.' }}
      </p>
    </div>
    @if (isAdmin()) {
      <button class="btn-primary" (click)="openCreateDialog()">
        <i class="pi pi-user-plus"></i> Nouvel utilisateur
      </button>
    }
  </div>

  <!-- Stats (admin) -->
  @if (isAdmin()) {
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-icon violet"><i class="pi pi-users"></i></div>
        <div><div class="stat-value">{{ users().length }}</div><div class="stat-label">Utilisateurs</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="pi pi-shield"></i></div>
        <div><div class="stat-value">{{ adminCount() }}</div><div class="stat-label">Admins</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber"><i class="pi pi-id-card"></i></div>
        <div><div class="stat-value">{{ roles().length }}</div><div class="stat-label">Rôles</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><i class="pi pi-calendar"></i></div>
        <div><div class="stat-value">{{ todayCount() }}</div><div class="stat-label">Créés aujourd'hui</div></div>
      </div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn" [class.active]="activeTab() === 'users'" (click)="activeTab.set('users')">
        <i class="pi pi-users"></i> Utilisateurs
      </button>
      <button class="tab-btn" [class.active]="activeTab() === 'roles'" (click)="activeTab.set('roles'); loadRoles()">
        <i class="pi pi-shield"></i> Rôles
      </button>
    </div>
  }

  <!-- ── NON-ADMIN PROFILE ── -->
  @if (!isAdmin()) {
    <div class="profile-card" style="max-width:640px">
      <div class="profile-banner"></div>
      <div class="profile-body">
        <div class="profile-avatar-wrap">
          <div class="avatar-lg">{{ initials(me()?.fullName) }}</div>
          <span class="role-badge user"><i class="pi pi-user" style="font-size:.65rem"></i> {{ me()?.role || 'user' }}</span>
        </div>
        <div class="profile-name">{{ me()?.fullName || '—' }}</div>
        <div class="profile-username">@{{ me()?.username }}</div>
        <div class="profile-grid">
          <div class="pf-item"><div class="pf-label">Identifiant</div><div class="pf-value">{{ me()?.username }}</div></div>
          <div class="pf-item"><div class="pf-label">Rôle</div><div class="pf-value" style="text-transform:capitalize">{{ me()?.role || 'user' }}</div></div>
          <div class="pf-item"><div class="pf-label">Nom complet</div><div class="pf-value">{{ me()?.fullName }}</div></div>
          <div class="pf-item"><div class="pf-label">Statut</div><div class="pf-value" style="color:var(--color-success)">● Actif</div></div>
        </div>
      </div>
    </div>

    <div class="section-card" style="max-width:640px">
      <div class="section-card-head">
        <span class="section-card-title"><i class="pi pi-lock"></i> Changer le mot de passe</span>
      </div>
      <div class="section-card-body">
        <form [formGroup]="pwdForm" (ngSubmit)="changePassword()">
          <div class="pwd-form">
            <div class="form-group">
              <label class="form-label">Mot de passe actuel</label>
              <input class="form-input" type="password" formControlName="currentPassword" placeholder="••••••••"/>
              @if (pwdForm.get('currentPassword')?.invalid && pwdForm.get('currentPassword')?.touched) {
                <div class="field-err">Champ requis</div>
              }
            </div>
            <div class="form-group">
              <label class="form-label">Nouveau mot de passe</label>
              <input class="form-input" type="password" formControlName="newPassword" placeholder="Min. 6 caractères"/>
              @if (pwdForm.get('newPassword')?.invalid && pwdForm.get('newPassword')?.touched) {
                <div class="field-err">Min. 6 caractères</div>
              }
            </div>
            <div class="form-group">
              <label class="form-label">Confirmation</label>
              <input class="form-input" type="password" formControlName="confirmPassword" placeholder="Répétez le mot de passe"/>
              @if (pwdForm.errors?.['mismatch'] && pwdForm.get('confirmPassword')?.touched) {
                <div class="field-err">Les mots de passe ne correspondent pas</div>
              }
            </div>
            <button type="submit" class="btn-save" [disabled]="savingPwd()">
              <i class="pi" [class.pi-check]="!savingPwd()" [class.pi-spinner]="savingPwd()" [class.pi-spin]="savingPwd()"></i>
              {{ savingPwd() ? 'Enregistrement…' : 'Modifier' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  }

  <!-- ── ADMIN: USERS TABLE ── -->
  @if (isAdmin() && activeTab() === 'users') {
    <div class="card">

      <!-- Toolbar -->
      <div class="card-toolbar" style="padding: 14px 20px;">
        <span class="card-section-label">Tous les comptes</span>
        <p-iconfield styleClass="usr-search">
          <p-inputicon styleClass="pi pi-search"/>
          <input pInputText [(ngModel)]="searchTerm" (input)="applyFilter()" placeholder="Rechercher un utilisateur…"/>
        </p-iconfield>
      </div>

      @if (loading()) {
        <p-table [value]="[1,2,3,4,5]" styleClass="usr-table p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>Utilisateur</th><th>Identifiant</th><th>Rôle</th><th>Créé le</th><th style="width:110px"></th></tr>
          </ng-template>
          <ng-template pTemplate="body">
            <tr class="skeleton-row">
              <td><p-skeleton height="34px" borderRadius="8px"/></td>
              <td><p-skeleton width="90px" height="18px" borderRadius="6px"/></td>
              <td><p-skeleton width="70px" height="22px" borderRadius="6px"/></td>
              <td><p-skeleton width="100px" height="18px" borderRadius="6px"/></td>
              <td><p-skeleton width="90px" height="28px" borderRadius="7px"/></td>
            </tr>
          </ng-template>
        </p-table>
      } @else {
        <p-table [value]="filteredUsers()" styleClass="usr-table p-datatable-sm"
                 [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10,20,50]"
                 [showCurrentPageReport]="true" currentPageReportTemplate="{first}–{last} sur {totalRecords}"
                 [sortMode]="'multiple'" [rowHover]="true" dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="fullName">Utilisateur <p-sortIcon field="fullName"/></th>
              <th pSortableColumn="username">Identifiant <p-sortIcon field="username"/></th>
              <th>Rôle</th>
              <th pSortableColumn="createdAt">Créé le <p-sortIcon field="createdAt"/></th>
              <th style="width:130px;text-align:right">Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-u>
            <tr>
              <td>
                <div class="user-cell">
                  <div class="user-av" [style.background]="avatarColor(u.fullName)">{{ initials(u.fullName) }}</div>
                  <div>
                    <div class="user-name">
                      {{ u.fullName }}
                      @if (u.id === me()?.userId) { <span class="you-badge">Vous</span> }
                    </div>
                  </div>
                </div>
              </td>
              <td class="text-mono" style="font-size:.82rem;color:var(--color-muted)">@{{ u.username }}</td>
              <td>
                <span class="role-badge" [ngClass]="roleClass(getUserRole(u.id))">
                  {{ getUserRole(u.id) || 'Aucun' }}
                </span>
              </td>
              <td style="font-size:.8rem;color:var(--color-muted)">{{ u.createdAt | date:'dd MMM yyyy' }}</td>
              <td>
                <div class="actions-cell">
                  <button class="act-btn edit"   title="Modifier"         (click)="openEditDialog(u)"><i class="pi pi-pencil"></i></button>
                  <button class="act-btn role"   title="Changer le rôle"  (click)="openRoleDialog(u)"><i class="pi pi-shield"></i></button>
                  <button class="act-btn delete" title="Supprimer"
                          [disabled]="u.id === me()?.userId" (click)="confirmDelete(u)"><i class="pi pi-trash"></i></button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5">
              <div class="empty-state">
                <div class="empty-ico">👤</div>
                <p class="empty-title">Aucun utilisateur trouvé</p>
                <p class="empty-sub">{{ searchTerm ? 'Aucun résultat pour "' + searchTerm + '"' : 'Aucun compte enregistré.' }}</p>
              </div>
            </td></tr>
          </ng-template>
        </p-table>
      }
    </div>
  }

  <!-- ── ADMIN: ROLES TABLE ── -->
  @if (isAdmin() && activeTab() === 'roles') {
    <div class="card">
      <div class="card-toolbar" style="padding: 14px 20px;">
        <span class="card-section-label">Gestion des rôles</span>
        <button class="btn-primary" (click)="openRoleCreateDialog()"><i class="pi pi-plus"></i> Nouveau rôle</button>
      </div>
      <p-table [value]="roles()" styleClass="usr-table p-datatable-sm" [rowHover]="true" dataKey="id">
        <ng-template pTemplate="header">
          <tr><th>Nom du rôle</th><th>Utilisateurs associés</th><th style="width:90px;text-align:right">Actions</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td><span class="role-badge" [ngClass]="roleClass(r.roleName)">{{ r.roleName }}</span></td>
            <td style="font-size:.82rem;color:var(--color-muted)">{{ countUsersWithRole(r.roleName) }} utilisateur{{ countUsersWithRole(r.roleName) !== 1 ? 's' : '' }}</td>
            <td><div class="actions-cell"><button class="act-btn delete" (click)="confirmDeleteRole(r)"><i class="pi pi-trash"></i></button></div></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="3">
            <div class="empty-state">
              <div class="empty-ico">🛡️</div>
              <p class="empty-title">Aucun rôle</p>
              <p class="empty-sub">Créez votre premier rôle.</p>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>
  }
</div>

<!-- Dialog: Create / Edit User -->
<p-dialog
  [(visible)]="userDialogVisible"
  [header]="dialogTitle"
  [modal]="true"
  [style]="{width:'440px'}"
  [draggable]="false"
  styleClass="usr-dialog">
  <form [formGroup]="userForm">
    <div class="form-group"><label class="form-label">Nom complet *</label>
      <input class="form-input" formControlName="fullName" placeholder="Prénom Nom"/>
      @if (userForm.get('fullName')?.invalid && userForm.get('fullName')?.touched) { <div class="field-err">Champ requis</div> }
    </div>
    <div class="form-group"><label class="form-label">Identifiant (username) *</label>
      <input class="form-input" formControlName="username" placeholder="ex: jdupont"/>
      @if (userForm.get('username')?.invalid && userForm.get('username')?.touched) { <div class="field-err">Champ requis</div> }
    </div>
    @if (!editMode) {
      <div class="form-group"><label class="form-label">Mot de passe *</label>
        <input class="form-input" type="password" formControlName="password" placeholder="Min. 6 caractères"/>
        @if (userForm.get('password')?.invalid && userForm.get('password')?.touched) { <div class="field-err">Min. 6 caractères requis</div> }
      </div>
      <div class="form-group"><label class="form-label">Rôle</label>
        <p-select
          formControlName="roleName"
          [options]="roles()"
          optionLabel="roleName"
          optionValue="roleName"
          placeholder="Sélectionner un rôle (optionnel)"
          [showClear]="true"
          appendTo="body"/>
      </div>
    }
  </form>
  <ng-template pTemplate="footer">
    <button class="btn-ghost" (click)="userDialogVisible = false">Annuler</button>
    <button class="btn-primary" (click)="saveUser()" [disabled]="saving()">
      <i class="pi" [class.pi-check]="!saving()" [class.pi-spinner]="saving()" [class.pi-spin]="saving()"></i>
      {{ saving() ? 'Enregistrement…' : (editMode ? 'Enregistrer' : 'Créer') }}
    </button>
  </ng-template>
</p-dialog>

<!-- Dialog: Change Role -->
<p-dialog
  [(visible)]="roleDialogVisible"
  header="Changer le rôle"
  [modal]="true"
  [style]="{width:'380px'}"
  [draggable]="false"
  styleClass="usr-dialog">
  @if (selectedUser()) {
    <div style="margin-bottom:14px">
      <div style="font-size:.8rem;color:var(--color-muted);margin-bottom:10px">
        Utilisateur : <strong style="color:var(--color-dark)">{{ selectedUser()?.fullName }}</strong>
        <span class="text-mono" style="font-size:.75rem;color:var(--color-muted2)"> (@{{ selectedUser()?.username }})</span>
      </div>
      <div class="form-group">
        <div class="pf-label">Rôle actuel</div>
        <span class="role-badge" [ngClass]="roleClass(getUserRole(selectedUser()?.id!))">{{ getUserRole(selectedUser()?.id!) || 'Aucun' }}</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Nouveau rôle *</label>
      <p-select
        [(ngModel)]="newRoleId"
        [options]="roles()"
        optionLabel="roleName"
        optionValue="id"
        placeholder="Sélectionner un rôle"
        appendTo="body"/>
    </div>
  }
  <ng-template pTemplate="footer">
    <button class="btn-ghost" (click)="roleDialogVisible = false">Annuler</button>
    <button class="btn-primary" (click)="applyRoleChange()" [disabled]="!newRoleId || saving()">
      <i class="pi" [class.pi-check]="!saving()" [class.pi-spinner]="saving()" [class.pi-spin]="saving()"></i>
      {{ saving() ? 'Application…' : 'Appliquer' }}
    </button>
  </ng-template>
</p-dialog>

<!-- Dialog: Create Role -->
<p-dialog [(visible)]="roleCreateDialogVisible" [modal]="true" [style]="{width:'360px'}" [draggable]="false" styleClass="usr-dialog">
  <ng-template pTemplate="header"><span><i class="pi pi-shield" style="margin-right:7px"></i> Nouveau rôle</span></ng-template>
  <div class="form-group">
    <label class="form-label">Nom du rôle *</label>
    <input class="form-input" [(ngModel)]="newRoleName" placeholder="ex: enseignant, etudiant…"/>
  </div>
  <ng-template pTemplate="footer">
    <button class="btn-ghost" (click)="roleCreateDialogVisible = false">Annuler</button>
    <button class="btn-primary" (click)="createRole()" [disabled]="!newRoleName || saving()"><i class="pi pi-plus"></i> Créer</button>
  </ng-template>
</p-dialog>
  `,
})
export class UserListComponent implements OnInit {
  private http  = inject(HttpClient);
  private auth  = inject(AuthService);
  private fb    = inject(FormBuilder);
  private msg   = inject(MessageService);
  private conf  = inject(ConfirmationService);
  private base  = `${environment.apiUrl}`;

  isAdmin = this.auth.isAdmin;
  me      = this.auth.currentUser;

  users      = signal<UserDto[]>([]);
  roles      = signal<RoleDto[]>([]);
  userRoles  = signal<UserRoleDto[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  savingPwd  = signal(false);
  activeTab  = signal<'users' | 'roles'>('users');
  searchTerm = '';

  filteredUsers = computed(() => {
    const t = this.searchTerm.toLowerCase();
    return t ? this.users().filter(u => u.fullName.toLowerCase().includes(t) || u.username.toLowerCase().includes(t)) : this.users();
  });
  adminCount = computed(() => this.userRoles().filter(ur => this.roles().find(r => r.id === ur.roleId)?.roleName?.toLowerCase() === 'admin').length);
  todayCount = computed(() => { const today = new Date().toDateString(); return this.users().filter(u => u.createdAt && new Date(u.createdAt).toDateString() === today).length; });

  userDialogVisible       = false;
  roleDialogVisible       = false;
  roleCreateDialogVisible = false;
  editMode                = false;
  selectedUser            = signal<UserDto | null>(null);
  newRoleId               = '';
  newRoleName             = '';
  editingId?: string;

  userForm!: FormGroup;
  pwdForm!:  FormGroup;

  get dialogTitle(): string {
    return this.editMode ? 'Modifier l\u2019utilisateur' : 'Nouvel utilisateur';
  }

  ngOnInit() {
    this.userForm = this.fb.group({ fullName: ['', Validators.required], username: ['', Validators.required], password: ['', [Validators.required, Validators.minLength(6)]], roleName: [null] });
    this.pwdForm  = this.fb.group({ currentPassword: ['', Validators.required], newPassword: ['', [Validators.required, Validators.minLength(6)]], confirmPassword: ['', Validators.required] }, { validators: (g: AbstractControl) => g.get('newPassword')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true } });
    if (this.isAdmin()) this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    forkJoin({ users: this.http.get<UserDto[]>(`${this.base}/users`), roles: this.http.get<RoleDto[]>(`${this.base}/roles`), userRoles: this.http.get<UserRoleDto[]>(`${this.base}/userroles`) })
      .pipe(catchError(() => { this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données' }); return of({ users: [], roles: [], userRoles: [] }); }))
      .subscribe(({ users, roles, userRoles }) => { this.users.set(users); this.roles.set(roles); this.userRoles.set(userRoles); this.loading.set(false); });
  }

  loadRoles() { this.http.get<RoleDto[]>(`${this.base}/roles`).subscribe(r => this.roles.set(r)); }
  applyFilter() {}

  getUserRole(userId: string): string { const ur = this.userRoles().find(r => r.userId === userId); return ur ? this.roles().find(r => r.id === ur.roleId)?.roleName || '' : ''; }
  getUserRoleAssignment(userId: string) { return this.userRoles().find(r => r.userId === userId); }
  countUsersWithRole(roleName: string): number { const role = this.roles().find(r => r.roleName === roleName); return role ? this.userRoles().filter(ur => ur.roleId === role.id).length : 0; }
  initials(name?: string): string { if (!name) return '?'; return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(); }
  avatarColor(name: string): string { const c = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899']; return c[[...(name||'A')].reduce((a,x) => a + x.charCodeAt(0), 0) % c.length]; }
  roleClass(role: string): string { return role?.toLowerCase() === 'admin' ? 'admin' : role ? 'user' : 'none'; }

  openCreateDialog() { this.editMode = false; this.editingId = undefined; this.userForm.reset({ roleName: null }); this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]); this.userForm.get('password')?.updateValueAndValidity(); this.userDialogVisible = true; }
  openEditDialog(u: UserDto) { this.editMode = true; this.editingId = u.id; this.userForm.get('password')?.clearValidators(); this.userForm.get('password')?.updateValueAndValidity(); this.userForm.patchValue({ fullName: u.fullName, username: u.username, password: '', roleName: null }); this.userDialogVisible = true; }

  saveUser() {
    this.userForm.markAllAsTouched();
    if (this.userForm.invalid) return;
    this.saving.set(true);
    const { fullName, username, password, roleName } = this.userForm.value;
    const req$ = this.editMode && this.editingId
      ? this.http.put<UserDto>(`${this.base}/users/${this.editingId}`, { fullName, username })
      : this.http.post(`${this.base}/auth/register`, { fullName, username, password, roleName: roleName || undefined });
    req$.subscribe({
      next:  () => { this.msg.add({ severity: 'success', summary: this.editMode ? 'Modifié' : 'Créé ✓', detail: `${fullName} ${this.editMode ? 'mis à jour' : 'créé'}` }); this.userDialogVisible = false; this.saving.set(false); this.loadAll(); },
      error: (e) => { this.msg.add({ severity: 'error', summary: 'Erreur', detail: e?.error?.message || 'Échec' }); this.saving.set(false); },
    });
  }

  confirmDelete(u: UserDto) {
    this.conf.confirm({ message: `Supprimer <strong>${u.fullName}</strong> ?<br><small style="color:#6b7280">Irréversible.</small>`, header: 'Confirmer', icon: 'pi pi-exclamation-triangle', acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger p-button-sm', rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => { const ur = this.getUserRoleAssignment(u.id); const del = () => this.http.delete(`${this.base}/users/${u.id}`).subscribe({ next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé', detail: 'Utilisateur supprimé' }); this.loadAll(); }, error: () => this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer' }) }); ur ? this.http.delete(`${this.base}/userroles/${ur.id}`).subscribe({ next: del, error: del }) : del(); }
    });
  }

  openRoleDialog(u: UserDto) { this.selectedUser.set(u); this.newRoleId = ''; this.roleDialogVisible = true; }

  applyRoleChange() {
    const u = this.selectedUser(); if (!u || !this.newRoleId) return;
    this.saving.set(true);
    const assign = () => this.http.post(`${this.base}/userroles`, { userId: u.id, roleId: this.newRoleId }).subscribe({ next: () => { this.msg.add({ severity: 'success', summary: 'Rôle mis à jour', detail: `Rôle de ${u.fullName} modifié` }); this.roleDialogVisible = false; this.saving.set(false); this.loadAll(); }, error: () => { this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de changer le rôle' }); this.saving.set(false); } });
    const existing = this.getUserRoleAssignment(u.id);
    existing ? this.http.delete(`${this.base}/userroles/${existing.id}`).subscribe({ next: assign, error: assign }) : assign();
  }

  openRoleCreateDialog() { this.newRoleName = ''; this.roleCreateDialogVisible = true; }
  createRole() { if (!this.newRoleName.trim()) return; this.saving.set(true); this.http.post<RoleDto>(`${this.base}/roles`, { roleName: this.newRoleName.trim() }).subscribe({ next: () => { this.msg.add({ severity: 'success', summary: 'Créé', detail: `Rôle "${this.newRoleName}" créé` }); this.roleCreateDialogVisible = false; this.saving.set(false); this.loadRoles(); }, error: () => { this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer le rôle' }); this.saving.set(false); } }); }

  confirmDeleteRole(r: RoleDto) { this.conf.confirm({ message: `Supprimer <strong>${r.roleName}</strong> ?`, header: 'Confirmer', icon: 'pi pi-exclamation-triangle', acceptLabel: 'Supprimer', rejectLabel: 'Annuler', acceptButtonStyleClass: 'p-button-danger p-button-sm', rejectButtonStyleClass: 'p-button-text p-button-sm', accept: () => this.http.delete(`${this.base}/roles/${r.id}`).subscribe({ next: () => { this.msg.add({ severity: 'success', summary: 'Supprimé', detail: `Rôle "${r.roleName}" supprimé` }); this.loadAll(); }, error: () => this.msg.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le rôle' }) }) }); }

 changePassword() {
    this.pwdForm.markAllAsTouched();
    if (this.pwdForm.invalid) return;

    const token = localStorage.getItem('wf_auth_token');
    if (!token) {
    this.msg.add({ severity: 'error', summary: 'Session expirée', detail: 'Veuillez vous reconnecter.' });
    return;
    }

    this.savingPwd.set(true);
    const { currentPassword, newPassword } = this.pwdForm.value;

    this.http.put(`${this.base}/auth/change-password`, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Mot de passe modifié ✓', detail: 'Votre mot de passe a été mis à jour.' });
        this.pwdForm.reset();
        this.savingPwd.set(false);
      },
      error: (e) => {
        const status = e?.status;
        const detail = e?.error?.message || e?.error?.title || e?.message || `HTTP ${status}`;
        console.error('[changePassword] HTTP', status, e);
        this.msg.add({ severity: 'error', summary: `Erreur (${status})`, detail, life: 8000 });
        this.savingPwd.set(false);
      },
    });
  }
}