import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { SidebarAdminComponent } from './sidebar-admin/sidebar-admin.component';
import { UploadAnalysisLayerComponent } from './upload-analysis-layer/upload-analysis-layer.component';
import { UploadDataComponent } from './upload-data/upload-data.component';
import { FrameworksModule } from '../frameworks/frameworks.module';
import { AdminComponent } from './admin.component';
import { SharedModule } from '../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IndexesComponent } from './indexes/indexes.component';
import { BackupComponent } from './backup/backup.component';
import { UsersComponent } from './users/users.component';
import { UserFormComponent } from './components/user-form/user-form.component';
import { IndexFormComponent } from './components/index-form/index-form.component';
import { BackupFormComponent } from './components/backup-form/backup-form.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FlightsAdminComponent } from './flights-admin/flights-admin.component';
import { FlightsBatchEditComponent } from './flights-admin/flights-batch-edit.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { RemitoAdminComponent } from './remito-admin/remito-admin.component';
import { MatTabsModule } from '@angular/material/tabs';
import { RemitoConsultaComponent } from './remito-consulta/remito-consulta.component';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GestionAdminComponent } from './gestion-admin/gestion-admin.component';

import { AgrochemicalsComponent } from './agrochemicals/agrochemicals.component';
import { AgrochemicalFormComponent } from './components/agrochemical-form/agrochemical-form.component';

import { AdjuvantsComponent } from './adjuvants/adjuvants.component';
import { AdjuvantFormComponent } from './components/adjuvant-form/adjuvant-form.component';

import { OrdenPedidoComponent } from './orden-pedido/orden-pedido.component';
import { OrdenPedidoFormComponent } from './orden-pedido/orden-pedido-form.component';
import { NumberSeparatorPipe } from './orden-pedido/number-separator.pipe';
import { FormatNumberDirective } from './orden-pedido/format-number.directive';


@NgModule({
    declarations: [
        SidebarAdminComponent,
        UploadAnalysisLayerComponent,
        UploadDataComponent,
        AdminComponent,
        IndexesComponent,
        BackupComponent,
        UsersComponent,
        UserFormComponent,
        IndexFormComponent,
        BackupFormComponent,
        FlightsAdminComponent,
        FlightsBatchEditComponent,
        RemitoAdminComponent,
        RemitoConsultaComponent,
        GestionAdminComponent,
        AgrochemicalsComponent,
        AgrochemicalFormComponent,
        AdjuvantsComponent,
        AdjuvantFormComponent,
        OrdenPedidoComponent,
        OrdenPedidoFormComponent,
        NumberSeparatorPipe,
        FormatNumberDirective
    ],
    imports: [
        CommonModule,
        AdminRoutingModule,
        FrameworksModule,
        SharedModule,
        FormsModule,
        MatCheckboxModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatInputModule,
        MatTabsModule,
        MatSelectModule,
        MatTooltipModule,
        MatMenuModule
    ],
    exports: [
        SidebarAdminComponent, // <-- AGREGAR ESTO
        // otros componentes que otros módulos necesiten
    ]
})
export class AdminModule { }
