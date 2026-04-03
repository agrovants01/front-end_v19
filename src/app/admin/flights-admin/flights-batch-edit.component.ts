// Dependencias, operadores, rxjs, etc
import { ChangeDetectorRef } from '@angular/core';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocomplete, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
// Servicios
import { OwnerService } from 'src/app/pages/services/owner.service';
import { confirmAlert } from 'src/app/shared/services/alerts';
// Interfaces
import { Tecnico } from 'src/app/pages/owner/tecnico.interface';
import { Cultivo } from 'src/app/pages/owner/cultivo.interface';
import { Piloto } from 'src/app/pages/owner/pilot.interface';
import { OwnerListInput } from 'src/app/pages/owner/owner.interface';
import { Agroquimico } from 'src/app/pages/owner/agroquimico.interface';
import { Coadyuvante } from 'src/app/pages/owner/coadyuvante.interface';


@Component({
    standalone: false,
    selector: 'app-flights-batch-edit',
    templateUrl: './flights-batch-edit.component.html',
    styleUrls: ['./flights-batch-edit.component.css']
})
export class FlightsBatchEditComponent implements OnInit {
    [x: string]: any;


    formasPago = [
        { value: 'PAGO PENDIENTE', viewValue: 'PAGO PENDIENTE' },
        { value: 'CONTADO', viewValue: 'CONTADO' },
        { value: 'CHEQUE', viewValue: 'CHEQUE' },
        { value: 'TRANSFERENCIA', viewValue: 'TRANSFERENCIA' },
        { value: 'MERCADO PAGO', viewValue: 'MERCADO PAGO' },
        { value: 'PAGADO', viewValue: 'PAGADO' },
    ];



    flightBatchUpdateForm!: FormGroup; // Define el FormGroup para manejar los campos
    vuelosSeleccionados: any[];

    //==========================================================================
    ownersList: OwnerListInput[] = [];// lista que viene del servicio ownerService.
    filteredOwners: OwnerListInput[] = [];// lista de filtrados
    //==========================================================================
    cultivosList: Cultivo[] = [];
    filteredCultivos: Cultivo[] = [];
    //==========================================================================
    pilotosList: Piloto[] = [];
    filteredPilotos: Piloto[] = [];
    //==========================================================================
    tecnicosList: Tecnico[] = [];
    filteredTecnicos: Tecnico[] = [];
    //==========================================================================
    agroquimicosList: Agroquimico[] = [];
    //filteredAgroquimicos: Agroquimico[] = [];
    //==========================================================================
    coadyuvantesList: Coadyuvante[] = [];
    //filteredCoadyuvantes: Coadyuvante[] = [];



    filteredAgq1: Agroquimico[] = [];
    filteredAgq2: Agroquimico[] = [];
    filteredAgq3: Agroquimico[] = [];
    filteredAgq4: Agroquimico[] = [];
    filteredCoad1: Coadyuvante[] = [];
    filteredCoad2: Coadyuvante[] = [];


    // Las funciones displayAgroquimico y displayCoadyuvante deben estar aquí
    displayAgroquimico(agroquimico: Agroquimico | null | string): string {
        if (agroquimico && typeof agroquimico === 'object' && 'nombreAgroquimico' in agroquimico) {
            return agroquimico.nombreAgroquimico;
        }
        return '';
    }

    displayCoadyuvante(coadyuvante: Coadyuvante | null | string): string {
        if (coadyuvante && typeof coadyuvante === 'object' && 'nombreCoadyuvante' in coadyuvante) {
            return coadyuvante.nombreCoadyuvante;
        }
        return '';
    }




    @ViewChild('autoPropietario') autoPropietario!: MatAutocomplete;
    @ViewChild('propietarioInput') propietarioInput!: ElementRef;
    @ViewChild('auto') auto!: MatAutocomplete;

    @ViewChild('autoCultivo') autoCultivo!: MatAutocomplete;
    @ViewChild('cultivoInput') cultivoInput!: ElementRef;

    @ViewChild('autoPiloto') autoPiloto!: MatAutocomplete;
    @ViewChild('pilotoInput') pilotoInput!: ElementRef;

    @ViewChild('autoTecnico') autoTecnico!: MatAutocomplete;
    @ViewChild('tecnicoInput') tecnicoInput!: ElementRef;


    @ViewChild('agq1Input') agq1Input!: ElementRef;
    @ViewChild('agq2Input') agq2Input!: ElementRef;
    @ViewChild('agq3Input') agq3Input!: ElementRef;
    @ViewChild('agq4Input') agq4Input!: ElementRef;
    @ViewChild('autoAgq1') autoAgq1!: MatAutocomplete;
    @ViewChild('autoAgq2') autoAgq2!: MatAutocomplete;
    @ViewChild('autoAgq3') autoAgq3!: MatAutocomplete;
    @ViewChild('autoAgq4') autoAgq4!: MatAutocomplete;

    @ViewChild('coad1Input') coad1Input!: ElementRef;
    @ViewChild('coad2Input') coad2Input!: ElementRef;
    @ViewChild('autoCoad1') autoCoad1!: MatAutocomplete;
    @ViewChild('autoCoad2') autoCoad2!: MatAutocomplete;



    isTyping = false;
    isTypingCultivo = false;
    isTypingPiloto = false;
    isTypingTecnico = false;

    isTypingAgq1 = false;
    isTypingAgq2 = false;
    isTypingAgq3 = false;
    isTypingAgq4 = false;
    isTypingCoad1 = false;
    isTypingCoad2 = false;

    private unsubscribe$ = new Subject<void>();


    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private dialogRef: MatDialogRef<FlightsBatchEditComponent>,
        private fb: FormBuilder, // Inyecta FormBuilder para crear formularios
        private ownerService: OwnerService,
        private changeDetectorRef: ChangeDetectorRef
    ) {
        this.vuelosSeleccionados = data;
    }

    ngOnInit(): void {
        // Inicializa el formulario con FormBuilder
        this.flightBatchUpdateForm = this.fb.group({
            propietario: ['', []],
            fk_Usuario: ['', []],
            fechaVuelo: ['', []],
            cultivoVuelo: ['', []],
            caldohaVuelo: ['', []],
            pilotoNombreCompleto: ['', []],
            idPilotoVuelo: ['', []],
            pilotoVuelo: ['', []],
            tecnicoVuelo: ['', []],
            precioHa: [0, [Validators.minLength(1)]],
            formaPago: ['', []],
            agq1: ['', []],
            dosisagq1: [0, [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
            agq2: ['', []],
            dosisagq2: [0, [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
            agq3: ['', []],
            dosisagq3: [0, [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
            agq4: ['', []],
            dosisagq4: [0, [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
            coad1: ['', []],
            dosiscoad1: [0, [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
            coad2: ['', []],
            dosiscoad2: [0, [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
            aclaracion: ['', []],
        });

        // segunda parte 1

        //=========================================================

        // Cargar lista de agroquimicos en campo de agroquimicos (1,2,3 y 4)
        this.ownerService.getAgroquimicos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((agroquimicos: Agroquimico[]) => {
                this.agroquimicosList = agroquimicos;
                this.filteredAgroquimicos = agroquimicos;
                console.log(this.agroquimicosList);
            });

        // Cargar lista de coadyuvantes
        this.ownerService.getCoadyuvantes()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((coadyuvantes: Coadyuvante[]) => {
                this.coadyuvantesList = coadyuvantes;
                this.filteredCoadyuvantes = coadyuvantes;
                console.log(this.coadyuvantesList);
            });


        // Configurar listeners para agroquímicos
        this.flightBatchUpdateForm.get('agq1')?.valueChanges.subscribe(value => {
            this.isTypingAgq1 = true;
            if (typeof value === 'string') {
                this.filteredAgq1 = this.agroquimicosList.filter(agroquimico =>
                    agroquimico.nombreAgroquimico.toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        this.flightBatchUpdateForm.get('agq2')?.valueChanges.subscribe(value => {
            this.isTypingAgq2 = true;
            if (typeof value === 'string') {
                this.filteredAgq2 = this.agroquimicosList.filter(agroquimico =>
                    agroquimico.nombreAgroquimico.toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        this.flightBatchUpdateForm.get('agq3')?.valueChanges.subscribe(value => {
            this.isTypingAgq3 = true;
            if (typeof value === 'string') {
                this.filteredAgq3 = this.agroquimicosList.filter(agroquimico =>
                    agroquimico.nombreAgroquimico.toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        this.flightBatchUpdateForm.get('agq4')?.valueChanges.subscribe(value => {
            this.isTypingAgq4 = true;
            if (typeof value === 'string') {
                this.filteredAgq4 = this.agroquimicosList.filter(agroquimico =>
                    agroquimico.nombreAgroquimico.toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        // Configurar listeners para coadyuvantes
        this.flightBatchUpdateForm.get('coad1')?.valueChanges.subscribe(value => {
            this.isTypingCoad1 = true;
            if (typeof value === 'string') {
                this.filteredCoad1 = this.coadyuvantesList.filter(coadyuvante =>
                    coadyuvante.nombreCoadyuvante.toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        this.flightBatchUpdateForm.get('coad2')?.valueChanges.subscribe(value => {
            this.isTypingCoad2 = true;
            if (typeof value === 'string') {
                this.filteredCoad2 = this.coadyuvantesList.filter(coadyuvante =>
                    coadyuvante.nombreCoadyuvante.toLowerCase().includes(value.toLowerCase())
                );
            }
        });


        //=========================================================

        // Cargar lista de propietarios
        this.ownerService.getOwnersList()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((owners: OwnerListInput[]) => {
                this.ownersList = owners;
                this.filteredOwners = owners;
            });

        this.flightBatchUpdateForm.get('propietario')?.valueChanges.subscribe(value => {
            this.isTyping = true;
            this.filteredOwners = this.ownersList.filter(owner =>
                owner.aliasPropietario.toLowerCase().includes(value.toLowerCase())
            );
        });

        //===========================================================================================================================
        // Cargar lista de cultivos
        this.ownerService.getCultivos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((cultivos: Cultivo[]) => {
                this.cultivosList = cultivos;
                this.filteredCultivos = cultivos;
            });

        this.flightBatchUpdateForm.get('cultivoVuelo')?.valueChanges.subscribe(value => {
            this.isTypingCultivo = true;
            this.filteredCultivos = this.cultivosList.filter(cultivo =>
                cultivo.nombreCultivo.toLowerCase().includes(value.toLowerCase())
            );
        });
        //===========================================================================================================================
        // Cargar lista de pilotos para el select
        this.ownerService.getPilotos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((pilotos: Piloto[]) => {
                this.pilotosList = pilotos;
                this.filteredPilotos = pilotos;
            });

        this.flightBatchUpdateForm.get('pilotoNombreCompleto')?.valueChanges.subscribe(value => {
            this.isTypingPiloto = true;
            this.filteredPilotos = this.pilotosList.filter(piloto =>
                piloto.nombreCompletoPiloto.toLowerCase().includes(value.toLowerCase())
            );
        });

        //===========================================================================================================================
        // Cargar lista de tecnicos para el select
        this.ownerService.getTecnicos()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((tecnicos: Tecnico[]) => {
                this.tecnicosList = tecnicos;
                this.filteredTecnicos = tecnicos;
            });

        this.flightBatchUpdateForm.get('tecnicoVuelo')?.valueChanges.subscribe(value => {
            this.isTypingTecnico = true;
            this.filteredTecnicos = this.tecnicosList.filter(tecnico =>
                tecnico.nombreCompletoTecnico.toLowerCase().includes(value.toLowerCase())
            );
        });

    }

    // Segunda parte
    //=====================================================================================================
    /**
     * GUARDAR CAMBIOS
     */

    guardarCambios(): void {
        confirmAlert().then((result: any) => {
            if (result.isConfirmed) {
                if (this.flightBatchUpdateForm.valid) {
                    const cambios = this.flightBatchUpdateForm.value;
                    console.log('Valores a cambiar: ', cambios);

                    // Convertir `fechaVuelo` a formato `YYYY-MM-DD` si es necesario
                    if (cambios.fechaVuelo instanceof Date) {
                        cambios.fechaVuelo = cambios.fechaVuelo.toISOString().split('T')[0];
                    }

                    console.log('Datos enviados:', cambios);

                    // Obtener solo los campos que realmente han sido modificados
                    const camposModificados = this.obtenerCamposRealmenteModificados(cambios);

                    // Asegurarse de que los campos piloto se incluyen juntos
                    if (camposModificados.pilotoNombreCompleto) {
                        // Si el nombre del piloto fue modificado, asegurarse de que su ID también se envía
                        if (!camposModificados.idPilotoVuelo && cambios.idPilotoVuelo) {
                            camposModificados.idPilotoVuelo = cambios.idPilotoVuelo;
                        }
                        if (!camposModificados.pilotoVuelo && cambios.pilotoVuelo) {
                            camposModificados.pilotoVuelo = cambios.pilotoVuelo;
                        }
                    }

                    console.log('Campos modificados:', camposModificados);

                    // Enviar los cambios al backend
                    this.dialogRef.close({ cambios: camposModificados });
                }
            }
        });
    }

    // Método para obtener solo los campos realmente modificados
    private obtenerCamposRealmenteModificados(cambios: any): any {
        const resultado: any = {};
        const controles = this.flightBatchUpdateForm.controls;

        // Recorrer todos los controles del formulario
        Object.keys(controles).forEach(key => {
            // Verificar si el control ha sido modificado por el usuario
            if (controles[key].dirty) {
                // Para campos numéricos, asegurarse de que tengan un valor válido
                if (typeof cambios[key] === 'number') {
                    // Solo incluir campos numéricos si tienen un valor válido (no nulo/undefined)
                    if (cambios[key] !== null && cambios[key] !== undefined) {
                        resultado[key] = cambios[key];
                    }
                }
                // Para campos de texto, solo incluir si no están vacíos
                else if (typeof cambios[key] === 'string') {
                    if (cambios[key] !== '') {
                        resultado[key] = cambios[key];
                    }
                }
                // Para otros tipos de datos (fechas, objetos, etc.)
                else if (cambios[key] !== null && cambios[key] !== undefined) {
                    resultado[key] = cambios[key];
                }
            }
        });

        return resultado;
    }

    // tecera parte
    //=====================================================================================================
    // Funcion que toma los ids del objeto de lista y lo asigna a un campo id para despues grabarlo en bbdd

    updateIdAgq1(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('agq1')?.setValue(event.option.value.nombreAgroquimico);
    }

    updateIdAgq2(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('agq2')?.setValue(event.option.value.nombreAgroquimico);
    }

    updateIdAgq3(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('agq3')?.setValue(event.option.value.nombreAgroquimico);
    }

    updateIdAgq4(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('agq4')?.setValue(event.option.value.nombreAgroquimico);
    }

    updateIdCoad1(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('coad1')?.setValue(event.option.value.nombreCoadyuvante);
    }

    updateIdCoad2(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('coad2')?.setValue(event.option.value.nombreCoadyuvante);
    }

    updateIdPropietario(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('propietario')?.setValue(event.option.value.aliasPropietario);
        //alert(event.option.value.aliasPropietario);
        this.flightBatchUpdateForm.get('fk_Usuario')?.setValue(event.option.value.propietarioId);
        //alert(event.option.value.propietarioId);
        this.flightBatchUpdateForm.get('fk_Usuario')?.markAsDirty(); // Agregar esta línea

    }

    updateIdCultivo(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('cultivoVuelo')?.setValue(event.option.value.nombreCultivo);
    }

    // Tu función existente que funciona correctamente
    updateIdPiloto(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('pilotoNombreCompleto')?.setValue(event.option.value.nombreCompletoPiloto);
        this.flightBatchUpdateForm.get('idPilotoVuelo')?.setValue(event.option.value.pilotoId);
        this.flightBatchUpdateForm.get('pilotoVuelo')?.setValue(event.option.value.pilotoId);

        // Marcar como dirty para que se incluyan en los cambios
        this.flightBatchUpdateForm.get('pilotoNombreCompleto')?.markAsDirty();
        this.flightBatchUpdateForm.get('idPilotoVuelo')?.markAsDirty();
        this.flightBatchUpdateForm.get('pilotoVuelo')?.markAsDirty();
    }

    updateIdTecnico(event: MatAutocompleteSelectedEvent) {
        this.flightBatchUpdateForm.get('tecnicoVuelo')?.setValue(event.option.value.nombreCompletoTecnico); // Añadido
    }



    //=====================================================================================================
    /**
    * FUNCIONES DE FORMULARIOS DE PROPIETARIOS
    */
    onOptionSelected(event: MatAutocompleteSelectedEvent) {
        this.updateIdPropietario(event);
        setTimeout(() => {
            this.propietarioInput.nativeElement.value = event.option.viewValue;
        }, 0);
    }


    displayPropietario(owner: OwnerListInput): string {
        return owner.aliasPropietario;
    }

    onInput(event: any) {
        if (event.inputType !== 'deleteContentBackward') {
            this.isTyping = true;
            this.filteredOwners = this.ownersList.filter(owner =>
                owner.aliasPropietario.toLowerCase().includes(event.target.value.toLowerCase())
            );
        }
    }

    //=====================================================================================================
    /**
    * FUNCIONES DE FORMULARIOS DE CULTIVOS
    */

    onOptionSelectedCultivo(event: MatAutocompleteSelectedEvent) {
        this.updateIdCultivo(event);
        setTimeout(() => {
            this.cultivoInput.nativeElement.value = event.option.viewValue;
        }, 0);
    }

    displayCultivo(cultivo: Cultivo): string {
        return cultivo.nombreCultivo;
    }

    onInputCultivo(event: any) {
        if (event.inputType !== 'deleteContentBackward') {
            this.isTypingCultivo = true;
            this.filteredCultivos = this.cultivosList.filter(cultivo =>
                cultivo.nombreCultivo.toLowerCase().includes(event.target.value.toLowerCase())
            );
        }
    }

    //=====================================================================================================
    /**
    * FUNCIONES DE FORMULARIOS DE PILOTOS
    */
    // Corregir el método onOptionSelectedPiloto
    onOptionSelectedPiloto(event: MatAutocompleteSelectedEvent) {
        // Llama a la función que ya tienes y que sabes que funciona
        this.updateIdPiloto(event);

        this.isTypingPiloto = false;

        setTimeout(() => {
            this.pilotoInput.nativeElement.value = event.option.value.nombreCompletoPiloto;
        }, 0);
    }

    displayPiloto(piloto: Piloto): string {
        return piloto.nombreCompletoPiloto;
    }

    onInputPiloto(event: any) {
        if (event.inputType !== 'deleteContentBackward') {
            this.isTypingPiloto = true;
            this.filteredPilotos = this.pilotosList.filter(piloto =>
                piloto.nombreCompletoPiloto.toLowerCase().includes(event.target.value.toLowerCase())
            );
        }
    }
    //=====================================================================================================
    /**
    * FUNCIONES DE FORMULARIOS DE TECNICOS
    */

    onOptionSelectedTecnico(event: MatAutocompleteSelectedEvent) {
        this.updateIdTecnico(event);
        setTimeout(() => {
            this.tecnicoInput.nativeElement.value = event.option.viewValue;
        }, 0);
    }


    displayTecnico(tecnico: Tecnico): string {
        return tecnico.nombreCompletoTecnico;
    }

    onInputTecnico(event: any) {
        if (event.inputType !== 'deleteContentBackward') {
            this.isTypingTecnico = true;
            this.filteredTecnicos = this.tecnicosList.filter(tecnico =>
                tecnico.nombreCompletoTecnico.toLowerCase().includes(event.target.value.toLowerCase())
            );
        }
    }


    //========================================================
    // solucion nueva


    // Métodos de manejo de eventos para agroquímicos
    onInputAgq1(event: any) {
        if (event.inputType !== 'deleteContentBackward' || event.target.value === '') {
            this.isTypingAgq1 = true;
            const value = event.target.value;
            this.filteredAgq1 = this.agroquimicosList.filter(agroquimico =>
                agroquimico.nombreAgroquimico.toLowerCase().includes(value.toLowerCase())
            );
        }
    }

    onInputAgq2(event: any) {
        if (event.inputType !== 'deleteContentBackward' || event.target.value === '') {
            this.isTypingAgq2 = true;
            const value = event.target.value;
            this.filteredAgq2 = this.agroquimicosList.filter(agroquimico =>
                agroquimico.nombreAgroquimico.toLowerCase().includes(value.toLowerCase())
            );
        }
    }

    onInputAgq3(event: any) {
        if (event.inputType !== 'deleteContentBackward' || event.target.value === '') {
            this.isTypingAgq3 = true;
            const value = event.target.value;
            this.filteredAgq3 = this.agroquimicosList.filter(agroquimico =>
                agroquimico.nombreAgroquimico.toLowerCase().includes(value.toLowerCase())
            );
        }
    }

    onInputAgq4(event: any) {
        if (event.inputType !== 'deleteContentBackward' || event.target.value === '') {
            this.isTypingAgq4 = true;
            const value = event.target.value;
            this.filteredAgq4 = this.agroquimicosList.filter(agroquimico =>
                agroquimico.nombreAgroquimico.toLowerCase().includes(value.toLowerCase())
            );
        }
    }

    // Métodos de manejo de eventos para coadyuvantes
    onInputCoad1(event: any) {
        if (event.inputType !== 'deleteContentBackward' || event.target.value === '') {
            this.isTypingCoad1 = true;
            const value = event.target.value;
            this.filteredCoad1 = this.coadyuvantesList.filter(coadyuvante =>
                coadyuvante.nombreCoadyuvante.toLowerCase().includes(value.toLowerCase())
            );
        }
    }

    onInputCoad2(event: any) {
        if (event.inputType !== 'deleteContentBackward' || event.target.value === '') {
            this.isTypingCoad2 = true;
            const value = event.target.value;
            this.filteredCoad2 = this.coadyuvantesList.filter(coadyuvante =>
                coadyuvante.nombreCoadyuvante.toLowerCase().includes(value.toLowerCase())
            );
        }
    }

    // Métodos para manejar la selección de opciones
    onOptionSelectedAgq1(event: MatAutocompleteSelectedEvent) {
        this.updateIdAgq1(event);
        setTimeout(() => {
            this.agq1Input.nativeElement.value = event.option.viewValue;
        }, 0);
    }

    onOptionSelectedAgq2(event: MatAutocompleteSelectedEvent) {
        this.updateIdAgq2(event);
        setTimeout(() => {
            this.agq2Input.nativeElement.value = event.option.viewValue;
        }, 0);
    }

    onOptionSelectedAgq3(event: MatAutocompleteSelectedEvent) {
        this.updateIdAgq3(event);
        setTimeout(() => {
            this.agq3Input.nativeElement.value = event.option.viewValue;
        }, 0);
    }

    onOptionSelectedAgq4(event: MatAutocompleteSelectedEvent) {
        this.updateIdAgq4(event);
        setTimeout(() => {
            this.agq4Input.nativeElement.value = event.option.viewValue;
        }, 0);
    }

    onOptionSelectedCoad1(event: MatAutocompleteSelectedEvent) {
        this.updateIdCoad1(event);
        setTimeout(() => {
            this.coad1Input.nativeElement.value = event.option.viewValue;
        }, 0);
    }

    onOptionSelectedCoad2(event: MatAutocompleteSelectedEvent) {
        this.updateIdCoad2(event);
        setTimeout(() => {
            this.coad2Input.nativeElement.value = event.option.viewValue;
        }, 0);
    }




}
