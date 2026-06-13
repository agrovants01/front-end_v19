import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { IndexesComponent } from './indexes/indexes.component';
import { SidebarAdminComponent } from './sidebar-admin/sidebar-admin.component';
import { UploadAnalysisLayerComponent } from './upload-analysis-layer/upload-analysis-layer.component';
import { UploadDataComponent } from './upload-data/upload-data.component';
import { BackupAdminComponent } from './backup/backup.component';
import { UsersComponent } from './users/users.component';
import { OwnerGuard } from '../auth/guards/owner.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { FlightsAdminComponent } from './flights-admin/flights-admin.component';
import { RemitoAdminComponent } from './remito-admin/remito-admin.component';
import { GestionAdminComponent } from './gestion-admin/gestion-admin.component';
import { AgrochemicalsComponent } from './agrochemicals/agrochemicals.component';
import { AdjuvantsComponent } from './adjuvants/adjuvants.component';
import { OrdenPedidoComponent } from './orden-pedido/orden-pedido.component';
import { BackupLoginComponent } from './backup-login/backup-login.component';
import { BackupGuard } from './guards/backup.guard';

const routes: Routes = [
    {
        path: 'users',
        component: UsersComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'agrochemicals',
        component: AgrochemicalsComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'adjuvants',
        component: AdjuvantsComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'upload-analysis',
        component: UploadAnalysisLayerComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'upload-flights',
        component: UploadDataComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'indexes',
        component: IndexesComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'backups',
        component: BackupAdminComponent,
        canActivate: [AuthGuard, BackupGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'backup-login',
        component: BackupLoginComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'flights-admin',
        component: FlightsAdminComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'remito-admin',
        component: RemitoAdminComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'gestion-admin',
        component: GestionAdminComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: 'orden-pedido',
        component: OrdenPedidoComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    },
    {
        path: '',
        component: AdminComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: SidebarAdminComponent },
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AdminRoutingModule { }
