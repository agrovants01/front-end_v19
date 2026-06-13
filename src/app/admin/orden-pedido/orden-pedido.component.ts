import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AdminService } from '../services/admin.service';
import { errorAlert, successAlert, confirmAlertDelete } from '../../shared/services/alerts';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';
import { MatTableDataSource } from '@angular/material/table';
import { OrdenPedido } from './orden-pedido.interface';
import { OrdenPedidoFormComponent } from './orden-pedido-form.component';

@Component({
    selector: 'app-orden-pedido',
    templateUrl: './orden-pedido.component.html',
    styleUrls: ['./orden-pedido.component.css'],
})
export class OrdenPedidoComponent implements AfterViewInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    displayedColumns: string[] = [
        'opFecha', 'pilotoAlias', 'propietarioAlias', 'opCultivo',
        'opSuperficie', 'opPrecioHa', 'opPrecioTotal', 'opFormaPago', 'opEstado', 'actions'
    ];

    data = new MatTableDataSource<OrdenPedido>();
    searchOrden = new FormControl('');
    isLoadingResults = true;
    dataError = false;
    resultsLength = 0;
    pageSizeOptions: number[] = pageSizeOptions;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private _adminService: AdminService,
        public dialog: MatDialog
    ) { }

    ngAfterViewInit(): void {
        this.sort.disableClear = true;
        this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

        merge(
            this.sort.sortChange,
            this.paginator.page,
            this.searchOrden.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
        )
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap(() => {
                    this.isLoadingResults = true;
                    return this._adminService.getOrdenesList(
                        this.sort.active || 'opFecha',
                        this.sort.direction || 'desc',
                        this.paginator.pageIndex,
                        this.searchOrden.value || '',
                        this.paginator.pageSize
                    ).pipe(catchError(() => { this.dataError = true; return of(null); }));
                }),
                map(data => {
                    this.isLoadingResults = false;
                    if (!data) return [];
                    this.resultsLength = data.total_count;
                    this.dataError = false;
                    return data.items;
                })
            )
            .subscribe(rows => { this.data.data = rows; });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    openFormDialog(orden?: OrdenPedido): void {
        const dialogRef = this.dialog.open(OrdenPedidoFormComponent, {
            width: '90vw',
            maxWidth: '900px',
            maxHeight: '90vh',
            data: orden || null
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.paginator.pageIndex = 0;
                this.sort.sortChange.emit();
            }
        });
    }

    deleteOrden(orden: OrdenPedido): void {
        confirmAlertDelete('¿Eliminar esta orden de pedido?').then(result => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading() });
                this._adminService.deleteOrden(orden).subscribe({
                    next: () => {
                        successAlert('Orden eliminada');
                        this.paginator.pageIndex = 0;
                        this.sort.sortChange.emit();
                    },
                    error: () => errorAlert('Error al eliminar la orden')
                });
            }
        });
    }
}
