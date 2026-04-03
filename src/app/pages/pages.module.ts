import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FrameworksModule } from '../frameworks/frameworks.module';
import { MapModule } from '../shared/map/map.module';
import { SharedModule } from '../shared/shared.module';
import { SearchComponent } from './components/search/search.component';
import { OwnerComponent } from './owner/owner.component';
import { OwnersComponent } from './owners/owners.component';
import { PagesRoutingModule } from './pages-routing.module';
import { PagesComponent } from './pages.component';
//import { AddObservationComponent } from './add-observation/add-observation.component';
import { ReportComponent } from './components/report/report.component';
import { AuthModule } from '../auth/auth.module';
import { OwnerDataInfoComponent } from './components/owner-data-info/owner-data-info.component';
import { FlightsComponent } from './components/flights/flights.component';
import { AddFlightComponent } from './add-flight/add-flight.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';


@NgModule({
    declarations: [
        OwnersComponent,
        PagesComponent,
        SearchComponent,
        OwnerComponent,
        //AddObservationComponent,
        ReportComponent,
        OwnerDataInfoComponent,
        FlightsComponent,
        AddFlightComponent,
    ],
    imports: [
        CommonModule,
        PagesRoutingModule,
        SharedModule,
        MapModule,
        FrameworksModule,
        FormsModule,
        ReactiveFormsModule,
        AuthModule,
        MatTooltipModule,
        MatFormFieldModule, // Requerido para <mat-form-field>
        MatInputModule, // Requerido para <input matInput>
        MatAutocompleteModule, // Requerido para <mat-autocomplete>
        MatProgressSpinnerModule, // indicador de loading para el modulo de imrpimir mapa de vuelo
        MatCheckboxModule,

    ],
})
export class PagesModule { }
