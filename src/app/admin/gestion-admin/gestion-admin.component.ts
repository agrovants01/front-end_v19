import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AdminService } from '../services/admin.service';
import { errorAlert, successAlert } from '../../shared/services/alerts';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SelectionModel } from '@angular/cdk/collections';
import { formatDate } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';

export interface gestionList {
    vueloId: number;
    cuadroVuelo: string;
    fechaVuelo: string | Date;
    propietario: string;
    superficieVuelo: number;
    formaPago: string;
    pilotoNombreCompleto: string;
    tecnicoVuelo: string;
    precioHa: number;
    subTotal: number;
    numRemito: string;
    aclaracion: string;
    administrativo: number;
    // CAMPOS CALCULADOS
    pagoContratista?: number;
    pagoPiloto?: number;      // NUEVO CAMPO
    pagoTecnico?: number;     // NUEVO CAMPO
}

@Component({
    standalone: false,
    selector: 'app-gestion-admin',
    templateUrl: './gestion-admin.component.html',
    styleUrls: ['./gestion-admin.component.css'],
})
export class GestionAdminComponent implements AfterViewInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    displayedColumns: string[] = [
        'select',
        'fechaVuelo',
        'propietario',
        'cuadroVuelo',
        'formaPago',
        'superficieVuelo',
        'pilotoNombreCompleto',
        'pagoPiloto',         // NUEVA COLUMNA después de Piloto
        'tecnicoVuelo',
        'pagoTecnico',        // NUEVA COLUMNA después de Técnico
        'precioHa',
        'pagoContratista',
        'subTotal',
        'numRemito',
        'aclaracion',
        'administrativo'
    ];

    data = new MatTableDataSource<gestionList>();
    selection = new SelectionModel<gestionList>(true, []);

    alias = localStorage.getItem('aliasUsuarioLogueado');

    searchGestion = new FormControl('');
    isLoadingResults = true;
    dataError = false;

    resultsLength = 0;
    pageSizeOptions: number[] = pageSizeOptions;

    totalSuperficie = 0;
    totalSubTotal = 0;
    totalAdministrativo = 0;
    totalPagoContratista = 0;
    totalPagoPiloto = 0;      // NUEVA VARIABLE
    totalPagoTecnico = 0;     // NUEVA VARIABLE

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    range = new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
    });

    constructor(
        private _adminService: AdminService,
        public authService: AuthService
    ) { }

    ngAfterViewInit(): void {

        this.sort.disableClear = true;

        this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

        merge(
            this.sort.sortChange,
            this.paginator.page,
            this.searchGestion.valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged()
            ),
            this.range.valueChanges
        )
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap(() => {
                    this.isLoadingResults = true;
                    return this.fetchData();
                }),
                map(data => {
                    this.isLoadingResults = false;

                    if (!data) {
                        return [];
                    }

                    this.resultsLength = data.count;
                    this.dataError = false;
                    this.calcularTotales(data.rows);
                    return data.rows;
                }),
                catchError(() => {
                    this.isLoadingResults = false;
                    this.dataError = true;
                    return of([]);
                })
            )
            .subscribe(rows => {
                this.data.data = rows;
            });
    }

    private fetchData() {
        const dateSince = this.range.get('start')?.value;
        const dateUntil = this.range.get('end')?.value;

        const range = (dateSince && dateUntil)
            ? {
                fechaDesde: this.formatDateForAPI(dateSince),
                fechaHasta: this.formatDateForAPI(dateUntil),
            }
            : undefined;

        const sortDirection =
            this.sort.direction === 'asc' || this.sort.direction === 'desc'
                ? this.sort.direction
                : 'asc';

        // Devuelve un observable con la data formateada para la tabla, incluyendo el total de registros para paginación
        return this._adminService.getGestionList(
            this.sort.active || 'fechaVuelo',
            sortDirection,
            this.paginator.pageIndex,
            this.searchGestion.value || '',
            this.paginator.pageSize,
            range
        );
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    private calcularTotales(data: gestionList[]): void {
        this.totalSuperficie = 0;
        this.totalSubTotal = 0;
        this.totalAdministrativo = 0;
        this.totalPagoContratista = 0;
        this.totalPagoPiloto = 0;      // NUEVO
        this.totalPagoTecnico = 0;     // NUEVO

        data.forEach(item => {
            this.totalSuperficie += item.superficieVuelo || 0;
            this.totalSubTotal += item.subTotal || 0;
            this.totalAdministrativo += item.administrativo || 0;
            this.totalPagoContratista += item.pagoContratista || 0;
            this.totalPagoPiloto += item.pagoPiloto || 0;        // NUEVO
            this.totalPagoTecnico += item.pagoTecnico || 0;      // NUEVO
        });

        this.totalSuperficie = +this.totalSuperficie.toFixed(2);
        this.totalSubTotal = +this.totalSubTotal.toFixed(2);
        this.totalAdministrativo = +this.totalAdministrativo.toFixed(2);
        this.totalPagoContratista = +this.totalPagoContratista.toFixed(2);
        this.totalPagoPiloto = +this.totalPagoPiloto.toFixed(2);        // NUEVO
        this.totalPagoTecnico = +this.totalPagoTecnico.toFixed(2);      // NUEVO
    }

    masterToggle(): void {
        this.isAllSelected()
            ? this.selection.clear()
            : this.data.data.forEach(row => this.selection.select(row));
    }

    isAllSelected(): boolean {
        return this.selection.selected.length === this.data.data.length;
    }

    isIndeterminate(): boolean {
        return this.selection.hasValue() && !this.isAllSelected();
    }

    limpiarFiltros(): void {
        this.searchGestion.setValue('');
        this.range.reset();
        this.paginator.pageIndex = 0;
    }

    /* ======================= CORRECCIÓN DE FECHAS ======================= */

    /** 🔹 Formatear fecha para API (sin problemas de zona horaria) */
    private formatDateForAPI(date: Date): string {
        if (!date) return '';
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
    }

    /** 🔹 Formatear fecha para exportación (CORREGIDO - usando UTC) */
    formatDateForExport(fecha: any): string {
        if (!fecha) return '';

        try {
            // Si es un objeto Date, convertirlo a string primero
            const fechaStr = fecha instanceof Date ? fecha.toISOString().split('T')[0] : fecha;

            // Si la fecha ya tiene un formato con hora, convertirla correctamente
            // Si solo tiene fecha, agregar 'T00:00:00' para evitar problemas de zona horaria
            const dateStr = fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`;
            const date = new Date(dateStr);

            // Verificar si la fecha es válida
            if (isNaN(date.getTime())) {
                return '';
            }

            // Usar UTC para evitar problemas de zona horaria
            const day = date.getUTCDate().toString().padStart(2, '0');
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const year = date.getUTCFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            return '';
        }
    }

    /** 🔹 Formatear fecha para exportación en formato corto (sin año) - Opcional */
    formatDateShortForExport(fecha: any): string {
        if (!fecha) return '';

        try {
            const fechaStr = fecha instanceof Date ? fecha.toISOString().split('T')[0] : fecha;
            const dateStr = fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`;
            const date = new Date(dateStr);

            if (isNaN(date.getTime())) {
                return '';
            }

            const day = date.getUTCDate().toString().padStart(2, '0');
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');

            return `${day}/${month}`;
        } catch (error) {
            return '';
        }
    }

    /* ======================= EXPORTACIONES ======================= */

    exportarResultadosExcel(): void {
        const data = this.data.data;
        data?.length
            ? this.prepareAndExportToExcel(data)
            : errorAlert('No hay datos para exportar');
    }

    private prepareAndExportToExcel(data: gestionList[]): void {
        const dataToExport = data.map(item => [
            this.formatDateForExport(item.fechaVuelo),
            item.propietario || '',
            item.cuadroVuelo || '',
            item.formaPago || '',
            item.superficieVuelo || 0,
            item.pilotoNombreCompleto || '',
            item.pagoPiloto || 0,              // NUEVO CAMPO
            item.tecnicoVuelo || '',
            item.pagoTecnico || 0,              // NUEVO CAMPO
            item.precioHa || 0,
            item.pagoContratista || 0,
            item.subTotal || 0,
            item.numRemito || '',
            item.aclaracion || '',
            item.administrativo || 0
        ]);

        dataToExport.push([
            'TOTALES', '', '', '',
            this.totalSuperficie,
            '',
            this.formatCurrencyNumber(this.totalPagoPiloto),     // NUEVO TOTAL
            '',
            this.formatCurrencyNumber(this.totalPagoTecnico),    // NUEVO TOTAL
            '',
            this.formatCurrencyNumber(this.totalPagoContratista),
            this.formatCurrencyNumber(this.totalSubTotal),
            '',
            '',
            this.formatCurrencyNumber(this.totalAdministrativo)
        ]);

        this.exportToExcel(dataToExport);
    }

    private exportToExcel(dataArray: any[]): void {
        const headers = [
            'Fecha', 'Propietario', 'Cuadro', 'Forma de Pago', 'Superficie',
            'Piloto', 'Pago Piloto',           // NUEVO HEADER
            'Técnico', 'Pago Técnico',          // NUEVO HEADER
            'Precio/Ha', 'Pago Contratista',
            'Subtotal', 'Nº Remito', 'Aclaración', 'Administrativo'
        ];

        dataArray.unshift(headers);

        const worksheet = XLSX.utils.aoa_to_sheet(dataArray);

        // Ajustar ancho de columnas
        const colWidths = [
            { wch: 12 },  // Fecha
            { wch: 25 },  // Propietario
            { wch: 15 },  // Cuadro
            { wch: 18 },  // Forma de Pago
            { wch: 12 },  // Superficie
            { wch: 20 },  // Piloto
            { wch: 18 },  // Pago Piloto (nuevo)
            { wch: 20 },  // Técnico
            { wch: 18 },  // Pago Técnico (nuevo)
            { wch: 12 },  // Precio/Ha
            { wch: 18 },  // Pago Contratista
            { wch: 15 },  // Subtotal
            { wch: 15 },  // Nº Remito
            { wch: 25 },  // Aclaración
            { wch: 15 }   // Administrativo
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Gestion');

        // Generar nombre de archivo con fecha actual
        const fechaActual = new Date();
        const dia = fechaActual.getDate().toString().padStart(2, '0');
        const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaActual.getFullYear();

        XLSX.writeFile(workbook, `Gestión_${dia}-${mes}-${año}.xlsx`);
    }

    exportarResultadosPdf(): void {
        this.exportToPdf(this.data.data);
    }

    exportToPdf(data: gestionList[]): void {
        const doc = new jsPDF('l', 'mm', [297, 210]);

        // Título
        doc.setFontSize(16);
        doc.text('Reporte de Gestión', 10, 10);

        // Fecha de generación
        const fechaGeneracion = new Date();
        const diaGen = fechaGeneracion.getDate().toString().padStart(2, '0');
        const mesGen = (fechaGeneracion.getMonth() + 1).toString().padStart(2, '0');
        const añoGen = fechaGeneracion.getFullYear();
        doc.setFontSize(10);
        doc.text(`Generado: ${diaGen}/${mesGen}/${añoGen}`, 10, 18);

        // Preparar datos para la tabla
        const bodyData = data.map(d => [
            this.formatDateForExport(d.fechaVuelo),
            d.propietario || '',
            d.cuadroVuelo || '',
            d.formaPago || '',
            this.formatNumber(d.superficieVuelo || 0),
            d.pilotoNombreCompleto || '',
            this.formatCurrencyNumber(d.pagoPiloto || 0),        // NUEVO CAMPO
            d.tecnicoVuelo || '',
            this.formatCurrencyNumber(d.pagoTecnico || 0),      // NUEVO CAMPO
            this.formatCurrencyNumber(d.precioHa || 0),
            this.formatCurrencyNumber(d.pagoContratista || 0),
            this.formatCurrencyNumber(d.subTotal || 0),
            d.numRemito || '',
            this.formatCurrencyNumber(d.administrativo || 0)
        ]);

        // Agregar fila de totales
        bodyData.push([
            'TOTALES', '', '', '',
            this.formatNumber(this.totalSuperficie),
            '',
            this.formatCurrencyNumber(this.totalPagoPiloto),    // NUEVO TOTAL
            '',
            this.formatCurrencyNumber(this.totalPagoTecnico),   // NUEVO TOTAL
            '',
            this.formatCurrencyNumber(this.totalPagoContratista),
            this.formatCurrencyNumber(this.totalSubTotal),
            '',
            this.formatCurrencyNumber(this.totalAdministrativo)
        ]);

        autoTable(doc, {
            head: [[
                'Fecha', 'Propietario', 'Cuadro', 'F.Pago', 'Sup.(Ha)',
                'Piloto', 'Pago Piloto',        // NUEVO HEADER
                'Técnico', 'Pago Técnico',      // NUEVO HEADER
                'Precio/Ha', 'Pago Contratista',
                'Subtotal', 'Remito', 'Administrativo'
            ]],
            body: bodyData,
            startY: 25,
            theme: 'striped',
            headStyles: {
                fillColor: [51, 102, 153],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 20 },   // Fecha
                1: { cellWidth: 30 },   // Propietario
                2: { cellWidth: 20 },   // Cuadro
                3: { cellWidth: 18 },   // F.Pago
                4: { cellWidth: 18, halign: 'right' }, // Sup.
                5: { cellWidth: 25 },   // Piloto
                6: { cellWidth: 25, halign: 'right' }, // Pago Piloto (nuevo)
                7: { cellWidth: 25 },   // Técnico
                8: { cellWidth: 25, halign: 'right' }, // Pago Técnico (nuevo)
                9: { cellWidth: 20, halign: 'right' }, // Precio/Ha
                10: { cellWidth: 25, halign: 'right' }, // Pago Contratista
                11: { cellWidth: 22, halign: 'right' }, // Subtotal
                12: { cellWidth: 18 },  // Remito
                13: { cellWidth: 25, halign: 'right' }  // Admin.
            },
            didDrawPage: function (data) {
                // Número de página
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(10);
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });

        // Guardar archivo
        doc.save(`Gestión_${diaGen}-${mesGen}-${añoGen}.pdf`);
    }

    /** 🔹 Formatear número con separadores de miles */
    formatNumber(value: number): string {
        return value?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00';
    }

    /** 🔹 Formatear moneda */
    formatCurrency(value: number): string {
        return `$ ${this.formatNumber(value)}`;
    }

    /** 🔹 Formatear número para PDF (sin símbolo de moneda) */
    private formatCurrencyNumber(value: number): string {
        return this.formatNumber(value);
    }
}
