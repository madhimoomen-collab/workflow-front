import { Routes } from '@angular/router';
import { WorkflowListComponent } from './workflow-list/workflow-list.component';
import { WorkflowDesignerComponent } from '../workflow-designer/workflow-designer.component';

export const WORKFLOW_DEFINITIONS_ROUTES: Routes = [
  {
    path: '',
    component: WorkflowListComponent
  },
  {
    path: 'designer/:id',
    component: WorkflowDesignerComponent
  }
];
