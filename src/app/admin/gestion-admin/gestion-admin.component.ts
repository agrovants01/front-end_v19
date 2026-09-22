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
import * as XLSX from 'xlsx-js-style';
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
    opNomenclatura?: string;
    esContratistaPiloto?: boolean;
    // CAMPOS CALCULADOS
    pagoContratista?: number;
    pagoPiloto?: number;
    pagoTecnico?: number;
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
        'opNomenclatura',
        'propietario',
        'cuadroVuelo',
        'formaPago',
        'superficieVuelo',
        'pilotoNombreCompleto',
        'pagoPiloto',
        'tecnicoVuelo',
        'pagoTecnico',
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
    filtroPiloto = new FormControl<any>('');
    filtroTecnico = new FormControl<any>('');
    filtroContratista = new FormControl<any>('');
    listadoPilotos: { usuarioId: string; nombreCompleto: string }[] = [];
    listadoTecnicos: string[] = [];
    listadoContratistas: { usuarioId: string; nombreCompleto: string }[] = [];
    valorServicioPiloto = new FormControl('');
    valorServicioTecnico = new FormControl('');
    valorServicioAdministrativo = new FormControl('');
    mostrarPlanillaAdministrativo = false;
    isLoadingResults = true;
    dataError = false;

    resultsLength = 0;
    pageSizeOptions: number[] = pageSizeOptions;

    totalSuperficie = 0;
    totalSubTotal = 0;
    totalAdministrativo = 0;
    totalPagoContratista = 0;
    totalPagoPiloto = 0;
    totalPagoTecnico = 0;

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

        this.setupFiltrosExclusivos();
        this.cargarFiltros();

        const valorGuardado = localStorage.getItem('valorServicioPiloto');
        if (valorGuardado !== null) {
            this.valorServicioPiloto.setValue(valorGuardado, { emitEvent: false });
        }
        this.valorServicioPiloto.valueChanges
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((v) => {
                localStorage.setItem('valorServicioPiloto', v ?? '');
            });

        const valorGuardadoTecnico = localStorage.getItem('valorServicioTecnico');
        if (valorGuardadoTecnico !== null) {
            this.valorServicioTecnico.setValue(valorGuardadoTecnico, { emitEvent: false });
        }
        this.valorServicioTecnico.valueChanges
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((v) => {
                localStorage.setItem('valorServicioTecnico', v ?? '');
            });

        const valorGuardadoAdmin = localStorage.getItem('valorServicioAdministrativo');
        if (valorGuardadoAdmin !== null) {
            this.valorServicioAdministrativo.setValue(valorGuardadoAdmin, { emitEvent: false });
        }
        this.valorServicioAdministrativo.valueChanges
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((v) => {
                localStorage.setItem('valorServicioAdministrativo', v ?? '');
            });

        merge(
            this.sort.sortChange,
            this.paginator.page,
            this.searchGestion.valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged()
            ),
            this.range.valueChanges,
            this.filtroPiloto.valueChanges,
            this.filtroTecnico.valueChanges,
            this.filtroContratista.valueChanges
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
                    this.totalSuperficie = +(data.totalSuperficie || 0);
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

        const filtros = {
            piloto: this.filtroPiloto.value?.usuarioId || undefined,
            tecnico: this.filtroTecnico.value || undefined,
            contratista: this.filtroContratista.value?.usuarioId || undefined,
        };

        return this._adminService.getGestionList(
            this.sort.active || 'fechaVuelo',
            sortDirection,
            this.paginator.pageIndex,
            this.searchGestion.value || '',
            this.paginator.pageSize,
            range,
            filtros
        );
    }

    private setupFiltrosExclusivos(): void {
        const limpiarOtros = (activo: 'piloto' | 'tecnico' | 'contratista') => {
            if (activo !== 'piloto') this.filtroPiloto.setValue('', { emitEvent: false });
            if (activo !== 'tecnico') this.filtroTecnico.setValue('', { emitEvent: false });
            if (activo !== 'contratista') this.filtroContratista.setValue('', { emitEvent: false });
        };

        this.filtroPiloto.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe((v) => {
            if (v) limpiarOtros('piloto');
            this.mostrarPlanillaAdministrativo = false;
            this.paginator.pageIndex = 0;
        });
        this.filtroTecnico.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe((v) => {
            if (v) limpiarOtros('tecnico');
            this.mostrarPlanillaAdministrativo = false;
            this.paginator.pageIndex = 0;
        });
        this.filtroContratista.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe((v) => {
            if (v) limpiarOtros('contratista');
            this.mostrarPlanillaAdministrativo = false;
            this.paginator.pageIndex = 0;
        });
    }

    private cargarFiltros(): void {
        this._adminService.getGestionFiltros()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: (res) => {
                    this.listadoPilotos = res.pilotos || [];
                    this.listadoTecnicos = res.tecnicos || [];
                    this.listadoContratistas = res.contratistas || [];
                },
                error: (err) => console.error('Error al cargar filtros de gestión:', err),
            });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    private calcularTotales(data: gestionList[]): void {
        this.totalSubTotal = 0;
        this.totalAdministrativo = 0;
        this.totalPagoContratista = 0;
        this.totalPagoPiloto = 0;
        this.totalPagoTecnico = 0;

        data.forEach(item => {
            this.totalSubTotal += item.subTotal || 0;
            this.totalAdministrativo += item.administrativo || 0;
            this.totalPagoContratista += item.pagoContratista || 0;
            this.totalPagoPiloto += item.pagoPiloto || 0;
            this.totalPagoTecnico += item.pagoTecnico || 0;
        });

        this.totalSubTotal = +this.totalSubTotal.toFixed(2);
        this.totalAdministrativo = +this.totalAdministrativo.toFixed(2);
        this.totalPagoContratista = +this.totalPagoContratista.toFixed(2);
        this.totalPagoPiloto = +this.totalPagoPiloto.toFixed(2);
        this.totalPagoTecnico = +this.totalPagoTecnico.toFixed(2);
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
        this.filtroPiloto.setValue('');
        this.filtroTecnico.setValue('');
        this.filtroContratista.setValue('');
        this.paginator.pageIndex = 0;
    }

    abrirPlanillaGeneral(): void {
        if (!this.mostrarPlanillaAdministrativo) {
            this.filtroPiloto.setValue('');
            this.filtroTecnico.setValue('');
            this.filtroContratista.setValue('');
        }
        this.mostrarPlanillaAdministrativo = !this.mostrarPlanillaAdministrativo;
    }

    get totalPagoPilotoCalculado(): number {
        const valor = Number(this.valorServicioPiloto.value);
        const v = isNaN(valor) ? 0 : valor;
        return v * (this.totalSuperficie || 0);
    }

    get totalPagoTecnicoCalculado(): number {
        const valor = Number(this.valorServicioTecnico.value);
        const v = isNaN(valor) ? 0 : valor;
        return v * (this.totalSuperficie || 0);
    }

    get totalPagoContratistaCalculado(): number {
        return (this.totalSubTotal || 0) * 0.568888;
    }

    get totalPagoAdministrativoCalculado(): number {
        const valor = Number(this.valorServicioAdministrativo.value);
        const v = isNaN(valor) ? 0 : valor;
        return ((this.totalSuperficie || 0) * v) / 3;
    }

    /* ======================= CORRECCIÓN DE FECHAS ======================= */

    private formatDateForAPI(date: Date): string {
        if (!date) return '';
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
    }

    formatDateForExport(fecha: any): string {
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
            const year = date.getUTCFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            return '';
        }
    }

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

    private getRangoDescripcion(): string {
        const start = this.range.get('start')?.value;
        const end = this.range.get('end')?.value;
        if (!start || !end) return '';
        return `Rango de fechas: ${this.formatDateForExport(start)} - ${this.formatDateForExport(end)}`;
    }

    private getFiltroDescripcion(): string {
        if (this.filtroPiloto.value) return `Filtro: Piloto - ${this.filtroPiloto.value.nombreCompleto}`;
        if (this.filtroTecnico.value) return `Filtro: Técnico - ${this.filtroTecnico.value}`;
        if (this.filtroContratista.value) return `Filtro: Contratista - ${this.filtroContratista.value.nombreCompleto}`;
        return '';
    }

    private getValorFiltro(): string {
        if (this.filtroPiloto.value) return `Piloto: ${this.filtroPiloto.value.nombreCompleto}`;
        if (this.filtroTecnico.value) return `Técnico: ${this.filtroTecnico.value}`;
        if (this.filtroContratista.value) return `Contratista: ${this.filtroContratista.value.nombreCompleto}`;
        if (this.mostrarPlanillaAdministrativo) return 'Planilla General';
        return '';
    }

    private getNombreArchivo(): string {
        const fecha = new Date();
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const año = fecha.getFullYear();
        if (this.mostrarPlanillaAdministrativo) return `Planilla_general_${dia}-${mes}-${año}`;
        let tipo = '';
        if (this.filtroPiloto.value) tipo = '_piloto';
        else if (this.filtroTecnico.value) tipo = '_tecnico';
        else if (this.filtroContratista.value) tipo = '_contratista';
        return `Gestión${tipo}_${dia}-${mes}-${año}`;
    }

    private validarAntesDeExportar(): boolean {
        const tieneFiltro = !!this.filtroPiloto.value || !!this.filtroTecnico.value || !!this.filtroContratista.value;
        const tienePlanilla = this.mostrarPlanillaAdministrativo;

        if (!tieneFiltro && !tienePlanilla) {
            errorAlert('Filtro o Planilla requerido', 'Debe seleccionar un filtro de Piloto, Técnico o Contratista, o abrir la Planilla General con un valor de servicio.');
            return false;
        }
        if (this.filtroPiloto.value && !this.valorServicioPiloto.value) {
            errorAlert('Valor de servicio requerido', 'Debe ingresar el Valor de Servicio de Piloto antes de exportar.');
            return false;
        }
        if (this.filtroTecnico.value && !this.valorServicioTecnico.value) {
            errorAlert('Valor de servicio requerido', 'Debe ingresar el Valor de Servicio de Técnico antes de exportar.');
            return false;
        }
        if (tienePlanilla && !this.valorServicioAdministrativo.value) {
            errorAlert('Valor de servicio requerido', 'Debe ingresar el Valor de Servicio de Administrativo antes de exportar la Planilla General.');
            return false;
        }
        return true;
    }

    exportarResultadosExcel(): void {
        if (!this.validarAntesDeExportar()) return;
        const data = this.data.data;
        data?.length
            ? this.prepareAndExportToExcel(data)
            : errorAlert('No hay datos para exportar');
    }

    private prepareAndExportToExcel(data: gestionList[]): void {
        const dataToExport: any[] = [];

        const infoRows: number[] = [];
        const filtro = this.getValorFiltro();
        if (filtro) {
            dataToExport.push([filtro]);
            infoRows.push(dataToExport.length - 1);
        }
        const rango = this.getRangoDescripcion();
        if (rango) {
            dataToExport.push([rango]);
            infoRows.push(dataToExport.length - 1);
        }
        dataToExport.push([]);

        const headers = [
            'Fecha', 'Orden de Pedido', 'Cliente', 'Cuadro', 'Forma de Pago',
            'Superficie (Ha)', 'Piloto', 'Técnico', 'Precio/Ha', 'Subtotal',
            'Nº Remito', 'Aclaración'
        ];
        dataToExport.push(headers);
        const headerRowIndex = dataToExport.length - 1;

        const filaDatos = (item: gestionList) => [
            this.formatDateForExport(item.fechaVuelo),
            item.opNomenclatura || '-',
            item.propietario || '',
            item.cuadroVuelo || '',
            item.formaPago || '',
            String(item.superficieVuelo || 0),
            item.pilotoNombreCompleto + (item.esContratistaPiloto ? ' (C)' : '') || '',
            item.tecnicoVuelo || '',
            String(item.precioHa || 0),
            String(item.subTotal || 0),
            item.numRemito || '',
            item.aclaracion || ''
        ];

        data.forEach(item => {
            dataToExport.push(filaDatos(item));
        });

        dataToExport.push([]);
        dataToExport.push(['TOTALES']);
        const totalesRowIndex = dataToExport.length - 1;

        dataToExport.push(['Total Superficie:', `${this.formatNumber(this.totalSuperficie)} Ha`]);
        dataToExport.push(['Total Servicio (Sup. x Precio/Ha):', this.formatCurrency(this.totalSubTotal)]);

        let totalesFilas = 2;

        if (this.mostrarPlanillaAdministrativo) {
            dataToExport.push(['Valor de Servicio de Administrativo:', this.formatCurrency(Number(this.valorServicioAdministrativo.value) || 0)]);
            dataToExport.push(['Total Pago a Administrativo:', this.formatCurrency(this.totalPagoAdministrativoCalculado)]);
            totalesFilas += 2;
        } else {
            if (this.filtroContratista.value) {
                dataToExport.push(['Total Pago a Contratista:', this.formatCurrency(this.totalPagoContratistaCalculado)]);
                totalesFilas += 1;
            }
            if (this.filtroPiloto.value) {
                dataToExport.push(['Valor de Servicio de Piloto:', this.formatCurrency(Number(this.valorServicioPiloto.value) || 0)]);
                dataToExport.push(['Total Pago a Piloto:', this.formatCurrency(this.totalPagoPilotoCalculado)]);
                totalesFilas += 2;
            }
            if (this.filtroTecnico.value) {
                dataToExport.push(['Valor de Servicio de Técnico:', this.formatCurrency(Number(this.valorServicioTecnico.value) || 0)]);
                dataToExport.push(['Total Pago a Técnico:', this.formatCurrency(this.totalPagoTecnicoCalculado)]);
                totalesFilas += 2;
            }
        }

        const colWidths = headers.map((h, idx) => {
            let maxLen = h.length;
            data.forEach(item => {
                const v = String(filaDatos(item)[idx] ?? '');
                if (v.length > maxLen) maxLen = v.length;
            });
            return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
        });

        this.exportToExcel(dataToExport, headerRowIndex, totalesRowIndex, colWidths, infoRows, totalesFilas);
    }

    private exportToExcel(dataArray: any[], headerRowIndex?: number, totalesRowIndex?: number, colWidths?: any[], infoRows?: number[], totalesFilas?: number): void {
        const worksheet = XLSX.utils.aoa_to_sheet(dataArray);

        if (colWidths) {
            worksheet['!cols'] = colWidths;
        }

        const verde = { patternType: 'solid', fgColor: { rgb: '1E5A34' } };
        const styleTitulo = { fill: verde, font: { bold: true, color: { rgb: 'FFFFFF' } } };
        const styleLabel = { font: { bold: true, color: { rgb: '1E5A34' } } };

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        if (headerRowIndex !== undefined) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cell = worksheet[XLSX.utils.encode_cell({ r: headerRowIndex, c })];
                if (cell) cell.s = styleTitulo;
            }
        }

        if (totalesRowIndex !== undefined) {
            const hasta = totalesRowIndex + (totalesFilas ?? 6);
            for (let r = totalesRowIndex; r <= hasta; r++) {
                for (let c = 0; c < 2; c++) {
                    const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
                    if (cell) cell.s = r === totalesRowIndex ? styleTitulo : styleLabel;
                }
            }
        }

        if (infoRows && infoRows.length) {
            worksheet['!merges'] = worksheet['!merges'] || [];
            for (const r of infoRows) {
                worksheet['!merges'].push({ s: { r, c: 0 }, e: { r, c: range.e.c } });
                const cell = worksheet[XLSX.utils.encode_cell({ r, c: 0 })];
                if (cell) {
                    cell.s = {
                        alignment: { horizontal: 'center', vertical: 'center' },
                        font: { bold: true }
                    };
                }
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Gestion');

        XLSX.writeFile(workbook, `${this.getNombreArchivo()}.xlsx`, { cellStyles: true });
    }

    exportarResultadosPdf(): void {
        if (!this.validarAntesDeExportar()) return;
        this.exportToPdf(this.data.data);
    }

    exportToPdf(data: gestionList[]): void {
        const doc = new jsPDF('l', 'mm', [297, 210]);
        const pageWidth = doc.internal.pageSize.getWidth();

        const tituloPdf = this.mostrarPlanillaAdministrativo ? 'PLANILLA GENERAL' : 'Reporte de Gestión';
        doc.setFontSize(16);
        doc.text(tituloPdf, pageWidth / 2, 10, { align: 'center' });

        const fechaGeneracion = new Date();
        const diaGen = fechaGeneracion.getDate().toString().padStart(2, '0');
        const mesGen = (fechaGeneracion.getMonth() + 1).toString().padStart(2, '0');
        const añoGen = fechaGeneracion.getFullYear();
        doc.setFontSize(9);
        doc.text(`Generado: ${diaGen}/${mesGen}/${añoGen}`, pageWidth / 2, 16, { align: 'center' });

        let yInfo = 24;
        const filtro = this.getValorFiltro();
        if (filtro) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(filtro, pageWidth / 2, yInfo, { align: 'center' });
            yInfo += 6;
        }
        const rango = this.getRangoDescripcion();
        if (rango) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(rango, pageWidth / 2, yInfo, { align: 'center' });
            yInfo += 6;
        }

        const headersPdf = [
            'Fecha', 'Orden de Pedido', 'Cliente', 'Cuadro', 'F.Pago', 'Sup.(Ha)',
            'Piloto', 'Técnico', 'Precio/Ha', 'Subtotal', 'Remito', 'Aclaración'
        ];
        const bodyData = data.map(d => [
            this.formatDateForExport(d.fechaVuelo),
            d.opNomenclatura || '-',
            d.propietario || '',
            d.cuadroVuelo || '',
            d.formaPago || '',
            this.formatNumber(d.superficieVuelo || 0),
            d.pilotoNombreCompleto + (d.esContratistaPiloto ? ' (C)' : '') || '',
            d.tecnicoVuelo || '',
            this.formatCurrencyNumber(d.precioHa || 0),
            this.formatCurrencyNumber(d.subTotal || 0),
            d.numRemito || '',
            d.aclaracion || ''
        ]);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const colWidthsPdf = headersPdf.map((h, idx) => {
            let maxW = doc.getTextWidth(h);
            bodyData.forEach(fila => {
                const w = doc.getTextWidth(String(fila[idx] ?? ''));
                if (w > maxW) maxW = w;
            });
            return Math.min(Math.max(maxW + 3, 12), 50);
        });
        const anchoDisponible = 277;
        const suma = colWidthsPdf.reduce((a, b) => a + b, 0);
        const factor = anchoDisponible / suma;
        const colStyles: any = {};
        colWidthsPdf.forEach((w, i) => {
            const numerica = i === 5 || i === 8 || i === 9;
            colStyles[i] = { cellWidth: w * factor, halign: numerica ? 'right' : 'left' };
        });

        autoTable(doc, {
            head: [headersPdf],
            body: bodyData,
            startY: yInfo + 2,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 90, 52],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            columnStyles: colStyles,
            didDrawPage: function (data) {
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(10);
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });

        const tableFinalY = (doc as any).lastAutoTable?.finalY || 200;
        const totales: Array<[string, string]> = [
            ['Total Superficie:', `${this.formatNumber(this.totalSuperficie)} Ha`],
            ['Total Servicio (Sup. x Precio/Ha):', this.formatCurrency(this.totalSubTotal)],
        ];
        if (this.mostrarPlanillaAdministrativo) {
            totales.push(['Valor de Servicio de Administrativo:', this.formatCurrency(Number(this.valorServicioAdministrativo.value) || 0)]);
            totales.push(['Total Pago a Administrativo:', this.formatCurrency(this.totalPagoAdministrativoCalculado)]);
        } else {
            if (this.filtroContratista.value) {
                totales.push(['Total Pago a Contratista:', this.formatCurrency(this.totalPagoContratistaCalculado)]);
            }
            if (this.filtroPiloto.value) {
                totales.push(['Valor de Servicio de Piloto:', this.formatCurrency(Number(this.valorServicioPiloto.value) || 0)]);
                totales.push(['Total Pago a Piloto:', this.formatCurrency(this.totalPagoPilotoCalculado)]);
            }
            if (this.filtroTecnico.value) {
                totales.push(['Valor de Servicio de Técnico:', this.formatCurrency(Number(this.valorServicioTecnico.value) || 0)]);
                totales.push(['Total Pago a Técnico:', this.formatCurrency(this.totalPagoTecnicoCalculado)]);
            }
        }

        const verde = [30, 90, 52];
        const boxW = 200;
        const boxH = 7;
        let yTot = tableFinalY + 10;

        doc.setFillColor(verde[0], verde[1], verde[2]);
        doc.roundedRect((pageWidth - boxW) / 2, yTot, boxW, boxH, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('TOTALES', pageWidth / 2, yTot + 4.8, { align: 'center' });
        yTot += boxH + 3;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const wLabelMax = Math.max(...totales.map(([l]) => doc.getTextWidth(l)));
        doc.setFont('helvetica', 'normal');
        const wValorMax = Math.max(...totales.map(([, v]) => doc.getTextWidth(v)));
        const gapCol = 8;
        const bloqueW = wLabelMax + gapCol + wValorMax;
        const xLabel = (pageWidth - bloqueW) / 2;
        const xValor = xLabel + wLabelMax + gapCol;

        totales.forEach(([label, valor]) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(verde[0], verde[1], verde[2]);
            doc.text(label, xLabel, yTot);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(valor, xValor, yTot);
            yTot += 5;
        });

        doc.setTextColor(0, 0, 0);
        doc.save(`${this.getNombreArchivo()}.pdf`);
    }

    formatNumber(value: number): string {
        return value?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00';
    }

    formatCurrency(value: number): string {
        return `$ ${this.formatNumber(value)}`;
    }

    private formatCurrencyNumber(value: number): string {
        return this.formatNumber(value);
    }
}
