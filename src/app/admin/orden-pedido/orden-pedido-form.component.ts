import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AdminService } from '../services/admin.service';
import { OrdenPedido, UsuarioSelect, ListadoItem } from './orden-pedido.interface';

@Component({
    selector: 'app-orden-pedido-form',
    templateUrl: './orden-pedido-form.component.html',
    styleUrls: ['./orden-pedido-form.component.css'],
})
export class OrdenPedidoFormComponent implements OnInit, OnDestroy {
    private unsubscribe$ = new Subject<void>();
    form: FormGroup;
    isEdit = false;

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
        public dialogRef: MatDialogRef<OrdenPedidoFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: OrdenPedido | null
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
        });
    }

    get agroquimicosArray(): FormArray { return this.form.get('agroquimicos') as FormArray; }
    get coadyuvantesArray(): FormArray { return this.form.get('coadyuvantes') as FormArray; }

    ngOnInit(): void {
        this.isEdit = !!this.data;
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
            this.filteredPilotos = p;
        });
        this._adminService.getPropietarios().pipe(takeUntil(this.unsubscribe$)).subscribe(p => {
            this.propietarios = p;
            this.filteredPropietarios = p;
            if (this.isEdit) this.populateForm();
        });
        this._adminService.getAgroquimicos().pipe(takeUntil(this.unsubscribe$)).subscribe(a => {
            this.agroquimicos = a;
            this.filteredAgroquimicos = a;
        });
        this._adminService.getCoadyuvantes().pipe(takeUntil(this.unsubscribe$)).subscribe(c => {
            this.coadyuvantes = c;
            this.filteredCoadyuvantes = c;
        });
    }

    setupCalculations(): void {
        this.form.get('opSuperficie')?.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => this.calcularTarifa());
        this.form.get('opCultivo')?.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => this.calcularTarifa());
        this.form.get('opPrecioHa')?.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => this.calcularTotal());
        this.form.get('opSuperficie')?.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => this.calcularTotal());
    }

    calcularTarifa(): void {
        const cultivo = this.form.get('opCultivo')?.value;
        const superficie = this.form.get('opSuperficie')?.value;
        if (cultivo && superficie && superficie > 0) {
            this._adminService.calcularTarifa(cultivo, superficie).pipe(takeUntil(this.unsubscribe$)).subscribe(res => {
                if (res.ok) {
                    this.form.patchValue({ opPrecioHa: res.precioHa }, { emitEvent: false });
                    this.calcularTotal();
                }
            });
        }
    }

    calcularTotal(): void {
        const sup = this.form.get('opSuperficie')?.value || 0;
        const precioHa = this.form.get('opPrecioHa')?.value || 0;
        this.form.get('opPrecioTotal')?.setValue(+(sup * precioHa * 1.105).toFixed(2), { emitEvent: false });
    }

    populateForm(): void {
        this.form.patchValue({
            opFecha: this._parseDate(this.data!.opFecha),
            fk_Piloto: this.data!.fk_Piloto,
            fk_Propietario: this.data!.fk_Propietario,
            opCultivo: this.data!.opCultivo,
            opSuperficie: this.data!.opSuperficie,
            opFormaPago: this.data!.opFormaPago,
            opPrecioHa: this.data!.opPrecioHa,
            opPrecioTotal: this.data!.opPrecioTotal,
        });
        const prop = this.propietarios.find(p => p.usuarioId === this.data!.fk_Propietario);
        if (prop) {
            this.form.patchValue({ propietarioSearch: prop.aliasUsuario });
        }
        for (let i = 1; i <= 4; i++) {
            const nom = (this.data as any)[`opAgroq${i}`];
            const dosis = (this.data as any)[`opDosisAgroq${i}`];
            if (nom) this.addAgroquimico(nom, dosis);
        }
        for (let i = 1; i <= 2; i++) {
            const nom = (this.data as any)[`opCoad${i}`];
            const dosis = (this.data as any)[`opDosisCoad${i}`];
            if (nom) this.addCoadyuvante(nom, dosis);
        }
    }

    filterPilotos(val: string): void {
        const filter = val.toLowerCase();
        this.filteredPilotos = this.pilotos.filter(p =>
            (p.aliasUsuario || '').toLowerCase().includes(filter) ||
            (p.nombreUsuario || '').toLowerCase().includes(filter)
        );
    }

    filterPropietarios(val: string): void {
        const filter = val.toLowerCase();
        this.filteredPropietarios = this.propietarios.filter(p =>
            (p.aliasUsuario || '').toLowerCase().includes(filter) ||
            (p.nombreUsuario || '').toLowerCase().includes(filter)
        );
    }

    onPropietarioSelected(p: UsuarioSelect): void {
        this.form.patchValue({ fk_Propietario: p.usuarioId, propietarioSearch: p.aliasUsuario });
    }

    addAgroquimico(nombre?: string, dosis?: number): void {
        if (this.agroquimicosArray.length >= 4) return;
        this.agroquimicosArray.push(this.fb.group({
            nombre: [nombre || '', Validators.required],
            dosis: [dosis || 0],
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

    addCoadyuvante(nombre?: string, dosis?: number): void {
        if (this.coadyuvantesArray.length >= 4) return;
        this.coadyuvantesArray.push(this.fb.group({
            nombre: [nombre || '', Validators.required],
            dosis: [dosis || 0],
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

    validateCoadyuvante(index: number): void {
        const val = this.coadyuvantesArray.at(index).get('nombre')?.value;
        if (val && !this.coadyuvantes.some(c => (c.ListadoCoadNom || '').toLowerCase() === val.toLowerCase())) {
            this.coadError = 'Este coadyuvante no existe en la lista';
        } else {
            this.coadError = null;
        }
    }

    onCoadyuvanteSelected(coad: ListadoItem, index: number): void {
        this.coadyuvantesArray.at(index).patchValue({ nombre: coad.ListadoCoadNom });
    }

    onSubmit(): void {
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
            next: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Orden de Pedido realizada correctamente',
                    showConfirmButton: false,
                    timer: 2000,
                });
                this.dialogRef.close(true);
            },
            error: () => Swal.fire('Error', 'No se pudo guardar la orden', 'error'),
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
