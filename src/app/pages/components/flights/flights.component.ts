import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { asyncScheduler, combineLatest, Observable, of, scheduled, Subject, Subscription } from 'rxjs';
import { catchError, combineAll, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AdminService } from 'src/app/admin/services/admin.service';
import { UserList } from 'src/app/admin/users/users.interface';
import { GlobalsService } from 'src/app/shared/services/globals.service';
import { MapService } from 'src/app/shared/services/map.service';
import { SidebarService } from 'src/app/shared/services/sidebar.service';
import { errorAlert, confirmAlert, successAlert } from '../../../shared/services/alerts';
import { ReportComponent } from '../report/report.component';
import { LayerService } from '../../services/layer.service';
import { ObservationsService } from '../../services/observations.service';
import { OwnerService } from '../../services/owner.service';
import * as L from 'leaflet';
import { FlightsService } from '../../services/flights.service';
import { jsPDF } from 'jspdf';
import { DatePipe, DecimalPipe, formatDate } from '@angular/common';
import domtoimage from 'dom-to-image-more';
import { ImprimirVueloService } from 'src/app/admin/services/imprimirVuelo.service';

@Component({
  standalone: false,
    selector: 'app-flights',
    host: { 'class': 'sidebar__content-flex' },
    templateUrl: './flights.component.html',
    styles: []
})
export class FlightsComponent implements OnInit, OnDestroy {
    [x: string]: any;
    map!: L.Map;

    private unsubscribe$ = new Subject<void>();
    public selectedFlight: any;
    private flightsVisibility: { [id: string]: boolean } = {};
    private toggleCount: number = 0;




    value: string = '';

    // variable user de tipo UserList
    user: (UserList | undefined);

    nombreCompleto: string = '';
    idUsuarioPilotoLogueado: string = '';


    range = new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
    });

    flightsRequired: boolean = true;
    analysisRequired: boolean = true;
    observationsRequired: boolean = true;

    // Se inicializa la lista de datos de los vuelos
    ownerDataList: any[] = [];

    sortingCriterion: boolean = true;

    loading: boolean = false;

    searchUsers = new FormControl('');

    filteredOwnerDataList: any[] = [];

    isEditingPolygon: boolean = false;
    private subscription: Subscription | undefined;


    constructor(

        public sidebarService: SidebarService,
        public globalsService: GlobalsService,
        public mapService: MapService,
        public flightsService: FlightsService,
        private adminService: AdminService,
        private ownerService: OwnerService,
        private observationsService: ObservationsService,
        private layerService: LayerService,
        private router: Router,
        private route: ActivatedRoute,
        public dialog: MatDialog,
        private imprimirVueloService: ImprimirVueloService
    ) {
        this.route.params
            .pipe(
                takeUntil(this.unsubscribe$), // Se ejecuta el observable hasta que se desuscriba
                map((data: any) => {
                    const { id } = data;

                    return id;
                }),
                switchMap((id) => { // cancela la entrada del usuario y la vuelve a ejecutar
                    // toma los datos del usuario pasandole el id de usuario
                    return this.adminService.getUser(id)
                })
            ).subscribe((user: UserList) => {
                if (!user) {
                    this.router.navigate(['404'])
                }
                // Asigna el usuario obtenido por el switchMap a la variable user
                this.user = user;

                // this.nombreCompleto = user.nombreUsuario + ' ' + user.apellidoUsuario;

                if (user.aliasUsuario) {
                    this.nombreCompleto = user.aliasUsuario;
                } else {
                    this.nombreCompleto = user.nombreUsuario + ' ' + user.apellidoUsuario;
                }


                localStorage.setItem('nombreCompleto', this.nombreCompleto);
                localStorage.setItem('idUsuarioPilotoLogueado', user.usuarioId)
            })
    }

    ngOnInit(): void {

        this.searchUsers.valueChanges.subscribe((value) => {
            if (value) {
                this.applyFilters();
            } else {
                this.filteredOwnerDataList = this.ownerDataList;
            }
        });


        // Aparece el timeslider al cargar los datos del propietario elegido.
        this.mapService.addTimeslider();

        const today = new Date(); // Obtenemos la fecha actual
        const month = (today.getMonth() === 0) ? 12 : today.getMonth();
        // restamos 20 años para que muestre todos los vuelos asi no hay necesidad de buscar constantemente.
        const initStartDate = new Date(((today.getFullYear() - 1).toString()) + '-' + month.toString() + '-' + today.getDate().valueOf().toString());
        this.range.reset({
            start: initStartDate,
            end: today
        })
        this.formatRangeDates();
        this.ownerService.elementDeleted
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((_) => {
                this.formatRangeDates();
            })

    }

    formatRangeDates() {
        const dateSince = this.range.get('start')?.value;
        const dateUntil = this.range.get('end')?.value;
        if (!dateSince || !dateUntil) {
            return;
        }
        const range = {
            fechaDesde: formatDate(dateSince, 'yyyy-MM-dd', 'es-Ar'),
            fechaHasta: formatDate(dateUntil, 'yyyy-MM-dd', 'es-Ar'),
        }

        this.getOwnerData(range)
            .pipe(
                takeUntil(this.unsubscribe$),
                tap((userData: any[]) => {
                    this.mapService.clearMap(); //Reset the map
                    this.mapService.refreshView();

                    const [flights, observations, layers] = userData;
                    if (layers) {
                        this.mapService.addAnalysisListToMap(layers, { zoomToFirst: true });
                    }
                    if (flights) {
                        this.mapService.addFlightsToMap(flights, true);
                    }
                }),
                map((userData: any[]) => {
                    const userDataOrdered = this.ownerService.sortOwnerData(userData, true);
                    return userDataOrdered;
                }),
            )
            .subscribe((data: any) => {
                this.ownerDataList = data;
            })

    }

    // segunda parte

    applyFilters() {
        this.formatRangeDates();
        const searchValue = this.searchUsers.value?.trim().toLowerCase();
        if (searchValue) {
            this.filteredOwnerDataList = this.ownerDataList.filter((data) => {
                return data.cuadroVuelo?.toLowerCase().includes(searchValue);
            });
        } else {
            this.filteredOwnerDataList = this.ownerDataList;
        }
    }

    //============================================================================================

    getOwnerData(range: any): Observable<any> {
        //Get the owner ID, and the map reference
        this.loading = true;
        return scheduled([this.route.params, this.mapService.map$], asyncScheduler)
            .pipe(
                combineAll(),
                takeUntil(this.unsubscribe$),
                switchMap((data: any[]) => {
                    return combineLatest([
                        (this.flightsRequired)
                            ? this.ownerService.getOwnerFlightsByPilot(data[0].id, range.fechaDesde, range.fechaHasta)
                                .pipe(
                                    takeUntil(this.unsubscribe$),
                                    map((data: any[]) => {
                                        data.forEach(element => {
                                            element.visibility = true;
                                            element.path = this.mapService.geojsonSvgPath(element.geometryVuelo.coordinates);
                                        })
                                        return data
                                    }),
                                    catchError((error) => {
                                        console.log(error);
                                        return of(error.error.type)
                                    })
                                )
                            : of(null),
                        (this.analysisRequired)
                            ? this.layerService.getOwnerAnalysisLayers(data[0].id, range.fechaDesde, range.fechaHasta)
                                .pipe(
                                    takeUntil(this.unsubscribe$),
                                    map((data: any) => {
                                        if (data === null) {
                                            return 'análisis';
                                        };
                                        if (data.length > 0) {
                                            data.forEach((element: any) => {
                                                element.visibility = true;
                                            })
                                        }
                                        return data
                                    }),
                                    catchError((error) => {
                                        if (error.error) {
                                            return of(error.error.type)
                                        }
                                        return error
                                    })
                                )
                            : of(null)
                    ])
                        .pipe(
                            takeUntil(this.unsubscribe$),
                            tap(userData => {
                                if (userData.some((data) => typeof data == "string")) {
                                    let errors: string[] = []
                                    userData.forEach(data => {
                                        if (typeof data == "string") { //TODO: Make alert when the option is active
                                            if ((data === 'analisis' || data === 'análisis') && this.analysisRequired) {
                                                errors.push(data)
                                            }
                                            if (data === 'vuelo' && this.flightsRequired) {
                                                errors.push(data)
                                            }
                                        }
                                    })
                                    this.loading = false;
                                    errorAlert('No se pudo obtener toda la información del propietario', 'Error al obtener: ' + errors)
                                }
                                this.loading = false;
                                return userData;
                            }),
                            map((userData: any[]) => userData.map(data => (typeof data == "string") ? null : data))
                        )

                })
            )
    }

    filterElement(element: any) {
        if (!this.range.get('start')?.value && !this.range.get('end')?.value) {
            errorAlert('Debe seleccionar una fecha de inicio y una de fin')
            return;
        }
        switch (element) {
            case 'flights':
                this.flightsRequired = !this.flightsRequired
                document.getElementById("flights")?.classList.toggle('disabled');

                this.formatRangeDates();
                break;
            // case 'observations':
            //     this.observationsRequired = !this.observationsRequired
            //     document.getElementById("observations")?.classList.toggle('disabled');
            //     this.formatRangeDates();
            //     break;
            case 'analysis':
                this.analysisRequired = !this.analysisRequired
                document.getElementById("analysis")?.classList.toggle('disabled');
                this.formatRangeDates();
                break;
        }
    }

    goToElement(data: any) {
        this.selectedFlight = data;

        if (data.vueloId) {

            //this.ownerService.openInfoDialog(data, 'flight');

            try {
                this.mapService.fitBoundsById([data.vueloId]);
            } catch (error) {
                return
            }
        }
        if (data.analisisId) {
            this.ownerService.openInfoDialog(data, 'analysis');
        }
    }


    hideShowLayer(event: any, data: any, marker?: any) {
        event.preventDefault();
        event.stopPropagation();
        const wasVisible = data.visibility; // Guarda el estado anterior de visibilidad
        data.visibility = !data.visibility;
        if (marker) {
            marker.visibility = !marker.visibility;
        }

        if (data.vueloId) {
            if (data.visibility) {
                this.mapService.addFlightToMap(data, true);
            } else {
                this.mapService.map$
                    .subscribe((map: L.Map) => {
                        map.eachLayer((layer: any) => {
                            const id = layer.id;
                            if (id === data.vueloId) {
                                layer.remove();
                            }
                        })
                    }).unsubscribe();
            }
        }
    }

    sortOwnerData(ownerDataList: any) {
        if (!ownerDataList) return;
        this.sortingCriterion = !this.sortingCriterion;
        this.ownerDataList = this.ownerService.sortOwnerData(ownerDataList, this.sortingCriterion);
    }


    addFlight() {
        this.router.navigate(['add-flight'], { relativeTo: this.route });
    }


    //===================================================================================
    // IMPRESION DE MAPA Y ALTERNAR VISTA DE POLIGONOS COLINDANTES
    //===================================================================================0


    // toggleFlightVisibility(event: any, data: any) {
    //     this.imprimirVueloService.toggleFlightVisibility(event, data);
    //     this.selectedFlight = this.imprimirVueloService.selectedFlight;
    //     this.ownerDataList = this.imprimirVueloService.ownerDataList;
    // }

    imprimirVuelo(data: any) {
        this.imprimirVueloService.imprimirVuelo(data, this.ownerDataList).then((ownerDataList) => {
            this.ownerDataList = ownerDataList;
        }).catch((error) => {
            console.error('Error al imprimir el vuelo', error);
        });
    }

    //===================================================================================
    activarEdicionPoligono(): void {
        // Si no está en modo edición, activar edición
        if (!this.isEditingPolygon) {

            this.isEditingPolygon = true;

            this.mapService.addDrawControlsFlightEdit(); // Activa los controles de Geoman
            this.loadEditableFlights(); // Carga los polígonos editables en el mapa

            // Verificar si ya existe una suscripción
            if (this.subscription) {
                this.subscription.unsubscribe();
            }

            // Crear una nueva suscripción
            this.subscription = this.mapService.getEditingFinishedObservable().subscribe(() => {
                // Verificar si la edición se completó correctamente
                if (this.mapService.getEditingFinishedStatus()) {
                    this.isEditingPolygon = false;

                    // Llamar a removeDrawControls() para limpiar los controles de edición
                    this.mapService.removeDrawControls();

                    // Desactivar edición en Geoman
                    this.mapService.disableGeomanEditMode();

                    // Elimina capas de edición
                    this.mapService.removeEditLayers();

                    // Vuelve al modo normal
                    // this.flightsService.getAllFlights().subscribe((flights: any[]) => {
                    //     this.mapService.addFlightsToMap(flights, true);
                    // });
                }
            });
        } else {
            // Si está en modo edición, cancelar edición

            this.isEditingPolygon = false;

            this.mapService.disableGeomanEditMode(); // Desactiva modo edición en Geoman
            this.mapService.removeEditLayers(); // Elimina capas de edición

            // Llamar a removeDrawControls() para limpiar los controles de edición
            this.mapService.removeDrawControls();

            this.flightsService.getAllFlights().subscribe((flights: any[]) => {
                this.mapService.addFlightsToMap(flights, true); // Vuelve al modo normal
            });

            // Cancelar la suscripción para evitar duplicados
            if (this.subscription) {
                this.subscription.unsubscribe();
            }
        }
    }


    loadEditableFlights(): void {
        this.flightsService.getAllFlights().subscribe((flights: any[]) => {
            this.removeAllFlights(); // elimina la capa de vuelos no editables
            this.mapService.addFlightsToMap2(flights, true); // carga la capa de vuelos editables
            //this.mapService.enableEditLayers(); // activa la edición de polígonos de manera programática

        });
    }


    removeAllFlights(): void {
        // elimina la capa de vuelos no editables
        this.mapService.clearMap();
    }

    generateReport(user: any) {
        this.dialog.open(ReportComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            data: user.usuarioId,
        });

    }

    //=======================================================================================================


    ngOnDestroy(): void {
        this.mapService.clearMap();
        this.mapService.removeTimeslider();
        this.mapService.removeReferences();
        this.mapService.cleanView();

        this.unsubscribe$.next();
        this.unsubscribe$.complete();
        // Cancelar la suscripción para evitar duplicados
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

}
