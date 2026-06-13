import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
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
import { OrdenPedido } from 'src/app/admin/orden-pedido/orden-pedido.interface';


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
        agq1Flight: ['-', [Validators.required]],
        dosisagq1Flight: [0, [Validators.required]],
        agq2Flight: ['-', []],
        dosisagq2Flight: [0, [Validators.minLength(0)]],
        agq3Flight: ['-', []],
        dosisagq3Flight: [0, [Validators.minLength(0)]],
        agq4Flight: ['-', []],
        dosisagq4Flight: [0, [Validators.minLength(0)]],
        coad1Flight: ['-', [Validators.required]],
        dosiscoad1Flight: [0, [Validators.required, Validators.minLength(0)]],
        coad2Flight: ['-', []],
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
            this.flightForm.get('pilotoNombreCompletoFlight')?.setValue(orden.fk_Piloto);
        }

        this.flightForm.get('areaFlight')?.setValue(orden.opSuperficie);

        this.flightForm.get('agq1Flight')?.setValue(orden.opAgroq1 || '-');
        this.flightForm.get('dosisagq1Flight')?.setValue(orden.opDosisAgroq1 || 0);
        this.flightForm.get('agq2Flight')?.setValue(orden.opAgroq2 || '-');
        this.flightForm.get('dosisagq2Flight')?.setValue(orden.opDosisAgroq2 || 0);
        this.flightForm.get('agq3Flight')?.setValue(orden.opAgroq3 || '-');
        this.flightForm.get('dosisagq3Flight')?.setValue(orden.opDosisAgroq3 || 0);
        this.flightForm.get('agq4Flight')?.setValue(orden.opAgroq4 || '-');
        this.flightForm.get('dosisagq4Flight')?.setValue(orden.opDosisAgroq4 || 0);

        this.flightForm.get('coad1Flight')?.setValue(orden.opCoad1 || '-');
        this.flightForm.get('dosiscoad1Flight')?.setValue(orden.opDosisCoad1 || 0);
        this.flightForm.get('coad2Flight')?.setValue(orden.opCoad2 || '-');
        this.flightForm.get('dosiscoad2Flight')?.setValue(orden.opDosisCoad2 || 0);

        this.flightForm.get('formaPagoFlight')?.setValue(orden.opFormaPago);
        this.flightForm.get('precioHaFlight')?.setValue(orden.opPrecioHa);
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

                                pilotoNombreCompleto: this.isAdmin() ? this.flightForm.value.pilotoNombreCompletoFlight : this.aliasUsuarioLogueado,


                                tecnicoVuelo: this.flightForm.value.tecnicoFlight, // (asistenteVuelo)
                                agq1: this.flightForm.value.agq1Flight,
                                dosisagq1: this.flightForm.value.dosisagq1Flight,
                                agq2: this.flightForm.value.agq2Flight,
                                dosisagq2: this.flightForm.value.dosisagq2Flight,
                                agq3: this.flightForm.value.agq3Flight,
                                dosisagq3: this.flightForm.value.dosisagq3Flight,
                                agq4: this.flightForm.value.agq4Flight,
                                dosisagq4: this.flightForm.value.dosisagq4Flight,
                                coad1: this.flightForm.value.coad1Flight,
                                dosiscoad1: this.flightForm.value.dosiscoad1Flight,
                                coad2: this.flightForm.value.coad2Flight,
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


