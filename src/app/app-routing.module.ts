import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth.guard';
import { OwnerGuard } from './auth/guards/owner.guard';
import { NotFound404Component } from './not-found404/not-found404.component';

const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
    },
    {
        path: 'admin',
        loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
        canActivate: [AuthGuard, OwnerGuard],
        canLoad: [AuthGuard],
    },
    {
        path: 'config',
        loadChildren: () => import('./config/config.module').then(m => m.ConfigModule),
        canActivate: [AuthGuard],
        canLoad: [AuthGuard],
    },
    {
        path: '',
        loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule)
    },
    {
        path: '404',
        component: NotFound404Component
    },
    { path: '**', redirectTo: '404', pathMatch: 'full' } //Wrong route, ERROR 404
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
