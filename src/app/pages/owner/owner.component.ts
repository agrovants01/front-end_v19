import { formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { asyncScheduler, combineLatest, Observable, of, scheduled, Subject, Subscription, forkJoin } from 'rxjs';
import { catchError, combineAll, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AdminService } from 'src/app/admin/services/admin.service';
import { UserList } from 'src/app/admin/users/users.interface';
import { GlobalsService } from 'src/app/shared/services/globals.service';
import { MapService } from 'src/app/shared/services/map.service';
import { SidebarService } from 'src/app/shared/services/sidebar.service';
import { errorAlert, successAlert } from '../../shared/services/alerts';
import { ReportComponent } from '../components/report/report.component';
import { LayerService } from '../services/layer.service';
import { ObservationsService } from '../services/observations.service';
import { OwnerService } from '../services/owner.service';
import * as L from 'leaflet';
import { FlightsService } from '../services/flights.service';
import { ImprimirVueloService } from 'src/app/admin/services/imprimirVuelo.service';
import { AuthService } from 'src/app/auth/services/auth.service';

@Component({
    standalone: false,
    selector: 'app-owner',
    host: { 'class': 'sidebar__content-flex' },
    templateUrl: './owner.component.html',
    styleUrls: ['./owner.component.css']
})
export class OwnerComponent implements OnInit, OnDestroy {

    map!: L.Map;

    private unsubscribe$ = new Subject<void>();

    value: string = '';

    admin = this.authService.auth.perfilUsuario == "ADMIN";
    piloto = this.authService.auth.perfilUsuario == "PILOTO";
    contratista = this.authService.auth.perfilUsuario == "CONTRATISTA";
    alias = localStorage.getItem('aliasUsuarioLogueado');

    user: (UserList | undefined);
    nombreCompleto: string = '';

    range = new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
    });

    public selectedFlight: any;
    private flightsVisibility: { [id: string]: boolean } = {};
    private toggleCount: number = 0;
    private rangeDates: any;

    // Propiedades para controlar edición
    public editingFlightId: string | null = null;
    public isEditingSingleFlight: boolean = false;
    public isEditingPolygon: boolean = false;
    public isSavingChanges: boolean = false;
    public isCancelling: boolean = false;

    flightsRequired: boolean = true;
    analysisRequired = false;
    observationsRequired: boolean = true;

    ownerDataList: any[] = [];
    sortingCriterion: boolean = true;
    loading: boolean = false;
    searchUsers = new FormControl('');
    filteredOwnerDataList: any[] = [];

    private subscription: Subscription | undefined;

    constructor(
        public sidebarService: SidebarService,
        public authService: AuthService,
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
        private imprimirVueloService: ImprimirVueloService,
    ) {
        this.route.params
            .pipe(
                takeUntil(this.unsubscribe$),
                map((data: any) => {
                    const { id } = data;
                    return id;
                }),
                switchMap((id) => {
                    return this.adminService.getUser(id)
                })
            ).subscribe((user: UserList) => {
                if (!user) {
                    this.router.navigate(['404'])
                }
                this.user = user;

                if (user.aliasUsuario) {
                    this.nombreCompleto = user.aliasUsuario;
                } else {
                    this.nombreCompleto = user.nombreUsuario + ' ' + user.apellidoUsuario;
                }

                localStorage.setItem('nombreCompleto', this.nombreCompleto);
            })
    }

    ngOnInit(): void {
        // Filtro de busqueda de cuadros
        this.searchUsers.valueChanges.subscribe((value) => {
            if (value) {
                this.applyFilters();
            } else {
                this.filteredOwnerDataList = this.ownerDataList;
            }
        });

        // Aparece el timeslider del ndvi al cargar los vuelos del propietario elegido.
        this.mapService.addTimeslider();

        const today = new Date();
        const initStartDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());

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

        this.rangeDates = range;

        this.getOwnerData(range)
            .pipe(
                takeUntil(this.unsubscribe$),
                tap((userData: any[]) => {
                    this.mapService.clearMap();
                    this.mapService.refreshView();

                    const [flights, observations, layers] = userData;
                    if (layers) {
                        this.mapService.addAnalysisListToMap(layers, { zoomToFirst: true });
                    }
                    if (flights) {
                        this.mapService.addFlightsToMap(flights);
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

    getOwnerData(range: any): Observable<any> {
        this.loading = true;
        return scheduled([this.route.params, this.mapService.map$], asyncScheduler)
            .pipe(
                combineAll(),
                takeUntil(this.unsubscribe$),
                switchMap((data: any[]) => {
                    return combineLatest([
                        (this.flightsRequired)
                            ? this.ownerService.getOwnerFlights(data[0].id, range.fechaDesde, range.fechaHasta)
                                .pipe(
                                    takeUntil(this.unsubscribe$),
                                    map((data: any[]) => {
                                        if (data && data.forEach) {
                                            data.forEach(element => {
                                                element.visibility = true;
                                                element.path = this.mapService.geojsonSvgPath(element.geometryVuelo.coordinates);
                                            })
                                        }
                                        return data
                                    }),
                                    catchError((error) => {
                                        console.error('[Owner] Error fetching flights:', error);
                                        if (error.error && error.error.type) {
                                            return of(error.error.type);
                                        }
                                        return of('vuelo');
                                    })
                                )
                            : of(null),
                        (this.analysisRequired)
                            ? this.layerService.getOwnerAnalysisLayers(data[0].id, range.fechaDesde, range.fechaHasta)
                                .pipe(
                                    takeUntil(this.unsubscribe$),
                                    map((data: any) => {
                                        if (data === null || data === undefined) {
                                            return 'análisis';
                                        };
                                        if (data && data.length > 0) {
                                            data.forEach((element: any) => {
                                                element.visibility = true;
                                            })
                                        }
                                        return data
                                    }),
                                    catchError((error) => {
                                        console.error('[Owner] Error fetching analysis:', error);
                                        if (error.error && error.error.type) {
                                            return of(error.error.type);
                                        }
                                        return of('análisis');
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
                                        if (typeof data == "string") {
                                            if (data === 'vuelo' && this.flightsRequired) {
                                                errors.push(data)
                                            }
                                            if (data === 'observacion' && this.flightsRequired) {
                                                errors.push(data)
                                            }
                                            if (data === 'análisis' && this.analysisRequired) {
                                                errors.push(data)
                                            }
                                        }
                                    })
                                    this.loading = false;
                                    if (errors.length > 0) {
                                        errorAlert('No se pudo obtener toda la información del propietario', 'Error al obtener: ' + errors)
                                    }
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
            try {
                this.mapService.fitBoundsById([data.vueloId]);
            } catch (error) {
                return;
            }
        }
        if (data.analisisId) {
            this.ownerService.openInfoDialog(data, 'analysis');
            this.mapService.addAnalysisToMap(data, { zoomToBounds: true, flyTo: true });
        }
    }

    hideShowLayer(event: any, data: any, marker?: any) {
        event.preventDefault();
        event.stopPropagation();
        const wasVisible = data.visibility;
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

    addObservation() {
        this.router.navigate(['add-observation'], { relativeTo: this.route });
    }

    addFlight() {
        this.router.navigate(['add-flight'], { relativeTo: this.route });
    }

    generateReport(user: any) {
        this.dialog.open(ReportComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            data: {
                userId: user.usuarioId,
                vuelos: this.ownerDataList,
                formatRangeDates: () => this.formatRangeDates()
            }
        });
    }

    // ======================================================================
    // MÉTODOS PARA EDICIÓN DE POLÍGONOS - GLOBAL (AZUL)
    // ======================================================================

    /**
     * Activa la edición global de todos los polígonos (SIN auto-guardado)
     */
    activarEdicionPoligono(): void {
        // Si ya está editando individualmente, mostrar advertencia
        if (this.isEditingSingleFlight) {
            errorAlert('Termine la edición individual primero', 'Está editando un vuelo específico');
            return;
        }

        // Si ya está editando globalmente, no hacer nada
        if (this.isEditingPolygon && !this.isEditingSingleFlight) {
            console.log('Ya está en modo edición global');
            return;
        }

        // Activar modo edición global CON auto-guardado DESACTIVADO
        this.isEditingPolygon = true;
        this.isEditingSingleFlight = false;
        this.editingFlightId = null;

        console.log('Activando edición global de polígonos (sin auto-guardado)');

        // Cargar vuelos editables CON auto-guardado DESACTIVADO
        this.loadEditableFlights(false);

        // Verificar si ya existe una suscripción
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        // Suscribirse a eventos de edición (solo para logging)
        this.subscription = this.mapService.getEditingFinishedObservable().subscribe(() => {
            console.log('Edición detectada (guardada temporalmente)');
        });
    }

    /**
     * Guarda los cambios de la edición global (AZUL)
     */
    saveGlobalPolygonChanges(): void {
        console.log('Guardando cambios de edición global...');

        this.isSavingChanges = true;

        this.mapService.saveAllChanges().subscribe({
            next: (results) => {
                console.log('✅ Cambios guardados exitosamente');

                // Verificar si hubo errores
                const errores = results.filter((r: any) => r.error);
                if (errores.length > 0) {
                    console.warn(`⚠️ Hubo ${errores.length} errores al guardar`);
                    errorAlert('Algunos vuelos no se pudieron guardar',
                        `Se guardaron ${results.length - errores.length} de ${results.length} vuelos correctamente.`);
                } else {
                    successAlert('Todos los polígonos se actualizaron correctamente.');
                }

                // Finalizar edición global
                this.finishGlobalEditing();

                this.isSavingChanges = false;
            },
            error: (error) => {
                console.error('❌ Error al guardar cambios globales:', error);
                errorAlert('Error al guardar cambios', 'No se pudieron guardar los cambios en el servidor.');

                this.isSavingChanges = false;
            }
        });
    }

    /**
     * Cancela la edición global (ROJO)
     */
    cancelGlobalEditing(): void {
        //if (confirm('¿Está seguro de que desea cancelar todos los cambios? Se perderán las modificaciones no guardadas.')) {
            console.log('Cancelando edición global...');

            this.isCancelling = true;

            this.mapService.cancelAllChanges().subscribe({
                next: () => {
                    console.log('✅ Edición global cancelada');

                    // Limpiar estados
                    this.isEditingPolygon = false;
                    this.isEditingSingleFlight = false;
                    this.editingFlightId = null;

                    // Limpiar controles del mapa
                    this.mapService.removeDrawControls();
                    this.mapService.disableGeomanEditMode();
                    this.mapService.removeEditLayers();

                    // Desuscribirse
                    if (this.subscription) {
                        this.subscription.unsubscribe();
                        this.subscription = undefined;
                    }

                    // Recargar todos los vuelos desde el servidor
                    this.formatRangeDates();

                    this.isCancelling = false;
                },
                error: (error) => {
                    console.error('❌ Error al cancelar edición global:', error);

                    // Aún así limpiar todo
                    this.isEditingPolygon = false;
                    this.isEditingSingleFlight = false;
                    this.editingFlightId = null;
                    this.mapService.cancelEditingAndCleanup();
                    this.formatRangeDates();

                    this.isCancelling = false;
                }
            });
        //}
    }

    /**
     * Finaliza la edición global y recarga los vuelos
     */
    private finishGlobalEditing(): void {
        console.log('Finalizando edición global');

        this.isEditingPolygon = false;
        this.isEditingSingleFlight = false;
        this.editingFlightId = null;

        this.mapService.removeDrawControls();
        this.mapService.disableGeomanEditMode();
        this.mapService.removeEditLayers();

        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = undefined;
        }

        // Recargar todos los vuelos
        this.formatRangeDates();
    }

    // ======================================================================
    // MÉTODOS PARA EDICIÓN DE POLÍGONOS - INDIVIDUAL (VERDE)
    // ======================================================================

    /**
     * Activa la edición individual de un vuelo específico (CON auto-guardado)
     */
    editSingleFlight(flight: any): void {
        event?.stopPropagation();

        // Si ya está editando este vuelo, cancelar edición
        if (this.isEditingSingleFlight && this.editingFlightId === flight.vueloId) {
            this.cancelSingleFlightEditing();
            return;
        }

        // Si está en modo edición global, preguntar al usuario
        if (this.isEditingPolygon && !this.isEditingSingleFlight) {
            if (confirm('Está editando todos los polígonos. ¿Desea cancelar y editar solo este vuelo?')) {
                this.cancelGlobalEditing();
                // Continuar después de que se cancele la edición global
                setTimeout(() => {
                    this.startSingleFlightEditing(flight);
                }, 300);
            }
            return;
        }

        // Si está editando otro vuelo individual, cancelar primero
        if (this.isEditingSingleFlight && this.editingFlightId !== flight.vueloId) {
            if (confirm('Está editando otro vuelo. ¿Desea cancelar y editar este vuelo?')) {
                this.cancelSingleFlightEditing();
                setTimeout(() => {
                    this.startSingleFlightEditing(flight);
                }, 300);
            }
            return;
        }

        // Iniciar edición individual
        this.startSingleFlightEditing(flight);
    }

    /**
     * Inicia la edición individual de un vuelo (CON auto-guardado ACTIVADO)
     */
    private startSingleFlightEditing(flight: any): void {
        console.log(`Editando vuelo individual: ${flight.cuadroVuelo} (${flight.vueloId}) - Auto-guardado ACTIVADO`);

        // Activar modo edición individual CON auto-guardado ACTIVADO
        this.isEditingPolygon = true;
        this.isEditingSingleFlight = true;
        this.editingFlightId = flight.vueloId;
        this.selectedFlight = flight;

        // Cargar solo este vuelo para edición (con auto-guardado ACTIVADO)
        this.mapService.loadSingleFlightForEditing(flight);

        // Hacer zoom al vuelo
        this.mapService.fitBoundsById([flight.vueloId]);

        // Suscribirse a la finalización de edición
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        this.subscription = this.mapService.getEditingFinishedObservable().subscribe(() => {
            console.log('✅ Edición individual completada (guardada automáticamente)');
        });
    }

    /**
     * Finaliza la edición individual y recarga los vuelos (VERDE)
     */
    finishSingleFlightEditingAndReload(): void {
        console.log('Finalizando edición individual...');

        // En modo individual, los cambios ya se guardaron automáticamente
        // Solo necesitamos limpiar y recargar

        this.isEditingPolygon = false;
        this.isEditingSingleFlight = false;
        this.editingFlightId = null;

        this.mapService.removeDrawControls();
        this.mapService.disableGeomanEditMode();
        this.mapService.cancelEditingAndCleanup();

        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = undefined;
        }

        successAlert('El polígono se actualizó correctamente.');

        // Recargar TODOS los vuelos
        this.formatRangeDates();
    }

    /**
     * Cancela la edición individual (ROJO)
     */
    cancelSingleFlightEditing(): void {
        if (!this.editingFlightId) {
            console.log('No hay vuelo en edición para cancelar');
            return;
        }

        //if (confirm('¿Está seguro de que desea cancelar los cambios? Se perderán las modificaciones no guardadas.')) {
            console.log(`Cancelando edición del vuelo ${this.editingFlightId}`);

            this.isCancelling = true;

            this.mapService.cancelSingleFlightEditing(this.editingFlightId).subscribe({
                next: () => {
                    console.log('✅ Edición individual cancelada correctamente');

                    // Limpiar estados
                    this.isEditingPolygon = false;
                    this.isEditingSingleFlight = false;
                    this.editingFlightId = null;

                    // Desuscribirse
                    if (this.subscription) {
                        this.subscription.unsubscribe();
                        this.subscription = undefined;
                    }

                    // Recargar todos los vuelos desde el servidor
                    this.formatRangeDates();

                    this.isCancelling = false;
                },
                error: (error) => {
                    console.error('❌ Error al cancelar edición:', error);

                    // Aún así limpiar estados
                    this.isEditingPolygon = false;
                    this.isEditingSingleFlight = false;
                    this.editingFlightId = null;
                    this.mapService.cancelEditingAndCleanup();
                    this.formatRangeDates();

                    this.isCancelling = false;
                }
            });
        //}
    }

    // ======================================================================
    // MÉTODOS AUXILIARES PARA CARGA DE VUELOS
    // ======================================================================

    /**
     * Carga los vuelos editables
     * @param enableAutoSave true para edición individual, false para edición global
     */
    private loadEditableFlights(enableAutoSave: boolean = false): void {
        const ownerId = this.route.snapshot.paramMap.get('id');
        if (ownerId === null) {
            console.error('No se encontró el ID del propietario');
            return;
        }

        if (!this.rangeDates) {
            console.error('No se ha seleccionado un rango de fechas');
            return;
        }

        const fechaHasta = new Date(this.rangeDates.fechaHasta);
        fechaHasta.setDate(fechaHasta.getDate() + 1);

        this.ownerService.getOwnerFlights(ownerId, new Date(this.rangeDates.fechaDesde), fechaHasta).subscribe((flights: any[]) => {
            // Limpiar vuelos existentes
            this.removeAllFlights();

            // Agregar vuelos editables al mapa con la configuración de auto-guardado apropiada
            this.mapService.addFlightsToMap2(flights, true, enableAutoSave);
        });
    }

    /**
     * Elimina todos los vuelos del mapa
     */
    removeAllFlights(): void {
        this.mapService.clearMap();
    }

    // ======================================================================
    // MÉTODOS PARA IMPRESIÓN DE VUELOS
    // ======================================================================

    imprimirVuelo(data: any) {
        this.imprimirVueloService.imprimirVuelo(data, this.ownerDataList).then((ownerDataList) => {
            this.ownerDataList = ownerDataList;
        }).catch((error) => {
            console.error('Error al imprimir el vuelo', error);
        });
    }

    // ======================================================================
    // MÉTODOS DEL CICLO DE VIDA
    // ======================================================================

    ngOnDestroy(): void {
        this.mapService.clearMap();
        this.mapService.removeTimeslider();
        this.mapService.removeReferences();
        this.mapService.cleanView();
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
        this.subscription?.unsubscribe();
    }
}
