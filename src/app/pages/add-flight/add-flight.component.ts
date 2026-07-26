import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { of, Subject, Observable } from 'rxjs';
import { switchMap, takeUntil, startWith, map } from 'rxjs/operators';
import { GlobalsService } from 'src/app/shared/services/globals.service';
import { MapService } from 'src/app/shared/services/map.service';
import { SidebarService } from 'src/app/shared/services/sidebar.service';
import { LessThanTodayService } from 'src/app/shared/validators/less-than-today.service';
import { confirmAlert, cancelAlert, successAlert, errorAlert } from 'src/app/shared/services/alerts';
import { ActivatedRoute } from '@angular/router';
import { FlightService } from '../services/flight.service';
import { OwnerListInput } from 'src/app/pages/owner/owner.interface';
import { Piloto } from 'src/app/pages/owner/pilot.interface';
import { OwnerService } from 'src/app/pages/services/owner.service';
import { Cultivo } from '../owner/cultivo.interface';
import { Tecnico } from '../owner/tecnico.interface';
import { AdminService } from 'src/app/admin/services/admin.service';
import { OrdenPedido, ListadoItem, UsuarioSelect } from 'src/app/admin/orden-pedido/orden-pedido.interface';


@Component({
    standalone: false,
    selector: 'app-add-flight',
    host: { 'class': 'sidebar__content-flex' },
    templateUrl: './add-flight.component.html',
    styleUrls: ['./add-flight.component.css']
})

export class AddFlightComponent implements OnInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    flights: any[] = [];

    ownersList: OwnerListInput[] = [];


    //idUsuarioPilotoLogueado = localStorage.getItem('idUsuarioPilotoLogueado')!;
    idUsuarioPilotoLogueado = localStorage.getItem('idUsuarioLogueado')!;

    perfilLogueado = localStorage.getItem('perfil')!;
    nombreCompleto = localStorage.getItem('nombreCompleto')!;
    idPropietarioElegido = localStorage.getItem('idPropietarioElegido')


    isAdmin(): boolean {
        return this.perfilLogueado === 'ADMIN';
    }

    markers: any[] = [];
    firstFormGroup!: FormGroup;
    secondFormGroup!: FormGroup;


    cultivosList: Cultivo[] = [];
    tecnicosList: Tecnico[] = [];

    formasPago = [
        { value: 'PAGO PENDIENTE', viewValue: 'PAGO PENDIENTE' },
        { value: 'CONTADO', viewValue: 'CONTADO' },
        { value: 'CHEQUE', viewValue: 'CHEQUE' },
        { value: 'TRANSFERENCIA', viewValue: 'TRANSFERENCIA' },
        { value: 'MERCADO PAGO', viewValue: 'MERCADO PAGO' },
        { value: 'PAGADO', viewValue: 'PAGADO' },

    ];

    pilotos: Piloto[] = [];

    aliasUsuarioLogueado = localStorage.getItem('aliasUsuarioLogueado');

    ordenesPropietario: OrdenPedido[] = [];
    ordenSeleccionada: OrdenPedido | null = null;

    listadoAgroquimicos: ListadoItem[] = [];
    listadoCoadyuvantes: ListadoItem[] = [];
    usuariosPilotos: UsuarioSelect[] = [];

    filteredAgq1!: Observable<ListadoItem[]>;
    filteredAgq2!: Observable<ListadoItem[]>;
    filteredAgq3!: Observable<ListadoItem[]>;
    filteredAgq4!: Observable<ListadoItem[]>;
    filteredCoad1!: Observable<ListadoItem[]>;
    filteredCoad2!: Observable<ListadoItem[]>;

    flightForm: FormGroup = this.fb.group({
        markersFlight: ['', [Validators.required]],
        dateFlight: [new Date(), [Validators.required], [this.dateValidator]],
        ordenPedidoFlight: ['', []],

        // sintaxis para deshabilitar un campo de formulario con formulario reactivo
        propietarioFlight: [{ value: this.nombreCompleto, disabled: true }, [Validators.required]], // ADMIN: ve nombre completo de propietario elegido
        propietarioFlight2: ['', []], // PILOTO: ve nombre completo de propietario elegido del select de propietarios

        cuadroFlight: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(40)]],
        zonaFlight: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(40)]],
        cultivoFlight: ['', [Validators.required]],
        caldohaFlight: [0, [Validators.required, Validators.minLength(0)]],
        areaFlight: [0, [Validators.required, Validators.minLength(0)]],

        pilotoFlight: ['', []],

        idPilotoCreateFlight: ['', []], // Campo oculto para el ID

        pilotoNombreCompletoFlight: ['', []],
        //pilotoNombreCompletoFlight2:[''],

        tecnicoFlight: ['', [Validators.required]],
        agq1Flight: ['-', [Validators.required, this.catalogoValidator('listadoAgroqNom')]],
        dosisagq1Flight: [0, [Validators.required]],
        agq2Flight: [null, [this.catalogoValidator('listadoAgroqNom')]],
        dosisagq2Flight: [0, [Validators.minLength(0)]],
        agq3Flight: [null, [this.catalogoValidator('listadoAgroqNom')]],
        dosisagq3Flight: [0, [Validators.minLength(0)]],
        agq4Flight: [null, [this.catalogoValidator('listadoAgroqNom')]],
        dosisagq4Flight: [0, [Validators.minLength(0)]],
        coad1Flight: ['-', [Validators.required, this.catalogoValidator('ListadoCoadNom')]],
        dosiscoad1Flight: [0, [Validators.required, Validators.minLength(0)]],
        coad2Flight: [null, [this.catalogoValidator('ListadoCoadNom')]],
        dosiscoad2Flight: [0, [Validators.minLength(0)]],
        formaPagoFlight: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
        precioHaFlight: [0, [Validators.required, Validators.minLength(0)]],
        aclaracionFlight: ['', [Validators.maxLength(254)]],

    });

    constructor(
        public sidebarService: SidebarService,
        public globalsService: GlobalsService,
        public mapService: MapService,
        public flightService: FlightService,
        private fb: FormBuilder,
        private dateValidator: LessThanTodayService,
        private route: ActivatedRoute,
        private ownerService: OwnerService,
        private adminService: AdminService,
    ) {

    }

    ngOnInit(): void {


        if (!this.isAdmin()) {
            this.flightForm.get('pilotoNombreCompletoFlight')?.setValue(this.aliasUsuarioLogueado);
        }


        this.ownerService.getOwnersList()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((owners: OwnerListInput[]) => {
                this.ownersList = owners;
            })


        this.mapService.setAddFlightMode(true);

        this.ownerService.getPilotos().subscribe((response: Piloto[]) => {
            this.pilotos = response;
        });

        this.cargarOrdenesPropietario();


        // Cargar lista de cultivos
        this.ownerService.getCultivos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((cultivos: Cultivo[]) => {
                this.cultivosList = cultivos;
            });


        // Cargar lista de tecnicos
        this.ownerService.getTecnicos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((tecnico: Tecnico[]) => {
                this.tecnicosList = tecnico;
            });

        // Cargar catálogos maestros de agroquímicos y coadyuvantes
        this.adminService.getAgroquimicos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((items: ListadoItem[]) => {
                this.listadoAgroquimicos = items;
                this.setupAgroquimicosAutocomplete();
            });

        this.adminService.getCoadyuvantes()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((items: ListadoItem[]) => {
                this.listadoCoadyuvantes = items;
                this.setupCoadyuvantesAutocomplete();
            });

        this.adminService.getPilotos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((usuarios: UsuarioSelect[]) => {
                this.usuariosPilotos = usuarios;
            });



        this.route.params
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((params) => {
                const userId = params.id;
                const range = {
                    fechaDesde: new Date('2000-01-01'),
                    fechaHasta: new Date('2030-12-31')
                };
                this.ownerService.getOwnerFlights(userId, range.fechaDesde, range.fechaHasta).subscribe((flights) => {
                    this.flights = flights;
                    this.mapService.addFlightsToMap(flights, false); // Pasa resetZoom como false
                });
            });


        this.mapService.addDrawControlsFlight(); // muestra los controles de dibujo de geoman

        this.mapService.map$
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe(map => {
                // Escucha el evento cuando se completa el dibujo del polígono
                // y lo agrega al array de marcadores.
                map.on('pm:create', (e: any) => {
                    this.markers.push(e);
                })
                map.on('pm:remove', e => {
                    this.markers.splice(this.markers.lastIndexOf(e), 1);
                })
            })

        // Esto muestra los vuelos que ha hecho el piloto logueado.
        const idUsuarioPilotoLogueado2 = localStorage.getItem('idUsuarioPilotoLogueado');
        if (idUsuarioPilotoLogueado2) {
            const fechaDesde = new Date('2000-01-01');
            const fechaHasta = new Date('2050-12-31');
            this.ownerService.getOwnerFlightsByPilot(idUsuarioPilotoLogueado2, fechaDesde, fechaHasta)
                .pipe(takeUntil(this.unsubscribe$))
                .subscribe(flights => {
                    this.flights = flights;
                    this.mapService.addFlightsToMap(flights, false);
                });
        }

    }

    ngOnDestroy(): void {
        this.mapService.setAddFlightMode(false);
        this.mapService.clearMap();
        this.mapService.removeDrawControls();
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    getMarkersFlight() {
        this.mapService.removeDrawControls();
        const features: any[] = [];
        this.markers.forEach(marker => features.push(marker.layer.toGeoJSON()));
        this.flightForm.get('markersFlight')?.setValue(features);
        this.mapService.disableGeomanEditMode();
    }

    updateFields(event: any) {
        const pilotoSeleccionado = this.pilotos.find(piloto => piloto.pilotoId === event.value);

        this.flightForm.get('idPilotoCreateFlight')?.setValue(event.value);
        this.flightForm.get('pilotoNombreCompletoFlight')?.setValue(`${pilotoSeleccionado?.nombrePiloto} ${pilotoSeleccionado?.apellidoPiloto}`);
    }


    setupAgroquimicosAutocomplete() {
        const setup = (ctrlName: string, obsName: 'filteredAgq1' | 'filteredAgq2' | 'filteredAgq3' | 'filteredAgq4') => {
            (this as any)[obsName] = this.flightForm.get(ctrlName)!.valueChanges.pipe(
                startWith(''),
                map(value => {
                    const name = typeof value === 'string' ? value : value?.listadoAgroqNom;
                    return name ? this._filterAgroquimico(name) : this.listadoAgroquimicos.slice();
                })
            );
        };
        setup('agq1Flight', 'filteredAgq1');
        setup('agq2Flight', 'filteredAgq2');
        setup('agq3Flight', 'filteredAgq3');
        setup('agq4Flight', 'filteredAgq4');
    }

    setupCoadyuvantesAutocomplete() {
        const setup = (ctrlName: string, obsName: 'filteredCoad1' | 'filteredCoad2') => {
            (this as any)[obsName] = this.flightForm.get(ctrlName)!.valueChanges.pipe(
                startWith(''),
                map(value => {
                    const name = typeof value === 'string' ? value : value?.ListadoCoadNom;
                    return name ? this._filterCoadyuvante(name) : this.listadoCoadyuvantes.slice();
                })
            );
        };
        setup('coad1Flight', 'filteredCoad1');
        setup('coad2Flight', 'filteredCoad2');
    }

    private _filterAgroquimico(value: string): ListadoItem[] {
        const filterValue = value.toLowerCase();
        return this.listadoAgroquimicos.filter(item => (item.listadoAgroqNom || '').toLowerCase().includes(filterValue));
    }

    private _filterCoadyuvante(value: string): ListadoItem[] {
        const filterValue = value.toLowerCase();
        return this.listadoCoadyuvantes.filter(item => (item.ListadoCoadNom || '').toLowerCase().includes(filterValue));
    }

    displayAgroquimico(item?: ListadoItem): string {
        return item ? (item.listadoAgroqNom || '') : '';
    }

    displayCoadyuvante(item?: ListadoItem): string {
        return item ? (item.ListadoCoadNom || '') : '';
    }

    catalogoValidator(campoNombre: string) {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (!value || value === '-' || typeof value === 'object') return null;
            const existe = this.listadoAgroquimicos.some((item: any) => item[campoNombre] === value)
                || this.listadoCoadyuvantes.some((item: any) => item[campoNombre] === value);
            return existe ? { existsInCatalog: true } : null;
        };
    }

    cargarOrdenesPropietario() {
        const idPropietario = this.idPropietarioElegido;
        if (!idPropietario) return;

        this.adminService.getOrdenesPorPropietario(idPropietario)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((ordenes: OrdenPedido[]) => {
                this.ordenesPropietario = ordenes;
            });
    }

    seleccionarOrden(orden: OrdenPedido) {
        this.ordenSeleccionada = orden;

        if (this.isAdmin()) {
            this.flightForm.get('pilotoFlight')?.setValue(orden.fk_Piloto);
            this.flightForm.get('idPilotoCreateFlight')?.setValue(orden.fk_Piloto);
            const pilotoUser = this.usuariosPilotos.find(u => u.usuarioId === orden.fk_Piloto);
            const nombrePiloto = pilotoUser
                ? (pilotoUser.aliasUsuario || `${pilotoUser.nombreUsuario} ${pilotoUser.apellidoUsuario}`)
                : orden.fk_Piloto;
            this.flightForm.get('pilotoNombreCompletoFlight')?.setValue(nombrePiloto);
        }

        this.flightForm.get('areaFlight')?.setValue(orden.opSuperficie);

        const agq1Item = orden.opAgroq1 ? this.listadoAgroquimicos?.find(a => a.listadoAgroqNom === orden.opAgroq1) : null;
        this.flightForm.get('agq1Flight')?.setValue(agq1Item || '-');
        this.flightForm.get('dosisagq1Flight')?.setValue(orden.opDosisAgroq1 || 0);
        const agq2Item = orden.opAgroq2 ? this.listadoAgroquimicos?.find(a => a.listadoAgroqNom === orden.opAgroq2) : null;
        this.flightForm.get('agq2Flight')?.setValue(agq2Item || null);
        this.flightForm.get('dosisagq2Flight')?.setValue(orden.opDosisAgroq2 || 0);
        const agq3Item = orden.opAgroq3 ? this.listadoAgroquimicos?.find(a => a.listadoAgroqNom === orden.opAgroq3) : null;
        this.flightForm.get('agq3Flight')?.setValue(agq3Item || null);
        this.flightForm.get('dosisagq3Flight')?.setValue(orden.opDosisAgroq3 || 0);
        const agq4Item = orden.opAgroq4 ? this.listadoAgroquimicos?.find(a => a.listadoAgroqNom === orden.opAgroq4) : null;
        this.flightForm.get('agq4Flight')?.setValue(agq4Item || null);
        this.flightForm.get('dosisagq4Flight')?.setValue(orden.opDosisAgroq4 || 0);

        const coad1Item = orden.opCoad1 ? this.listadoCoadyuvantes?.find(c => c.ListadoCoadNom === orden.opCoad1) : null;
        this.flightForm.get('coad1Flight')?.setValue(coad1Item || '-');
        this.flightForm.get('dosiscoad1Flight')?.setValue(orden.opDosisCoad1 || 0);
        const coad2Item = orden.opCoad2 ? this.listadoCoadyuvantes?.find(c => c.ListadoCoadNom === orden.opCoad2) : null;
        this.flightForm.get('coad2Flight')?.setValue(coad2Item || null);
        this.flightForm.get('dosiscoad2Flight')?.setValue(orden.opDosisCoad2 || 0);

        this.flightForm.get('formaPagoFlight')?.setValue(orden.opFormaPago);
        this.flightForm.get('precioHaFlight')?.setValue(orden.opPrecioHa);
        this.flightForm.get('aclaracionFlight')?.setValue(orden.opAclaracion || '');
    }

    saveFlight() {
        if (this.flightForm.invalid) {
            this.flightForm.markAllAsTouched();
            return;
        }
        confirmAlert().then((result: any) => {
            if (result.isConfirmed) {

                this.route.params
                    .pipe(
                        takeUntil(this.unsubscribe$),
                        switchMap((params) => {
                            const featureFlight = {
                                "type": "FeatureCollection",
                                "features": this.flightForm.value.markersFlight
                            }
                            const agq1Val = this.flightForm.value.agq1Flight;
                            const agq2Val = this.flightForm.value.agq2Flight;
                            const agq3Val = this.flightForm.value.agq3Flight;
                            const agq4Val = this.flightForm.value.agq4Flight;
                            const coad1Val = this.flightForm.value.coad1Flight;
                            const coad2Val = this.flightForm.value.coad2Flight;
                            const req = {
                                fechaVuelo: this.flightForm.value.dateFlight,

                                propietario: this.nombreCompleto,

                                cuadroVuelo: this.flightForm.value.cuadroFlight,
                                zonaVuelo: this.flightForm.value.zonaFlight,
                                cultivoVuelo: this.flightForm.value.cultivoFlight,
                                caldohaVuelo: this.flightForm.value.caldohaFlight,
                                superficieVuelo: this.flightForm.value.areaFlight,

                                pilotoVuelo: this.isAdmin() ? this.flightForm.value.pilotoFlight : this.idUsuarioPilotoLogueado,



                                idPilotoVuelo: this.isAdmin() ? this.flightForm.value.idPilotoCreateFlight : this.idUsuarioPilotoLogueado,

                                pilotoNombreCompleto: String(this.isAdmin() ? this.flightForm.value.pilotoNombreCompletoFlight : this.aliasUsuarioLogueado),


                                tecnicoVuelo: this.flightForm.value.tecnicoFlight, // (asistenteVuelo)
                                agq1: typeof agq1Val === 'object' ? agq1Val?.listadoAgroqNom : agq1Val,
                                dosisagq1: this.flightForm.value.dosisagq1Flight,
                                agq2: typeof agq2Val === 'object' ? agq2Val?.listadoAgroqNom : agq2Val,
                                dosisagq2: this.flightForm.value.dosisagq2Flight,
                                agq3: typeof agq3Val === 'object' ? agq3Val?.listadoAgroqNom : agq3Val,
                                dosisagq3: this.flightForm.value.dosisagq3Flight,
                                agq4: typeof agq4Val === 'object' ? agq4Val?.listadoAgroqNom : agq4Val,
                                dosisagq4: this.flightForm.value.dosisagq4Flight,
                                coad1: typeof coad1Val === 'object' ? coad1Val?.ListadoCoadNom : coad1Val,
                                dosiscoad1: this.flightForm.value.dosiscoad1Flight,
                                coad2: typeof coad2Val === 'object' ? coad2Val?.ListadoCoadNom : coad2Val,
                                dosiscoad2: this.flightForm.value.dosiscoad2Flight,
                                formaPago: this.flightForm.value.formaPagoFlight,
                                precioHa: this.flightForm.value.precioHaFlight,
                                aclaracion: this.flightForm.value.aclaracionFlight,
                                totagq1: this.flightForm.value.areaFlight * this.flightForm.value.dosisagq1Flight,
                                totagq2: this.flightForm.value.areaFlight * this.flightForm.value.dosisagq2Flight,
                                totagq3: this.flightForm.value.areaFlight * this.flightForm.value.dosisagq3Flight,
                                totagq4: this.flightForm.value.areaFlight * this.flightForm.value.dosisagq4Flight,
                                totcoad1: this.flightForm.value.areaFlight * this.flightForm.value.dosiscoad1Flight,
                                totcoad2: this.flightForm.value.areaFlight * this.flightForm.value.dosiscoad2Flight,
                                featureFlight: featureFlight,
                                fk_Usuario: this.idPropietarioElegido,
                            }
                            return this.flightService.saveFlight(req)
                        })
                    ).subscribe((_) => {
                        successAlert('El vuelo ha sido agregado')
                            .then(() => { this.globalsService.return() });
                    }, (error: any) => {
                        errorAlert('El vuelo no ha sido agregado', error.error.errors[0].msg)
                            .then(() => { this.globalsService.return() });
                    })
            }
        })
    }


    cancelFlight() {
        cancelAlert().then((result: any) => {
            if (result.isConfirmed) {
                this.globalsService.return();
            }
        })
    }

    onFileChanged(event: any) {
        const selectedFile = event.target.files[0];
    }

}


