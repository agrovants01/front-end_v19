import { AfterViewInit, Component, EventEmitter, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ControlContainer, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { Agroquimico } from 'src/app/pages/owner/agroquimico.interface';
import { Coadyuvante } from 'src/app/pages/owner/coadyuvante.interface';
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
    //==========================================================================
    agroquimicosList: Agroquimico[] = [];
    //filteredAgroquimicos: Agroquimico[] = [];
    //==========================================================================
    coadyuvantesList: Coadyuvante[] = [];
    //filteredCoadyuvantes: Coadyuvante[] = [];





    filteredAgq1: Observable<Agroquimico[]> = new Observable();
    filteredAgq2: Observable<Agroquimico[]> = new Observable();
    filteredAgq3: Observable<Agroquimico[]> = new Observable();
    filteredAgq4: Observable<Agroquimico[]> = new Observable();
    filteredCoad1: Observable<Coadyuvante[]> = new Observable();
    filteredCoad2: Observable<Coadyuvante[]> = new Observable();


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
        nomCompletoPilotoUpdateFlight: [{ value: this.data.data.pilotoVuelo }, []],
        tecnicoUpdateFlight: [{ value: this.data.data.tecnicoVuelo, disabled: true }, [Validators.required]],
        agq1Flight: [{ value: this.data.data.agq1, disabled: true }, [Validators.required]],
        dosisagq1Flight: [{ value: this.data.data.dosisagq1, disabled: true }, [Validators.required]],
        agq2Flight: [{ value: this.data.data.agq2, disabled: true }, []],
        dosisagq2Flight: [{ value: this.data.data.dosisagq2, disabled: true }, []],
        agq3Flight: [{ value: this.data.data.agq3, disabled: true }, []],
        dosisagq3Flight: [{ value: this.data.data.dosisagq3, disabled: true }, []],
        agq4Flight: [{ value: this.data.data.agq4, disabled: true }, []],
        dosisagq4Flight: [{ value: this.data.data.dosisagq4, disabled: true }, []],
        coad1Flight: [{ value: this.data.data.coad1, disabled: true }, [Validators.required]],
        dosiscoad1Flight: [{ value: this.data.data.dosiscoad1, disabled: true }, [Validators.required]],
        coad2Flight: [{ value: this.data.data.coad2, disabled: true }, []],
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
        private router: Router
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

        this.ownerService.getAgroquimicos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((agroquimicos: Agroquimico[]) => {
                this.agroquimicosList = agroquimicos;


                const agroquimicoInicial1 = this.agroquimicosList.find(agroquimico => agroquimico.nombreAgroquimico === this.data.data.agq1);
                if (agroquimicoInicial1) {
                    this.flightUpdateForm.get('agq1Flight')?.setValue(agroquimicoInicial1);
                }
                // Crear observables que filtren los agroquímicos según el valor ingresado
                this.filteredAgq1 = this.flightUpdateForm.get('agq1Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (typeof value === 'string') {
                            return this.filterAgroquimicos(value);
                        } else {
                            return [value];
                        }
                    })
                );

                const agroquimicoInicial2 = this.agroquimicosList.find(agroquimico => agroquimico.nombreAgroquimico === this.data.data.agq2);
                if (agroquimicoInicial2) {
                    this.flightUpdateForm.get('agq2Flight')?.setValue(agroquimicoInicial2);
                }
                // Crear observables que filtren los agroquímicos según el valor ingresado
                this.filteredAgq2 = this.flightUpdateForm.get('agq2Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (typeof value === 'string') {
                            return this.filterAgroquimicos(value);
                        } else {
                            return [value];
                        }
                    })
                );

                const agroquimicoInicial3 = this.agroquimicosList.find(agroquimico => agroquimico.nombreAgroquimico === this.data.data.agq3);
                if (agroquimicoInicial3) {
                    this.flightUpdateForm.get('agq3Flight')?.setValue(agroquimicoInicial3);
                }
                // Crear observables que filtren los agroquímicos según el valor ingresado
                this.filteredAgq3 = this.flightUpdateForm.get('agq3Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (typeof value === 'string') {
                            return this.filterAgroquimicos(value);
                        } else {
                            return [value];
                        }
                    })
                );


                const agroquimicoInicial4 = this.agroquimicosList.find(agroquimico => agroquimico.nombreAgroquimico === this.data.data.agq4);
                if (agroquimicoInicial4) {
                    this.flightUpdateForm.get('agq4Flight')?.setValue(agroquimicoInicial4);
                }
                // Crear observables que filtren los agroquímicos según el valor ingresado
                this.filteredAgq4 = this.flightUpdateForm.get('agq4Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (typeof value === 'string') {
                            return this.filterAgroquimicos(value);
                        } else {
                            return [value];
                        }
                    })
                );
            });


        this.ownerService.getCoadyuvantes()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((coadyuvantes: Coadyuvante[]) => {
                this.coadyuvantesList = coadyuvantes;


                const coadyuvanteInicial1 = this.coadyuvantesList.find(coadyuvante => coadyuvante.nombreCoadyuvante === this.data.data.coad1);
                if (coadyuvanteInicial1) {
                    this.flightUpdateForm.get('coad1Flight')?.setValue(coadyuvanteInicial1);
                }
                // Crear observables que filtren los agroquímicos según el valor ingresado
                this.filteredCoad1 = this.flightUpdateForm.get('coad1Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (typeof value === 'string') {
                            return this.filterCoadyuvantes(value);
                        } else {
                            return [value];
                        }
                    })
                );



                const coadyuvanteInicial2 = this.coadyuvantesList.find(coadyuvante => coadyuvante.nombreCoadyuvante === this.data.data.coad2);
                if (coadyuvanteInicial2) {
                    this.flightUpdateForm.get('coad2Flight')?.setValue(coadyuvanteInicial2);
                }
                // Crear observables que filtren los agroquímicos según el valor ingresado
                this.filteredCoad2 = this.flightUpdateForm.get('coad2Flight')!.valueChanges.pipe(
                    startWith(''),
                    map(value => {
                        if (typeof value === 'string') {
                            return this.filterCoadyuvantes(value);
                        } else {
                            return [value];
                        }
                    })
                );


            });



        this.flightUpdateForm.get('pilotoUpdateFlight')?.valueChanges.subscribe(value => {
            this.flightUpdateForm.get('idPilotoUpdateFlight')?.setValue(value);
        });

    }

    // Segunda

    enableEditing() {


        this.isEditing = !this.isEditing; // Alterna el estado de edición

        if (this.isEditing) {
            // Habilita cada campo del formulario de vuelo
            this.flightUpdateForm.get('vueloIdUpdateFlight')?.enable();
            this.flightUpdateForm.get('propietarioUpdateFlight2Text')?.disable(); // Ocultamos el texto
            this.flightUpdateForm.get('propietarioUpdateFlight2')?.enable(); // Mostramos el select
            this.flightUpdateForm.get('dateUpdateFlight')?.enable();
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

    updateData() {

        const nombreCompletoPiloto = localStorage.getItem('aliasPiloto');

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

                            const agq1Value = this.flightUpdateForm.value.agq1Flight;
                            const agq1 = typeof agq1Value === 'object' ? agq1Value.nombreAgroquimico : agq1Value;
                            const agq2Value = this.flightUpdateForm.value.agq2Flight;
                            const agq2 = typeof agq1Value === 'object' ? agq2Value.nombreAgroquimico : agq2Value;
                            const agq3Value = this.flightUpdateForm.value.agq3Flight;
                            const agq3 = typeof agq3Value === 'object' ? agq3Value.nombreAgroquimico : agq3Value;
                            const agq4Value = this.flightUpdateForm.value.agq4Flight;
                            const agq4 = typeof agq4Value === 'object' ? agq4Value.nombreAgroquimico : agq4Value;
                            const coad1Value = this.flightUpdateForm.value.coad1Flight;
                            const coad1 = typeof coad1Value === 'object' ? coad1Value.nombreCoadyuvante : coad1Value;
                            const coad2Value = this.flightUpdateForm.value.coad2Flight;
                            const coad2 = typeof coad2Value === 'object' ? coad2Value.nombreCoadyuvante : coad2Value;

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
                                pilotoNombreCompleto: this.flightUpdateForm.get('pilotoUpdateFlight')?.pristine
                                    ? nombreCompletoPiloto
                                    : this.flightUpdateForm.value.nomCompletoPilotoUpdateFlight,
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

    // Método para filtrar los agroquímicos
    filterAgroquimicos(value: string): Agroquimico[] {
        const filterValue = value.toLowerCase();
        return this.agroquimicosList.filter(agroquimico => agroquimico.nombreAgroquimico.toLowerCase().includes(filterValue));
    }

    displayAgroquimico(agroquimico: any) {
        return agroquimico && agroquimico.nombreAgroquimico ? agroquimico.nombreAgroquimico : '';
    }

    filterCoadyuvantes(value: string): Coadyuvante[] {
        const filterValue = value.toLowerCase();
        return this.coadyuvantesList.filter(coadyuvante => coadyuvante.nombreCoadyuvante.toLowerCase().includes(filterValue));
    }

    displayCoadyuvante(coadyuvante: any) {
        return coadyuvante && coadyuvante.nombreCoadyuvante ? coadyuvante.nombreCoadyuvante : '';
    }

}
