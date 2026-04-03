import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OwnerGuard } from '../auth/guards/owner.guard';
//import { AddObservationComponent } from './add-observation/add-observation.component';
import { OwnerComponent } from './owner/owner.component';
import { OwnersComponent } from './owners/owners.component';
import { PagesComponent } from './pages.component';
import { FlightsComponent } from './components/flights/flights.component';
import { AddFlightComponent } from './add-flight/add-flight.component';

const routes: Routes = [
    {
        path: '',
        component: PagesComponent,
        canActivate: [AuthGuard],
        canLoad: [AuthGuard],
        children: [
            {
                //va hacia la pagina que muestra todos los propietarios siendo "admin"
                path: 'owners', component: OwnersComponent,
                canActivate: [OwnerGuard],
            },
            {
                //va hacia la pagina que muestra todos los vuelos logueado como "piloto"
                path: 'flights/:id',
                children: [
                    {
                        path: '',
                        component: FlightsComponent
                    },
                    {
                        path: 'add-flight',
                        component: AddFlightComponent
                    },

                ],
                canActivate: [OwnerGuard]
            },
            {
                // va hacia la pagina que muestra todos los vuelos del propietario elejido.
                path: 'owner/:id',
                children: [
                    {
                        path: '',
                        component: OwnerComponent
                    },
                    {
                        path: 'add-flight',
                        component: AddFlightComponent
                    }
                ],
                canActivate: [OwnerGuard]
            },
            { path: '', redirectTo: 'owners', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: '404', pathMatch: 'full' }
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PagesRoutingModule { }
