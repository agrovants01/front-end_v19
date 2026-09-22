import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AdminService } from '../services/admin.service';
import { ImprimirOrdenPedidoService } from '../services/imprimir-orden-pedido.service';
import { MapService } from '../../shared/services/map.service';
import { OrdenPedido, UsuarioSelect, ListadoItem } from './orden-pedido.interface';

@Component({
    standalone: false,
    selector: 'app-orden-pedido-form',
    templateUrl: './orden-pedido-form.component.html',
    styleUrls: ['./orden-pedido-form.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class OrdenPedidoFormComponent implements OnInit, OnDestroy {
    private unsubscribe$ = new Subject<void>();
    form: FormGroup;
    isEdit = false;
    isReadonly = false;
    precioManual = false;

    get formTitle(): string {
        if (this.isReadonly) {
            return this.data?.opNomenclatura ? `Orden de Pedido Nº ${this.data.opNomenclatura}` : 'Orden de Pedido';
        }
        if (this.isEdit && this.data?.opNomenclatura) {
            return `Editar Orden de Pedido Nº ${this.data.opNomenclatura}`;
        }
        return this.isEdit ? 'Editar Orden de Pedido' : 'Nueva Orden de Pedido';
    }

    pilotos: UsuarioSelect[] = [];
    propietarios: UsuarioSelect[] = [];
    filteredPilotos: UsuarioSelect[] = [];
    filteredPropietarios: UsuarioSelect[] = [];

    agroquimicos: ListadoItem[] = [];
    coadyuvantes: ListadoItem[] = [];
    filteredAgroquimicos: ListadoItem[] = [];
    filteredCoadyuvantes: ListadoItem[] = [];

    cultivoOptions = ['Chacra', 'Viñedo', 'Olivo', 'Nogal'];
    formaPagoOptions = ['PAGO PENDIENTE', 'CONTADO', 'CHEQUE', 'TRANSFERENCIA', 'MERCADO PAGO', 'PAGADO'];

    agroqError: string | null = null;
    coadError: string | null = null;

    constructor(
        private fb: FormBuilder,
        private _adminService: AdminService,
        private _imprimirOpService: ImprimirOrdenPedidoService,
        private _mapService: MapService,
        public dialogRef: MatDialogRef<OrdenPedidoFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.form = this.fb.group({
            opFecha: [this._getLocalDateObj(), Validators.required],
            fk_Piloto: ['', Validators.required],
            fk_Propietario: ['', Validators.required],
            propietarioSearch: [''],
            opCultivo: ['', Validators.required],
            opSuperficie: [null, [Validators.required, Validators.min(0.01)]],
            agroquimicos: this.fb.array([]),
            coadyuvantes: this.fb.array([]),
            opFormaPago: ['PAGO PENDIENTE'],
            opPrecioHa: [{ value: null, disabled: true }],
            opPrecioTotal: [{ value: 0, disabled: true }],
            opAclaracion: [''],
            opUbicacion: [{ value: '', disabled: true }],
        });
    }

    get agroquimicosArray(): FormArray { return this.form.get('agroquimicos') as FormArray; }
    get coadyuvantesArray(): FormArray { return this.form.get('coadyuvantes') as FormArray; }

    fromMap = false;

    get puedeImprimir(): boolean {
        return this.isReadonly && !!this.data?.puedeImprimir;
    }

    get modoMapa(): boolean {
        return !!this.data?.puedeImprimir;
    }

    editando = false;

    ngOnInit(): void {
        this.isEdit = !!this.data?.opId;
        this.isReadonly = !!this.data?.soloLectura;
        this.fromMap = !!this.data?.desdeMapa && !this.isEdit && !this.isReadonly;
        if (this.data?.coordenadas) {
            this.form.patchValue({ opUbicacion: this.data.coordenadas });
        }
        if (this.fromMap) {
            this.form.get('propietarioSearch')?.disable();
            this.form.get('fk_Propietario')?.disable();

            if (!this.data?.coordenadas) {
                this.form.get('fk_Piloto')?.disable();
                this.form.get('opCultivo')?.disable();
                this.form.get('opSuperficie')?.disable();
                this.form.get('opFormaPago')?.disable();
                this.form.get('opAclaracion')?.disable();
            }
        }
        if (this.isReadonly) {
            this.form.disable();
        }
        this.loadData();
        this.setupCalculations();
    }

    private _getLocalDateObj(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    private _formatDate(date: Date | string): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private _parseDate(dateStr: string | Date): Date {
        if (dateStr instanceof Date) return dateStr;
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    loadData(): void {
        this._adminService.getPilotos().pipe(takeUntil(this.unsubscribe$)).subscribe(p => {
            this.pilotos = p;
            this.filteredPilotos = [...p];
            if (this.data?.fk_Piloto) {
                this.form.get('fk_Piloto')?.setValue(this.data.fk_Piloto);
            }
        });

        this._adminService.getPropietarios().pipe(takeUntil(this.unsubscribe$)).subscribe((p: any[]) => {
            this.propietarios = p;
            this.filteredPropietarios = [...p];
            if (this.data?.fk_Propietario) {
                const prop = this.propietarios.find(x => x.usuarioId === this.data.fk_Propietario);
                if (prop) {
                    this.form.get('fk_Propietario')?.setValue(prop.usuarioId);
                    this.form.get('propietarioSearch')?.setValue(`${prop.nombreUsuario} ${prop.apellidoUsuario}`);
                }
            }
        });

        this._adminService.getAgroquimicos().pipe(takeUntil(this.unsubscribe$)).subscribe(a => {
            this.agroquimicos = a;
            this.filteredAgroquimicos = [...a];
        });

        this._adminService.getCoadyuvantes().pipe(takeUntil(this.unsubscribe$)).subscribe(c => {
            this.coadyuvantes = c;
            this.filteredCoadyuvantes = [...c];
        });

        if (this.data?.opId) {
            this.loadOrdenData();
        }
    }

    private loadOrdenData(): void {
        if (!this.data) return;

        this.form.patchValue({
            opFecha: this._parseDate(this.data.opFecha),
            opCultivo: this.data.opCultivo || '',
            opSuperficie: this.data.opSuperficie || null,
            opFormaPago: this.data.opFormaPago || 'PAGO PENDIENTE',
            opPrecioHa: this.data.opPrecioHa || null,
            opPrecioTotal: this.data.opPrecioTotal || 0,
            opAclaracion: this.data.opAclaracion || '',
            opUbicacion: this.data.opUbicacion || '',
        });

        if (this.data.opUbicacion) {
            this.form.get('opUbicacion')?.enable();
        }

        this.agroquimicosArray.clear();
        this.coadyuvantesArray.clear();

        for (let i = 1; i <= 4; i++) {
            const nombre = this.data[`opAgroq${i}`];
            const dosis = this.data[`opDosisAgroq${i}`];
            if (nombre) {
                this.agroquimicosArray.push(this.fb.group({
                    nombre: [nombre],
                    dosis: [dosis || 0],
                }));
            }
        }

        for (let i = 1; i <= 2; i++) {
            const nombre = this.data[`opCoad${i}`];
            const dosis = this.data[`opDosisCoad${i}`];
            if (nombre) {
                this.coadyuvantesArray.push(this.fb.group({
                    nombre: [nombre],
                    dosis: [dosis || 0],
                }));
            }
        }
    }

    setupCalculations(): void {
        this.form.get('opSuperficie')?.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => this.calcularPrecio());
        this.form.get('opPrecioHa')?.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => this.calcularTotal());
    }

    calcularPrecio(): void {
        if (this.precioManual) return;
        const sup = this.form.get('opSuperficie')?.value;
        const total = this.form.get('opPrecioTotal')?.value;
        if (sup > 0 && total > 0) {
            this.form.get('opPrecioHa')?.setValue(+(total / sup).toFixed(2), { emitEvent: false });
        }
    }

    calcularTotal(): void {
        const sup = this.form.get('opSuperficie')?.value;
        const precio = this.form.get('opPrecioHa')?.value;
        if (sup > 0 && precio > 0) {
            this.form.get('opPrecioTotal')?.setValue(+(sup * precio).toFixed(2), { emitEvent: false });
        }
    }

    addAgroquimico(): void {
        if (this.agroquimicosArray.length >= 4) return;
        this.agroquimicosArray.push(this.fb.group({
            nombre: ['', Validators.required],
            dosis: [0],
        }));
    }

    removeAgroquimico(index: number): void {
        this.agroquimicosArray.removeAt(index);
    }

    filterAgroquimicos(val: string, index: number): void {
        const filter = val.toLowerCase();
        this.filteredAgroquimicos = filter
            ? this.agroquimicos.filter(a => (a.listadoAgroqNom || '').toLowerCase().includes(filter))
            : [];
        this.validateAgroquimico(index);
    }

    onAgroquimicoSelected(agq: ListadoItem, index: number): void {
        this.agroquimicosArray.at(index).patchValue({ nombre: agq.listadoAgroqNom });
        this.agroqError = null;
    }

    validateAgroquimico(index: number): void {
        const val = this.agroquimicosArray.at(index).get('nombre')?.value;
        if (val && !this.agroquimicos.some(a => (a.listadoAgroqNom || '').toLowerCase() === val.toLowerCase())) {
            this.agroqError = 'Este agroquímico no existe en la lista';
        } else {
            this.agroqError = null;
        }
    }

    addCoadyuvante(): void {
        if (this.coadyuvantesArray.length >= 2) return;
        this.coadyuvantesArray.push(this.fb.group({
            nombre: ['', Validators.required],
            dosis: [0],
        }));
    }

    removeCoadyuvante(index: number): void {
        this.coadyuvantesArray.removeAt(index);
    }

    filterCoadyuvantes(val: string, index: number): void {
        const filter = val.toLowerCase();
        this.filteredCoadyuvantes = filter
            ? this.coadyuvantes.filter(c => (c.ListadoCoadNom || '').toLowerCase().includes(filter))
            : [];
        this.validateCoadyuvante(index);
    }

    onCoadyuvanteSelected(coad: ListadoItem, index: number): void {
        this.coadyuvantesArray.at(index).patchValue({ nombre: coad.ListadoCoadNom });
        this.coadError = null;
    }

    validateCoadyuvante(index: number): void {
        const val = this.coadyuvantesArray.at(index).get('nombre')?.value;
        if (val && !this.coadyuvantes.some(c => (c.ListadoCoadNom || '').toLowerCase() === val.toLowerCase())) {
            this.coadError = 'Este coadyuvante no existe en la lista';
        } else {
            this.coadError = null;
        }
    }

    onGeoBlock(event: Event): void {
        if (this.fromMap && !this.isReadonly) return;

        event.preventDefault();
        event.stopPropagation();
        Swal.fire({
            title: 'Ubicación requerida',
            text: 'Geolocalizar primero la ubicación de la Orden de Pedido',
            icon: 'warning',
            confirmButtonText: 'Entendido',
        });
    }

    pickLocation(): void {
        if (this.form.get('opUbicacion')?.value) return;
        this.dialogRef.close({ pickLocation: true });
    }

    onSubmit(): void {
        if (this.fromMap && !this.form.get('opUbicacion')?.value) {
            Swal.fire({
                icon: 'error',
                title: 'Datos incompletos',
                text: 'Se solicita cargar ubicación y los demás datos obligatorios por favor.',
                confirmButtonText: 'Entendido',
            });
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        for (let i = 0; i < this.agroquimicosArray.length; i++) {
            const val = this.agroquimicosArray.at(i).get('nombre')?.value;
            if (val && !this.agroquimicos.some(a => (a.listadoAgroqNom || '').toLowerCase() === val.toLowerCase())) {
                this.agroqError = `El agroquímico "${val}" no existe en la lista`;
                return;
            }
        }

        for (let i = 0; i < this.coadyuvantesArray.length; i++) {
            const val = this.coadyuvantesArray.at(i).get('nombre')?.value;
            if (val && !this.coadyuvantes.some(c => (c.ListadoCoadNom || '').toLowerCase() === val.toLowerCase())) {
                this.coadError = `El coadyuvante "${val}" no existe en la lista`;
                return;
            }
        }

        const formVal = this.form.getRawValue();
        const orden: any = {
            opFecha: this._formatDate(formVal.opFecha),
            fk_Piloto: formVal.fk_Piloto,
            fk_Propietario: formVal.fk_Propietario,
            opCultivo: formVal.opCultivo,
            opSuperficie: formVal.opSuperficie,
            opFormaPago: formVal.opFormaPago,
            opPrecioHa: formVal.opPrecioHa,
            opPrecioTotal: formVal.opPrecioTotal,
            opAclaracion: formVal.opAclaracion || null,
            opUbicacion: formVal.opUbicacion || null,
        };

        this.agroquimicosArray.controls.forEach((ctrl, i) => {
            const v = ctrl.value;
            if (v.nombre) {
                orden[`opAgroq${i + 1}`] = v.nombre;
                orden[`opDosisAgroq${i + 1}`] = v.dosis || 0;
            }
        });

        this.coadyuvantesArray.controls.forEach((ctrl, i) => {
            const v = ctrl.value;
            if (v.nombre) {
                orden[`opCoad${i + 1}`] = v.nombre;
                orden[`opDosisCoad${i + 1}`] = v.dosis || 0;
            }
        });

        Swal.fire({ title: this.isEdit ? 'Actualizando...' : 'Creando...', didOpen: () => Swal.showLoading() });

        const req = this.isEdit
            ? this._adminService.updateOrden({ ...orden, opId: this.data!.opId })
            : this._adminService.saveOrden(orden);

        req.pipe(takeUntil(this.unsubscribe$)).subscribe({
            next: (res: any) => {
                let syncDone$ = of(null);
                if (this.isEdit && this.data?.opNomenclatura) {
                    orden.opNomenclatura = this.data.opNomenclatura;
                    const pilotoSel = this.pilotos.find(p => p.usuarioId === formVal.fk_Piloto);
                    if (pilotoSel) {
                        orden.pilotoNombreCompleto = `${pilotoSel.nombreUsuario} ${pilotoSel.apellidoUsuario}`.trim();
                    }
                    syncDone$ = this._adminService.syncFlightsWithOrden(orden);
                }

                syncDone$.subscribe({
                    next: () => {
                        if (this.modoMapa) {
                            this._mapService.reloadFlights();
                        }
                    },
                    error: (err) => console.error('Error al sincronizar vuelos con la OP:', err),
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Orden de Pedido realizada correctamente',
                    showConfirmButton: false,
                    timer: 2000,
                });
                if (this.modoMapa) {
                    const saved = res?.data || orden;
                    this.data = { ...this.data, ...saved, opNomenclatura: this.data.opNomenclatura };
                    this.form.get('opPrecioTotal')?.setValue(saved.opPrecioTotal, { emitEvent: false });
                    this.form.get('opPrecioHa')?.setValue(saved.opPrecioHa, { emitEvent: false });
                    this._volverAReadonly();
                } else {
                    this.dialogRef.close(true);
                }
            },
            error: () => Swal.fire('Error', 'No se pudo guardar la orden', 'error'),
        });
    }

    imprimirReporte(): void {
        const piloto = this.pilotos.find(p => p.usuarioId === this.data?.fk_Piloto);
        const propietario = this.propietarios.find(p => p.usuarioId === this.data?.fk_Propietario);

        const propietarioNombre = propietario
            ? (propietario.nombreUsuario + ' ' + propietario.apellidoUsuario).trim()
            : '';

        const payload: any = {
            ...this.data,
            pilotoAlias: piloto?.aliasUsuario || this.data?.pilotoAlias,
            propietarioAlias: propietario?.aliasUsuario || this.data?.propietarioAlias,
            propietarioNombre: propietarioNombre || this.data?.propietarioNombre,
        };

        this._imprimirOpService.imprimirOrdenPedido(payload)
            .catch(() => Swal.fire('Error', 'No se pudo generar el reporte', 'error'));
    }

    activarEdicion(): void {
        this.editando = true;
        this.isReadonly = false;
        this.form.enable();
        this.form.get('opUbicacion')?.disable();
        this.form.get('opPrecioTotal')?.disable();
        if (!this.precioManual) {
            this.form.get('opPrecioHa')?.disable();
        }
    }

    private _volverAReadonly(): void {
        this.editando = false;
        this.isReadonly = true;
        this.precioManual = false;
        this.form.disable();
    }

    onCancel(): void {
        if (this.editando) {
            this._volverAReadonly();
        } else {
            this.dialogRef.close();
        }
    }
}
