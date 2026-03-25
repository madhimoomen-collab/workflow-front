// src/app/features/workflow-instances/workflow-instances.routes.ts

import { Routes } from '@angular/router';

export const WORKFLOW_INSTANCES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./instance-list/instance-list.component').then(m => m.InstanceListComponent),
  },
];