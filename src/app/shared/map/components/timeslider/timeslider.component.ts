import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { loadingAlert, errorAlert } from '../../../../shared/services/alerts';
import * as L from 'leaflet';

// Services
import { GlobalsService } from 'src/app/shared/services/globals.service';
import { SidebarService } from 'src/app/shared/services/sidebar.service';
import { LessThanTodayService } from 'src/app/shared/validators/less-than-today.service';

// Datepicker
import * as moment from 'moment';
import { MatDatepicker } from '@angular/material/datepicker';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { WeekValidatorService } from 'src/app/shared/validators/week-validator.service';
import { MapService } from 'src/app/shared/services/map.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminService } from 'src/app/admin/services/admin.service';

export const MY_FORMATS = {
    parse: {
        dateInput: 'MM/YYYY',
    },
    display: {
        dateInput: 'MMMM YYYY',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    },
};

@Component({
  standalone: false,
    selector: 'app-timeslider',
    templateUrl: './timeslider.component.html',
    styleUrls: [],
    providers: [
        {
            provide: DateAdapter,
            useClass: MomentDateAdapter,
            deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
        },
        { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    ]
})
export class TimesliderComponent implements OnInit {

    private unsubscribe$ = new Subject<void>();

    constructor(
        public globalsService: GlobalsService,
        public sidebarService: SidebarService,
        private mapService: MapService,
        private adminService: AdminService,
        private fb: FormBuilder,
        private dateValidator: LessThanTodayService,
        private weekValidator: WeekValidatorService
    ) { }

    // FormControl
    requestForm: FormGroup = this.fb.group({
        layerRequest: ['', [Validators.required]],
        dateRequest: [new Date(), [Validators.required], [this.dateValidator]],
        weekRequest: ['', [Validators.required], [this.weekValidator]],
        featureCollectionRequest: [/*this.featureCollection*/],
    });

    date = this.requestForm.get('dateRequest');

    // Input values
    layers: any[] = [];

    weeks: any[] = [
        { value: { week: 's1', weekDate: this.date?.value }, viewValue: 'Semana 1' },
        { value: { week: 's2', weekDate: this.date?.value }, viewValue: 'Semana 2' },
        { value: { week: 's3', weekDate: this.date?.value }, viewValue: 'Semana 3' },
        { value: { week: 's4', weekDate: this.date?.value }, viewValue: 'Semana 4' }
    ];

    ngOnInit(): void {
        const timeslider = document.querySelector('.timeslider');
        const timesliderToggle = document.querySelector('.timeslider__toggle');
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.querySelector('.sidebar__toggle');

        // Timeslider toggle
        timesliderToggle?.addEventListener('click', () => {
            const cond = sidebar?.classList.contains('sidebar--extended') && window.matchMedia("(max-width: 600px)").matches;
            if (!cond) {
                timeslider?.classList.toggle('timeslider--active');
            }
        })
        // Sidebar toggle listener
        sidebarToggle?.addEventListener('click', () => {
            timeslider?.classList.remove('timeslider--active');
        })

        this.adminService.getIndexes()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe(indexes => {
                const layers: any[] = [];
                indexes.forEach(index => {
                    layers.push({ value: index.indiceId, viewValue: index.siglasIndice });
                })
                this.layers = layers;
            });
    }

    chosenYearHandler(normalizedYear: moment.Moment) {
        const year = moment(normalizedYear).year();
        this.date?.value.setYear(year);
    }

    chosenMonthHandler(normalizedMonth: moment.Moment, datepicker: MatDatepicker<moment.Moment>) {
        const month = moment(normalizedMonth).month();
        this.date?.value.setMonth(month);
        this.date?.setValue(this.date.value);
        this.requestForm?.get('weekRequest')?.reset();
        datepicker.close();
    }

    sendRequest() {

        console.log('Datos del formulario antes:', this.requestForm.value);

        if (this.mapService.viewListLength < 5) {
            const features = this.mapService.getAllFlights();
            if (features.length === 0) {
                errorAlert('Debe haber vuelos cargados en el mapa para realizar una consulta satelital.')
                return
            }
            const featureCollection: any = {
                type: "FeatureCollection",
                features: features
            }

            if (this.requestForm.invalid) {
                this.requestForm.markAllAsTouched();
                return;
            }
            const request = {
                indiceId: this.requestForm.value.layerRequest,
                fecha: this.requestForm.value.dateRequest,
                semana: this.requestForm.value.weekRequest.week,
                featureCollectionRequest: featureCollection
            }

            console.log('Datos del formulario después:', this.requestForm.value);

            this.mapService.viewListLength += 1;
            loadingAlert('Obteniendo análisis');

            // Google Earth Engine service
            this.mapService.getSateliteAnalysis(request)
                .pipe(takeUntil(this.unsubscribe$))
                .subscribe((url) => {
                    if (!url.url) {
                        this.mapService.viewListLength -= 1;
                        this.mapService.updateView();
                        errorAlert('No se encontraron análisis para la fecha indicada')
                    } else {
                        Swal.close();
                        document.querySelector('.timeslider')?.classList.toggle('timeslider--active');
                        const index = this.layers.filter(layer => layer.value === request.indiceId)[0].viewValue;
                        const dateStr = request.fecha.toLocaleDateString("es-ES", { year: 'numeric', month: 'long' });
                        const date = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
                        const week = request.semana.slice(1);
                        const cond = this.mapService.viewList.some((s: any) => s.index === index && s.date === date && s.week === week);

                        if (cond) {
                            errorAlert('El análisis solicitado ya se encuentra agregado a la vista');
                        } else {
                            /* Add satelite analysis to map */
                            const requestUrl = url.url;
                            const requestBounds = L.geoJSON(request.featureCollectionRequest).getBounds();
                            const imageOverlay = L.imageOverlay(requestUrl, requestBounds);
                            this.mapService.addImageOverlay(imageOverlay, requestBounds);

                            /* Add satelite analysis to view */
                            const sateliteAnalysis = {
                                index: index,
                                date: date,
                                week: week,
                                image: imageOverlay,
                                show: true
                            }
                            this.mapService.addSateliteAnalysisToView(sateliteAnalysis);
                            // Añade la leyenda de la capa de indice de vegetación
                            this.mapService.addReferences();
                            this.mapService.openView();
                        }
                    }
                })
        } else {
            errorAlert('No se pueden agregar más análisis', 'Se permiten como máximo 5 análisis cargados en la vista');
        }
    }



}
