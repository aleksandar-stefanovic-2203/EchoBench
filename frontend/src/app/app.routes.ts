import { type Routes } from '@angular/router';
import { authGuard } from './core/auth';
export const routes: Routes = [
  {path:'',pathMatch:'full',redirectTo:'surveys'},
  {path:'login',loadComponent:()=>import('./features/auth/auth.component').then(m=>m.AuthComponent)},
  {path:'register',loadComponent:()=>import('./features/auth/auth.component').then(m=>m.AuthComponent)},
  {path:'surveys',canActivate:[authGuard],loadComponent:()=>import('./features/surveys/list.component').then(m=>m.ListComponent)},
  {path:'surveys/new',canActivate:[authGuard],loadComponent:()=>import('./features/surveys/editor.component').then(m=>m.EditorComponent)},
  {path:'surveys/:id/edit',canActivate:[authGuard],loadComponent:()=>import('./features/surveys/editor.component').then(m=>m.EditorComponent)},
  {path:'surveys/:id',canActivate:[authGuard],loadComponent:()=>import('./features/surveys/detail.component').then(m=>m.DetailComponent)},
  {path:'s/:publicToken',loadComponent:()=>import('./features/public-survey/public.component').then(m=>m.PublicComponent)},
  {path:'**',redirectTo:'surveys'}
];
