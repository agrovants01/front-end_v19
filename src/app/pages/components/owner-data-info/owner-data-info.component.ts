import { AfterViewInit, Component, EventEmitter, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ControlContainer, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, startWith, map } from 'rxjs/operators';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { GlobalsService } from 'src/app/shared/services/globals.service';
import { confirmAlert, successAlert, errorAlert } from '../../../shared/services/alerts';
import { LayerService } from '../../services/layer.service';
import { ObservationsService } from '../../services/observations.service';
import { OwnerService } from '../../services/owner.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Piloto } from 'src/app/pages/owner/pilot.interface';
import { OwnerListInput } from 'src/app/pages/owner/owner.interface';
import { Cultivo } from '../../owner/cultivo.interface';
import { Tecnico } from '../../owner/tecnico.interface';
import { AdminService } from 'src/app/admin/services/admin.service';
import { OrdenPedido, ListadoItem } from 'src/app/admin/orden-pedido/orden-pedido.interface';
import * as moment from 'moment';


@Component({
  standalone: false,
    selector: 'app-owner-data-info',
    styleUrls: ['owner-data-info.component.css'],
    templateUrl: './owner-data-info.component.html',

})
export class OwnerDataInfoComponent implements OnInit {

    vuelosSeleccionados: any[] | undefined;

    pilotos: Piloto[] = [];

    ownersList: OwnerListInput[] = [];
    tecnicosList: Tecnico[] = [];
    cultivosList: Cultivo[] = [];
    listadoAgroquimicos: ListadoItem[] = [];
    listadoCoadyuvantes: ListadoItem[] = [];
    ordenesList: OrdenPedido[] = [];

    filteredAgq1: Observable<ListadoItem[]> = new Observable();
    filteredAgq2: Observable<ListadoItem[]> = new Observable();
    filteredAgq3: Observable<ListadoItem[]> = new Observable();
    filteredAgq4: Observable<ListadoItem[]> = new Observable();
    filteredCoad1: Observable<ListadoItem[]> = new Observable();
    filteredCoad2: Observable<ListadoItem[]> = new Observable();


    formasPago = [
        { value: 'PAGO PENDIENTE', viewValue: 'PAGO PENDIENTE' },
        { value: 'CONTADO', viewValue: 'CONTADO' },
        { value: 'CHEQUE', viewValue: 'CHEQUE' },
        { value: 'TRANSFERENCIA', viewValue: 'TRANSFERENCIA' },
        { value: 'MERCADO PAGO', viewValue: 'MERCADO PAGO' },
        { value: 'PAGADO', viewValue: 'PAGADO' },
    ];


    admin = this.authService.auth.perfilUsuario == "ADMIN";
    piloto = this.authService.auth.perfilUsuario == "PILOTO";
    isEditing: boolean = false;

    private unsubscribe$ = new Subject<void>();



    flightUpdateForm: FormGroup = this.fb.group({
        // sintaxis para deshabilitar un campo de formulario con formulario reactivo
        vueloIdUpdateFlight: [{ value: this.data.data.vueloId, disabled: true }, [Validators.required]],
        dateUpdateFlight: [{ value: this.data.data.fechaVuelo, disabled: true }, []],
        opNomenclaturaUpdateFlight: [{ value: this.data.data.opNomenclatura || 'Sin orden', disabled: true }, []],
        propietarioUpdateFlight2Text: [{ value: this.data.data.propietario, disabled: true }, [Validators.required]],
        propietarioUpdateFlight2: [null, Validators.required],
        cuadroUpdateFlight: [{ value: this.data.data.cuadroVuelo, disabled: true }, [Validators.required]],
        zonaUpdateFlight: [{ value: this.data.data.zonaVuelo, disabled: true }, [Validators.required]],
        cultivoUpdateFlightText: [{ value: this.data.data.cultivoVuelo, disabled: true }, [Validators.required]],
        cultivoUpdateFlight: [null, Validators.required],
        caldohaUpdateFlight: [{ value: this.data.data.caldohaVuelo, disabled: true }, [Validators.required, Validators.minLength(1)]],
        areaUpdateFlight: [{ value: this.data.data.superficieVuelo, disabled: true }, [Validators.required, Validators.minLength(0)]],
        pilotoUpdateFlight: [{ value: this.data.data.pilotoVuelo, disabled: true }, [Validators.required]],
        idPilotoUpdateFlight: [{ value: this.data.data.idPilotoVuelo, disabled: true }, []],
        nomCompletoPilotoUpdateFlight: [{ value: this.data.data.pilotoNombreCompleto || this.data.data.pilotoVuelo }, []],
        tecnicoUpdateFlight: [{ value: this.data.data.tecnicoVuelo, disabled: true }, [Validators.required]],
        agq1Flight: [{ value: this.data.data.agq1, disabled: true }, [Validators.required, this.catalogoValidator('listadoAgroqNom')]],
        dosisagq1Flight: [{ value: this.data.data.dosisagq1, disabled: true }, [Validators.required]],
        agq2Flight: [{ value: this.data.data.agq2, disabled: true }, [this.catalogoValidator('listadoAgroqNom')]],
        dosisagq2Flight: [{ value: this.data.data.dosisagq2, disabled: true }, []],
        agq3Flight: [{ value: this.data.data.agq3, disabled: true }, [this.catalogoValidator('listadoAgroqNom')]],
        dosisagq3Flight: [{ value: this.data.data.dosisagq3, disabled: true }, []],
        agq4Flight: [{ value: this.data.data.agq4, disabled: true }, [this.catalogoValidator('listadoAgroqNom')]],
        dosisagq4Flight: [{ value: this.data.data.dosisagq4, disabled: true }, []],
        coad1Flight: [{ value: this.data.data.coad1, disabled: true }, [Validators.required, this.catalogoValidator('ListadoCoadNom')]],
        dosiscoad1Flight: [{ value: this.data.data.dosiscoad1, disabled: true }, [Validators.required]],
        coad2Flight: [{ value: this.data.data.coad2, disabled: true }, [this.catalogoValidator('ListadoCoadNom')]],
        dosiscoad2Flight: [{ value: this.data.data.dosiscoad2, disabled: true }, []],
        formaPagoUpdateFlight: [{ value: this.data.data.formaPago, disabled: true }, [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
        precioHaUpdateFlight: [{ value: this.data.data.precioHa, disabled: true }, [Validators.required, Validators.minLength(0)]],
        aclaracionUpdateFlight: [{ value: this.data.data.aclaracion, disabled: true }, [Validators.maxLength(254)]],

    });

    canEditFlight: boolean | undefined;
    canDeleteFlight: boolean | undefined;;

    cultivosFiltrados!: Observable<Cultivo[]>;



    constructor(
        private fb: FormBuilder,
        public authService: AuthService,
        public globalsService: GlobalsService,
        public dialogRef: MatDialogRef<OwnerDataInfoComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private observationsService: ObservationsService,
        private ownerService: OwnerService,
        private layerService: LayerService,
        private router: Router,
        private _adminService: AdminService
    ) {
        this.vuelosSeleccionados = data;

    }

    ngOnInit(): void {

        // Guardamos el propietario actual
        const propietarioActual = this.data.data.propietario;


        console.log("this.data: ", this.data);
        console.log("idPilotoVuelo: ", this.data.data.pilotoVuelo);


        console.log("idPilotoVuelo: ", this.data.data.pilotoVuelo); // undefined
        console.log("Usuario autenticado : ", this.authService.auth.usuarioId);

        this.canEditFlight = this.admin || (this.piloto && this.data.data.pilotoVuelo === this.authService.auth.usuarioId);




        this.canDeleteFlight = this.admin || (this.piloto && this.data.data.pilotoVuelo === this.authService.auth.usuarioId);

        // Cargar lista de propietarios
        this.ownerService.getOwnersList()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((owners: OwnerListInput[]) => {
                this.ownersList = owners;

                //Encontrar el propietario actual en la lista
                const propietarioActual = this.ownersList.find(owner => owner.aliasPropietario === this.data.data.propietario);

                // Configurar el valor inicial del FormControl
                if (propietarioActual) {
                    this.flightUpdateForm.patchValue({
                        propietarioUpdateFlight2: propietarioActual
                    });
                    this._adminService.getOrdenesPorPropietario(propietarioActual.propietarioId)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe(ordenes => {
                            this.ordenesList = ordenes;
                        });
                }
            });

        // Cargar lista de cultivos
        this.ownerService.getCultivos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((cultivos: Cultivo[]) => {
                this.cultivosList = cultivos;

                // Crear un observable que filtre los cultivos según el valor ingresado
                this.cultivosFiltrados = new Observable<Cultivo[]>(observer => {
                    this.flightUpdateForm.get('cultivoUpdateFlight')?.valueChanges.subscribe(value => {
                        const filteredCultivos = this.cultivosList.filter(cultivo => cultivo.nombreCultivo.toLowerCase().includes(value.toLowerCase()));
                        observer.next(filteredCultivos);
                    });
                });
            });

        // Establecer el valor por defecto del cultivo
        this.flightUpdateForm.get('cultivoUpdateFlight')?.setValue(this.data.data.cultivoVuelo);




        // Cargar lista de tecnicos
        this.ownerService.getTecnicos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((tecnico: Tecnico[]) => {
                this.tecnicosList = tecnico;

                // Encontrar el cultivo actual en la lista
                const tecnicoActual = this.tecnicosList.find(tecnico => tecnico.nombreCompletoTecnico === this.data.data.tecnicoVuelo);

                // Configurar el valor inicial del FormControl
                if (tecnicoActual) {
                    this.flightUpdateForm.patchValue({
                        tecnicoUpdateFlight: tecnicoActual.nombreCompletoTecnico
                    });
                }
            });


        this.ownerService.getPilotos().subscribe((response: Piloto[]) => {
            this.pilotos = response;

            const valorActualPilotoNombreCompleto = this.flightUpdateForm.get('pilotoUpdateFlight')?.value;
            const pilotoSeleccionado = this.pilotos.find(piloto => piloto.pilotoId === valorActualPilotoNombreCompleto);

            if (pilotoSeleccionado) {
                const nombreCompletoPiloto = pilotoSeleccionado.nombreCompletoPiloto;
                localStorage.setItem('aliasPiloto', nombreCompletoPiloto);
            }
        });

        this._adminService.getAgroquimicos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((items: ListadoItem[]) => {
                this.listadoAgroquimicos = items;

                const agroquimicoInicial1 = this.listadoAgroquimicos.find(item => item.listadoAgroqNom === this.data.data.agq1);
                if (agroquimicoInicial1) {
                    this.flightUpdateForm.get('agq1Flight')?.setValue(agroquimicoInicial1);
                }
                this.filteredAgq1 = this.flightUpdateForm.get('agq1Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (!value || value === '-') return [];
                        if (typeof value === 'string') return this.filterAgroquimicos(value);
                        return [value];
                    })
                );

                const agroquimicoInicial2 = this.listadoAgroquimicos.find(item => item.listadoAgroqNom === this.data.data.agq2);
                if (agroquimicoInicial2) {
                    this.flightUpdateForm.get('agq2Flight')?.setValue(agroquimicoInicial2);
                }
                this.filteredAgq2 = this.flightUpdateForm.get('agq2Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (!value || value === '-') return [];
                        if (typeof value === 'string') return this.filterAgroquimicos(value);
                        return [value];
                    })
                );

                const agroquimicoInicial3 = this.listadoAgroquimicos.find(item => item.listadoAgroqNom === this.data.data.agq3);
                if (agroquimicoInicial3) {
                    this.flightUpdateForm.get('agq3Flight')?.setValue(agroquimicoInicial3);
                }
                this.filteredAgq3 = this.flightUpdateForm.get('agq3Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (!value || value === '-') return [];
                        if (typeof value === 'string') return this.filterAgroquimicos(value);
                        return [value];
                    })
                );

                const agroquimicoInicial4 = this.listadoAgroquimicos.find(item => item.listadoAgroqNom === this.data.data.agq4);
                if (agroquimicoInicial4) {
                    this.flightUpdateForm.get('agq4Flight')?.setValue(agroquimicoInicial4);
                }
                this.filteredAgq4 = this.flightUpdateForm.get('agq4Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (!value || value === '-') return [];
                        if (typeof value === 'string') return this.filterAgroquimicos(value);
                        return [value];
                    })
                );
            });

        this._adminService.getCoadyuvantes()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((items: ListadoItem[]) => {
                this.listadoCoadyuvantes = items;

                const coadyuvanteInicial1 = this.listadoCoadyuvantes.find(item => item.ListadoCoadNom === this.data.data.coad1);
                if (coadyuvanteInicial1) {
                    this.flightUpdateForm.get('coad1Flight')?.setValue(coadyuvanteInicial1);
                }
                this.filteredCoad1 = this.flightUpdateForm.get('coad1Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (!value || value === '-') return [];
                        if (typeof value === 'string') return this.filterCoadyuvantes(value);
                        return [value];
                    })
                );

                const coadyuvanteInicial2 = this.listadoCoadyuvantes.find(item => item.ListadoCoadNom === this.data.data.coad2);
                if (coadyuvanteInicial2) {
                    this.flightUpdateForm.get('coad2Flight')?.setValue(coadyuvanteInicial2);
                }
                this.filteredCoad2 = this.flightUpdateForm.get('coad2Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (!value || value === '-') return [];
                        if (typeof value === 'string') return this.filterCoadyuvantes(value);
                        return [value];
                    })
                );
            });



        this.flightUpdateForm.get('pilotoUpdateFlight')?.valueChanges.subscribe(value => {
            this.flightUpdateForm.get('idPilotoUpdateFlight')?.setValue(value);
        });

    }

    // Segunda

    catalogoValidator(nombreCampo: 'listadoAgroqNom' | 'ListadoCoadNom') {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (!value || value === '-' || typeof value !== 'string') {
                return null;
            }
            const trimmed = value.trim();
            if (!trimmed) return null;

            const catalogo = nombreCampo === 'listadoAgroqNom' ? this.listadoAgroquimicos : this.listadoCoadyuvantes;
            const existe = catalogo.some(item => {
                const nom = (item[nombreCampo] || '').trim().toLowerCase();
                return nom === trimmed.toLowerCase();
            });

            return existe ? { existsInCatalog: true } : null;
        };
    }

    enableEditing() {


        this.isEditing = !this.isEditing; // Alterna el estado de edición

        if (this.isEditing) {
            // Habilita cada campo del formulario de vuelo
            this.flightUpdateForm.get('vueloIdUpdateFlight')?.enable();
            this.flightUpdateForm.get('propietarioUpdateFlight2Text')?.disable(); // Ocultamos el texto
            this.flightUpdateForm.get('propietarioUpdateFlight2')?.enable(); // Mostramos el select
            this.flightUpdateForm.get('dateUpdateFlight')?.enable();
            this.flightUpdateForm.get('opNomenclaturaUpdateFlight')?.enable();
            this.flightUpdateForm.get('cuadroUpdateFlight')?.enable();
            this.flightUpdateForm.get('zonaUpdateFlight')?.enable();
            this.flightUpdateForm.get('cultivoUpdateFlight')?.enable();
            this.flightUpdateForm.get('caldohaUpdateFlight')?.enable();
            this.flightUpdateForm.get('areaUpdateFlight')?.enable();
            this.flightUpdateForm.get('pilotoUpdateFlight')?.enable();
            this.flightUpdateForm.get('tecnicoUpdateFlight')?.enable();
            this.flightUpdateForm.get('formaPagoUpdateFlight')?.enable();
            this.flightUpdateForm.get('precioHaUpdateFlight')?.enable();
            this.flightUpdateForm.get('aclaracionUpdateFlight')?.enable();
            this.flightUpdateForm.get('agq1Flight')?.enable();
            this.flightUpdateForm.get('dosisagq1Flight')?.enable();
            this.flightUpdateForm.get('agq2Flight')?.enable();
            this.flightUpdateForm.get('dosisagq2Flight')?.enable();
            this.flightUpdateForm.get('agq3Flight')?.enable();
            this.flightUpdateForm.get('dosisagq3Flight')?.enable();
            this.flightUpdateForm.get('agq4Flight')?.enable();
            this.flightUpdateForm.get('dosisagq4Flight')?.enable();
            this.flightUpdateForm.get('coad1Flight')?.enable();
            this.flightUpdateForm.get('dosiscoad1Flight')?.enable();
            this.flightUpdateForm.get('coad2Flight')?.enable();
            this.flightUpdateForm.get('dosiscoad2Flight')?.enable();
        } else {
            // Deshabilita los campos del formulario cuando se sale del modo de edición
            this.flightUpdateForm.get('vueloIdUpdateFlight')?.disable();
            this.flightUpdateForm.get('propietarioUpdateFlight2Text')?.disable(); // Mostramos el texto
            this.flightUpdateForm.get('propietarioUpdateFlight2')?.disable(); // Ocultamos el select
            this.flightUpdateForm.get('dateUpdateFlight')?.disable();
            this.flightUpdateForm.get('opNomenclaturaUpdateFlight')?.disable();
            this.flightUpdateForm.get('cuadroUpdateFlight')?.disable();
            this.flightUpdateForm.get('zonaUpdateFlight')?.disable();
            this.flightUpdateForm.get('cultivoUpdateFlight')?.disable();
            this.flightUpdateForm.get('caldohaUpdateFlight')?.disable();
            this.flightUpdateForm.get('areaUpdateFlight')?.disable();
            this.flightUpdateForm.get('pilotoUpdateFlight')?.disable();
            this.flightUpdateForm.get('tecnicoUpdateFlight')?.disable();
            this.flightUpdateForm.get('formaPagoUpdateFlight')?.disable();
            this.flightUpdateForm.get('precioHaUpdateFlight')?.disable();
            this.flightUpdateForm.get('aclaracionUpdateFlight')?.disable();
            this.flightUpdateForm.get('agq1Flight')?.disable();
            this.flightUpdateForm.get('dosisagq1Flight')?.disable();
            this.flightUpdateForm.get('agq2Flight')?.disable();
            this.flightUpdateForm.get('dosisagq2Flight')?.disable();
            this.flightUpdateForm.get('agq3Flight')?.disable();
            this.flightUpdateForm.get('dosisagq3Flight')?.disable();
            this.flightUpdateForm.get('agq4Flight')?.disable();
            this.flightUpdateForm.get('dosisagq4Flight')?.disable();
            this.flightUpdateForm.get('coad1Flight')?.disable();
            this.flightUpdateForm.get('dosiscoad1Flight')?.disable();
            this.flightUpdateForm.get('coad2Flight')?.disable();
            this.flightUpdateForm.get('dosiscoad2Flight')?.disable();
        }
    }

    deleteData() {
        let title;
        switch (this.data.type) {
            case "flight":
                title = "el vuelo";
                break;
            case "analysis":
                title = "el análisis";
                break;
        }
        confirmAlert(`¿Está seguro de que desea eliminar ${title}?`)
            .then((result: any) => {
                if (result.isConfirmed) {
                    switch (this.data.type) {
                        case "flight":

                            this.ownerService.deleteOwnerFlight(this.data.data.vueloId)
                                .pipe(takeUntil(this.unsubscribe$))
                                .subscribe((_) => {
                                    successAlert('El vuelo ha sido eliminado')
                                        .then(() => { this.globalsService.reloadPage(); });
                                }, error => {
                                    console.log(error);
                                    errorAlert(error.error.msg)
                                })

                            break;
                        case "observation":

                            this.observationsService.deleteObservation(this.data.data.observacionId)
                                .pipe(takeUntil(this.unsubscribe$))
                                .subscribe((_) => {
                                    successAlert('La observación ha sido eliminada')
                                        .then(() => { this.globalsService.reloadPage(); });
                                }, error => {
                                    console.log(error);
                                    errorAlert(error.error.msg)
                                })

                            break;
                        case "analysis":

                            this.layerService.deleteAnalysis(this.data.data.analisisId)
                                .pipe(takeUntil(this.unsubscribe$))
                                .subscribe((_) => {
                                    successAlert('El análisis ha sido dado de baja')
                                        .then(() => { this.globalsService.reloadPage(); });
                                }, error => {
                                    console.log(error);
                                    errorAlert(error.error.msg)
                                })

                            break;

                    }
                    this.ownerService.elementDeleted.next();
                    this.observationsService.elementDeleted.next();
                    this.layerService.elementDeleted.next();
                    this.dialogRef.close();
                }
            });
    }

    // Función auxiliar para asegurarse de que los campos opcionales no sean NaN o vacíos
    setDefaultValuesForOptionalFields() {
        const optionalFields = [
            'dosisagq2Flight',
            'dosisagq3Flight',
            'dosisagq4Flight',
            'dosiscoad2Flight'
        ];

        const optionalFields2 = [
            'agq2Flight',
            'agq3Flight',
            'agq4Flight',
            'coad2Flight',
        ];

        optionalFields.forEach(field => {
            const control = this.flightUpdateForm.get(field);
            if (control?.value === '' || control?.value === null) {
                control?.setValue(0);  // Reemplaza valores vacíos o nulos con 0
            }
        });

        optionalFields2.forEach(field => {
            const control = this.flightUpdateForm.get(field);
            if (control?.value === '' || control?.value === null) {
                control?.setValue('-');  // Reemplaza valores vacíos o nulos con un guión
            }
        });
    }

    updateFields(event: any) {
        const pilotoSeleccionado = this.pilotos.find(piloto => piloto.pilotoId === event.value);

        this.flightUpdateForm.get('idPilotoUpdateFlight')?.setValue(event.value);
        this.flightUpdateForm.get('nomCompletoPilotoUpdateFlight')?.setValue(`${pilotoSeleccionado?.nombrePiloto} ${pilotoSeleccionado?.apellidoPiloto}`);
    }

    onOrdenSelected(nomenclatura: string): void {
        if (!nomenclatura) return;
        const orden = this.ordenesList.find(o => o.opNomenclatura === nomenclatura);
        if (!orden) return;

        this.flightUpdateForm.patchValue({
            opNomenclaturaUpdateFlight: orden.opNomenclatura,
            areaUpdateFlight: orden.opSuperficie,
            formaPagoUpdateFlight: orden.opFormaPago,
            precioHaUpdateFlight: orden.opPrecioHa,
            aclaracionUpdateFlight: orden.opAclaracion || '',
        });

        if (orden.fk_Piloto) {
            const pilotoMatch = this.pilotos.find(p => p.pilotoId === orden.fk_Piloto);
            if (pilotoMatch) {
                this.flightUpdateForm.patchValue({
                    pilotoUpdateFlight: pilotoMatch.pilotoId,
                    nomCompletoPilotoUpdateFlight: pilotoMatch.nombreCompletoPiloto,
                });
                this.flightUpdateForm.get('pilotoUpdateFlight')?.markAsDirty();
            }
        }

        const propMatch = this.ownersList.find(o => o.propietarioId === orden.fk_Propietario);
        if (propMatch) {
            this.flightUpdateForm.patchValue({
                propietarioUpdateFlight2: propMatch,
            });
        }

        const getAgq = (nombre?: string) => {
            if (!nombre) return '-';
            const match = this.listadoAgroquimicos.find(a => a.listadoAgroqNom === nombre);
            return match || nombre;
        };
        for (let i = 1; i <= 4; i++) {
            const nombre = (orden as any)[`opAgroq${i}`];
            const dosis = (orden as any)[`opDosisAgroq${i}`];
            if (nombre) {
                this.flightUpdateForm.patchValue({ [`agq${i}Flight`]: getAgq(nombre) });
            }
            if (dosis !== null && dosis !== undefined) {
                this.flightUpdateForm.patchValue({ [`dosisagq${i}Flight`]: dosis });
            }
        }

        const getCoad = (nombre?: string) => {
            if (!nombre) return '-';
            const match = this.listadoCoadyuvantes.find(c => c.ListadoCoadNom === nombre);
            return match || nombre;
        };
        for (let i = 1; i <= 2; i++) {
            const nombre = (orden as any)[`opCoad${i}`];
            const dosis = (orden as any)[`opDosisCoad${i}`];
            if (nombre) {
                this.flightUpdateForm.patchValue({ [`coad${i}Flight`]: getCoad(nombre) });
            }
            if (dosis !== null && dosis !== undefined) {
                this.flightUpdateForm.patchValue({ [`dosiscoad${i}Flight`]: dosis });
            }
        }
    }

    updateData() {

        const nombreCompletoPiloto = localStorage.getItem('aliasPiloto');

        const pilotoIdUpdate = this.flightUpdateForm.value.pilotoUpdateFlight;
        const pilotoMatch = this.pilotos.find(p => p.pilotoId === pilotoIdUpdate);
        const pilotoNombreResolved = pilotoMatch
            ? pilotoMatch.nombreCompletoPiloto
            : String(nombreCompletoPiloto || pilotoIdUpdate || '');

        // Validamos que los campos no obligatorios tengan un valor válido, si están vacíos les asignamos 0
        this.setDefaultValuesForOptionalFields();

        let title;
        switch (this.data.type) {
            case "flight":
                title = "el vuelo";
                break;

        }

        if (this.flightUpdateForm.invalid) {
            this.flightUpdateForm.markAllAsTouched();  // Marca todos los campos como tocados
            return;  // No continúa si el formulario es inválido
        }
        confirmAlert(`¿Está seguro de que desea actualizar ${title}?`)
            .then((result: any) => {
                if (result.isConfirmed) {
                    switch (this.data.type) {
                        case "flight":

                            const agq1 = this.extractNombre(this.flightUpdateForm.value.agq1Flight, 'listadoAgroqNom');
                            const agq2 = this.extractNombre(this.flightUpdateForm.value.agq2Flight, 'listadoAgroqNom');
                            const agq3 = this.extractNombre(this.flightUpdateForm.value.agq3Flight, 'listadoAgroqNom');
                            const agq4 = this.extractNombre(this.flightUpdateForm.value.agq4Flight, 'listadoAgroqNom');
                            const coad1 = this.extractNombre(this.flightUpdateForm.value.coad1Flight, 'ListadoCoadNom');
                            const coad2 = this.extractNombre(this.flightUpdateForm.value.coad2Flight, 'ListadoCoadNom');

                            const updatedFlightData = {
                                fechaVuelo: this.flightUpdateForm.value.dateUpdateFlight,
                                propietario: this.flightUpdateForm.value.propietarioUpdateFlight2.aliasPropietario, // Para el alias,
                                cuadroVuelo: this.flightUpdateForm.value.cuadroUpdateFlight,
                                zonaVuelo: this.flightUpdateForm.value.zonaUpdateFlight,
                                cultivoVuelo: this.flightUpdateForm.value.cultivoUpdateFlight,
                                caldohaVuelo: this.flightUpdateForm.value.caldohaUpdateFlight,
                                superficieVuelo: this.flightUpdateForm.value.areaUpdateFlight,
                                pilotoVuelo: this.flightUpdateForm.value.pilotoUpdateFlight,
                                idPilotoVuelo: this.flightUpdateForm.value.pilotoUpdateFlight,
                                pilotoNombreCompleto: pilotoNombreResolved,
                                tecnicoVuelo: this.flightUpdateForm.value.tecnicoUpdateFlight,
                                formaPago: this.flightUpdateForm.value.formaPagoUpdateFlight,
                                precioHa: this.flightUpdateForm.value.precioHaUpdateFlight,
                                aclaracion: this.flightUpdateForm.value.aclaracionUpdateFlight,
                                agq1: agq1 || '-',
                                dosisagq1: this.flightUpdateForm.value.dosisagq1Flight,
                                agq2: agq2 || '-',
                                dosisagq2: this.flightUpdateForm.value.dosisagq2Flight || 0,
                                agq3: agq3 || '-',
                                dosisagq3: this.flightUpdateForm.value.dosisagq3Flight || 0,
                                agq4: agq4 || '-',
                                dosisagq4: this.flightUpdateForm.value.dosisagq4Flight || 0,
                                coad1: coad1 || '-',
                                dosiscoad1: this.flightUpdateForm.value.dosiscoad1Flight,
                                coad2: coad2 || '-',
                                dosiscoad2: this.flightUpdateForm.value.dosiscoad2Flight || 0,
                                totagq1: this.flightUpdateForm.value.areaUpdateFlight * this.flightUpdateForm.value.dosisagq1Flight,
                                totagq2: this.flightUpdateForm.value.areaUpdateFlight * this.flightUpdateForm.value.dosisagq2Flight,
                                totagq3: this.flightUpdateForm.value.areaUpdateFlight * this.flightUpdateForm.value.dosisagq3Flight,
                                totagq4: this.flightUpdateForm.value.areaUpdateFlight * this.flightUpdateForm.value.dosisagq4Flight,
                                totcoad1: this.flightUpdateForm.value.areaUpdateFlight * this.flightUpdateForm.value.dosiscoad1Flight,
                                totcoad2: this.flightUpdateForm.value.areaUpdateFlight * this.flightUpdateForm.value.dosiscoad2Flight,
                                fk_Usuario: this.flightUpdateForm.value.propietarioUpdateFlight2.propietarioId, // Para el ID
                                opNomenclatura: this.flightUpdateForm.value.opNomenclaturaUpdateFlight || this.data.data.opNomenclatura || null,
                            }
                            this.ownerService.updateFlight(this.data.data.vueloId, updatedFlightData)
                                .pipe(takeUntil(this.unsubscribe$))
                                .subscribe((_) => {
                                    successAlert('El vuelo ha sido actualizado')
                                        .then(() => {
                                            this.globalsService.reloadPage();

                                        });
                                }, error => {
                                    console.log(error);
                                    errorAlert(error.error.msg)
                                })
                            break;
                    }
                    this.ownerService.elementDeleted.next();
                    this.observationsService.elementDeleted.next();
                    this.layerService.elementDeleted.next();
                    this.dialogRef.close();
                }
            });
    }

    // Método para filtrar los agroquímicos desde el catálogo maestro
    filterAgroquimicos(value: string): ListadoItem[] {
        const filterValue = value.toLowerCase().trim();
        if (!filterValue) return this.listadoAgroquimicos.slice();
        return this.listadoAgroquimicos.filter(item =>
            (item.listadoAgroqNom || '').toLowerCase().includes(filterValue)
        );
    }

    displayAgroquimico(item: ListadoItem | string) {
        if (typeof item === 'string') return item;
        return item?.listadoAgroqNom || '';
    }

    filterCoadyuvantes(value: string): ListadoItem[] {
        const filterValue = value.toLowerCase().trim();
        if (!filterValue) return this.listadoCoadyuvantes.slice();
        return this.listadoCoadyuvantes.filter(item =>
            (item.ListadoCoadNom || '').toLowerCase().includes(filterValue)
        );
    }

    displayCoadyuvante(item: ListadoItem | string) {
        if (typeof item === 'string') return item;
        return item?.ListadoCoadNom || '';
    }

    private extractNombre(value: any, campo: 'listadoAgroqNom' | 'ListadoCoadNom'): string {
        if (typeof value === 'string') return value;
        return value?.[campo] || '-';
    }

}
