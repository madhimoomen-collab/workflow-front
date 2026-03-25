// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const APP_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'workflows',
        pathMatch: 'full'
      },
      {
        path: 'workflows',
        loadChildren: () =>
          import('./features/workflow-definitions/workflow-definitions.routes')
            .then(m => m.WORKFLOW_DEFINITIONS_ROUTES)
      },
      {
        // Instances: admin only
        path: 'instances',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/workflow-instances/workflow-instances.routes')
            .then(m => m.WORKFLOW_INSTANCES_ROUTES)
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./features/users/users.routes').then(m => m.USERS_ROUTES)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'workflows'
  }
];