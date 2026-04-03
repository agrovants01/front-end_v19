import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { SearchLocationComponent } from './components/search-location/search-location.component';
import { TimesliderComponent } from './components/timeslider/timeslider.component';
import { FrameworksModule } from 'src/app/frameworks/frameworks.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ViewComponent } from './components/view/view.component';
import { ReferencesComponent } from './components/references/references.component';
import { UploadAnalysisLayerComponent } from 'src/app/admin/upload-analysis-layer/upload-analysis-layer.component';
import { WeatherForecastComponent } from './components/weather-forecast/weather-forecast.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
    declarations: [
        MapComponent,
        SearchLocationComponent,
        TimesliderComponent,
        ViewComponent,
        ReferencesComponent,
        WeatherForecastComponent,
        //UploadAnalysisLayerComponent
    ],
    imports: [
        CommonModule,
        FrameworksModule,
        FormsModule,
        ReactiveFormsModule,
        MatIconModule,
    ],
    exports: [
        MapComponent
    ]
})
export class MapModule { }
