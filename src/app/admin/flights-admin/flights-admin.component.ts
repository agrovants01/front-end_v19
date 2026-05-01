import { AfterViewInit, Component, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { UserFormComponent } from '../components/user-form/user-form.component';
import { AdminService } from '../services/admin.service';
import { successAlert, errorAlert, confirmAlert, confirmAlertDelete } from '../../shared/services/alerts';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';
import { MatTableDataSource } from '@angular/material/table';
import { flightList } from './flights-admin.interface';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SelectionModel } from '@angular/cdk/collections';
import { FlightsBatchEditComponent } from './flights-batch-edit.component';
import { formatDate } from '@angular/common';
import { NativeDateAdapter } from '@angular/material/core';
import { AuthService } from '../../auth/services/auth.service';
import { OwnerService } from 'src/app/pages/services/owner.service';


@Component({
    standalone: false,
    selector: 'app-flights-admin',
    templateUrl: './flights-admin.component.html',
    styleUrls: ['flights-admin.component.css'],
    encapsulation: ViewEncapsulation.None,
    providers: [NativeDateAdapter],
})
export class FlightsAdminComponent implements AfterViewInit, OnDestroy {


    private unsubscribe$ = new Subject<void>();


    displayedColumns: string[] = [
        'select',
        'fechaVuelo',
        'propietario',
        'cuadroVuelo',
        'cultivoVuelo',
        'caldohaVuelo',
        'superficieVuelo',
        'pilotoNombreCompleto',
        'tecnicoVuelo',
        'precioHa',
        'formaPago',
        'aclaracion',

    ];

    //data: UserList[] = [];

    data: MatTableDataSource<flightList> = new MatTableDataSource();
    selection = new SelectionModel<flightList>(true, []);

    alias = localStorage.getItem('aliasUsuarioLogueado')


    //antes searchUsers
    searchFlights: FormControl = new FormControl('');
    isLoadingResults = true;
    dataError: boolean = false;

    // MatPaginator
    resultsLength = 0;
    pageSizeOptions: number[] = pageSizeOptions;

    @ViewChild(MatPaginator)
    paginator!: MatPaginator;
    @ViewChild(MatSort)
    sort!: MatSort;



    range = new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
    });


    constructor(
        private _adminService: AdminService,
        public dialog: MatDialog,
        public authService: AuthService,
        private ownerService: OwnerService // Agrega esta línea

    ) { }

    ngAfterViewInit() {
        // Reset page index if sort order changes
        this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

        // Merge multiple observables to trigger data fetching
        merge(
            this.sort.sortChange,
            this.paginator.page,
            this.searchFlights.valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged()
            ),
            this.range.valueChanges // Escucha cambios en el rango de fechas
        )
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap(() => {
                    this.isLoadingResults = true;

                    // Obtén las fechas del rango
                    const dateSince = this.range.get('start')?.value;
                    const dateUntil = this.range.get('end')?.value;

                    // Prepara el rango de fechas si ambos valores están presentes
                    const range = dateSince && dateUntil ? {
                        fechaDesde: formatDate(dateSince, 'yyyy-MM-dd', 'es-Ar'),
                        fechaHasta: formatDate(dateUntil, 'yyyy-MM-dd', 'es-Ar'),
                    } : null;

                    // Llama al servicio con los parámetros necesarios
                    return this._adminService.getFlightsAdminList(
                        this.sort.active,
                        this.sort.direction,
                        this.paginator.pageIndex,
                        this.searchFlights.value,
                        this.paginator.pageSize,
                        range // Pasa el rango de fechas
                    ).pipe(
                        catchError(() => {
                            this.dataError = true;
                            return of(null);
                        })
                    );
                }),
                map((data) => {
                    // Marca como no cargando cuando termine
                    this.isLoadingResults = false;

                    if (data === null) {
                        return [];
                    }

                    // Actualiza el número total de resultados
                    this.resultsLength = data.total_count;
                    this.dataError = false;

                    return data.items;
                }),
            )
            .subscribe(data => {
                this.data.data = data;  // Actualiza el MatTableDataSource
                this.data.sort = this.sort;  // Asigna MatSort al MatTableDataSource
            });
    }


    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    masterToggle(): void {
        this.isAllSelected() ?
            this.selection.clear() :
            this.data.data.forEach(row => this.selection.select(row));
    }

    isAllSelected(): boolean {
        const numSelected = this.selection.selected.length;
        const numRows = this.data.data.length;
        return numSelected === numRows;
    }


    isIndeterminate(): boolean {
        return this.selection.hasValue() && !this.isAllSelected();
    }

    editSelectedRows(): void {
        const dialogRef = this.dialog.open(FlightsBatchEditComponent, {
            data: this.selection.selected
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result && result.cambios) {
                const cambios = result.cambios;
                const selectedFlights = this.selection.selected.map((flight) => flight.vueloId);
                this._adminService.updateBatchFlights(selectedFlights, cambios)
                    .subscribe((response) => {
                        if (response) {
                            successAlert('Vuelos actualizados exitosamente.');
                            this.refreshData(); // Refresca la tabla
                            this.selection.clear(); // Limpia la selección
                        } else {
                            errorAlert('Error al actualizar los vuelos.');
                        }
                    }, (error) => {
                        errorAlert('Error al actualizar los vuelos.');
                    });
            }
        });
    }

    deleteSelectedRows(): void {
        const selectedRows = this.selection.selected;
        if (selectedRows.length > 0) {
            confirmAlertDelete('¿Estás seguro de eliminar los vuelos seleccionados?').then((result) => {
                if (result.value) {
                    const selectedIds = selectedRows.map(row => row.vueloId);
                    this.ownerService.deleteOwnerFlights(selectedIds).subscribe(response => {
                        successAlert(response[0].msg);
                        this.refreshData();
                        this.selection.clear();
                    }, error => {
                        errorAlert(error.error.msg); // Muestra el mensaje de error que viene del backend
                    });
                }
            });
        } else {
            errorAlert('No hay vuelos seleccionados');
        }
    }


    exportarResultados() {
        let data;

        // Obtén las fechas del rango
        const dateSince = this.range.get('start')?.value;
        const dateUntil = this.range.get('end')?.value;

        // Prepara el rango de fechas si ambos valores están presentes
        const range = dateSince && dateUntil ? {
            fechaDesde: formatDate(dateSince, 'yyyy-MM-dd', 'es-Ar'),
            fechaHasta: formatDate(dateUntil, 'yyyy-MM-dd', 'es-Ar'),
        } : null;

        if (this.searchFlights.value || range) {
            // Usa los datos actualmente cargados en la tabla
            data = this.data.data;
            this.prepareAndExportToExcel(data);
        } else {
            // Si no hay filtros, realiza una consulta con el rango completo
            this._adminService.getFlightsAdminList('', 'asc', 0, '', 100000, range)
                .subscribe(response => {
                    data = response.items;
                    this.prepareAndExportToExcel(data);
                });
        }
    }

    private prepareAndExportToExcel(data: any[]) {
        if (data && data.length > 0) {
            // Ordena los datos por fecha de manera ascendente
            data.sort((a, b) => new Date(a.fechaVuelo.split('/').reverse().join('-')).getTime() - new Date(b.fechaVuelo.split('/').reverse().join('-')).getTime());

            // Incluye solo los campos deseados, en el orden que deseas
            const dataToExport = data.map(item => [
                item.fechaVuelo,
                item.propietario,
                item.cuadroVuelo,
                item.cultivoVuelo,
                item.caldohaVuelo,
                item.superficieVuelo,
                item.pilotoNombreCompleto,
                item.tecnicoVuelo,
                item.precioHa,
                item.formaPago,
                item.aclaracion,
            ]);

            this.exportToExcel(dataToExport);
        } else {
            errorAlert('No hay datos para exportar');
        }
    }

    private exportToExcel(dataArray: any[]) {
        // Encabezados para el archivo Excel
        const headers = [
            'Fecha',
            'Propietario',
            'Cuadro',
            'Cultivo',
            'Caldo/Ha (Lts.)',
            'Superficie',
            'Piloto',
            'Técnico',
            'Precio/Ha',
            'Forma de Pago',
            'Aclaración',
        ];

        // Inserta los encabezados en la primera fila
        dataArray.unshift(headers);

        // Crea la hoja de cálculo
        const worksheet = XLSX.utils.aoa_to_sheet(dataArray);

        // Crea el libro de trabajo y agrega la hoja
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Vuelos');

        // Genera el archivo Excel
        XLSX.writeFile(workbook, 'vuelos.xlsx');
    }

    exportarResultadosPdf() {
        let data;
        if (this.searchFlights.value) {
            data = this.data.data;
        } else {
            this._adminService.getFlightsAdminList('', 'asc', 0, '', 100000)
                .subscribe(response => {
                    data = response.items;
                    this.exportToPdf(data);
                });
        }
        if (data) {
            this.exportToPdf(data);
        }
    }



    exportToPdf(data: flightList[]) {
        const doc = new jsPDF('l', 'mm', [297, 210]);
        doc.text('Listado de vuelos', 10, 10);
        doc.setFontSize(9);

        const headers = [
            'Nº',
            'Fecha',
            'Propietario',
            'Cuadro',
            'Cultivo',
            'Caldo/Ha',
            'Sup.',
            'Piloto',
            'Técnico',
            'Precio/Ha',
            'F.Pago',
            'Nota'
        ];

        // 🔹 Función auxiliar para convertir cualquier tipo de fecha a timestamp
        const parseFecha = (fecha: any): number => {
            if (fecha instanceof Date) {
                return fecha.getTime();
            }
            if (typeof fecha === 'string') {
                const parts = fecha.split('/');
                if (parts.length === 3) {
                    return new Date(parts.reverse().join('-')).getTime();
                }
            }
            return 0; // si no es válida
        };

        // 🔹 Ordenar por fecha ascendente
        data.sort((a, b) => parseFecha(a.fechaVuelo) - parseFecha(b.fechaVuelo));

        // 🔹 Crear filas
        const rows = data.map((item, index) => [
            index + 1,
            item.fechaVuelo instanceof Date
                ? item.fechaVuelo.toLocaleDateString('es-AR')
                : item.fechaVuelo ?? '',
            item.propietario ?? '',
            item.cuadroVuelo ?? '',
            item.cultivoVuelo ?? '',
            item.caldohaVuelo ?? '',
            item.superficieVuelo ?? '',
            item.pilotoNombreCompleto ?? '',
            item.tecnicoVuelo ?? '',
            item.precioHa ?? '',
            item.formaPago ?? '',
            item.aclaracion ?? ''
        ]);

        // 🔹 Configuración de paginado
        let currentPage = 1;
        const rowsPerPage = 30;
        const totalPages = Math.ceil(rows.length / rowsPerPage);

        // 🔹 Renderizado de cada página


        autoTable(doc, {
            head: [headers],
            // 👇 Se castea a "any" para evitar el error del instanceof
            body: rows,
            margin: { top: 10 },
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [27, 63, 48],
                textColor: [255, 255, 255],
                fontSize: 8,
            },
            theme: 'striped',
            startY: 15,
            columnStyles: {
                0: { cellWidth: 10 },  // Nº
                1: { cellWidth: 20 },  // Fecha
                2: { cellWidth: 30 },  // Propietario
                3: { cellWidth: 30 },  // Cuadro
                4: { cellWidth: 20 },  // Cultivo
                5: { cellWidth: 20 },  // Caldo/Ha
                6: { cellWidth: 15 },  // Superficie
                7: { cellWidth: 25 },  // Piloto
                8: { cellWidth: 25 },  // Técnico
                9: { cellWidth: 22 },  // Precio/Ha
                10: { cellWidth: 20 }, // Forma de Pago
                11: { cellWidth: 25 }, // Aclaración
            },
        });

        // 🔹 Pie de página con número de página
        const texto = `Página ${currentPage} de ${totalPages}`;
        const anchoTexto = doc.getTextWidth(texto);
        const x = (doc.internal.pageSize.width - anchoTexto) / 2;
        doc.text(texto, x, doc.internal.pageSize.height - 7);

        // 🔹 Guardar el archivo
        doc.save('listado-vuelos.pdf');
    }




    exportarResultadosGeoJson() {
        let data;
        if (this.searchFlights.value) {
            data = this.data.data; // Usa los datos filtrados
        } else {
            this._adminService.getFlightsAdminList('', 'asc', 0, '', 100000000)
                .subscribe(response => {
                    data = response.items;
                    this.exportToGeoJson(data);
                });
        }
        if (data) {
            this.exportToGeoJson(data);
        }
    }

    exportToGeoJson(data: flightList[]) {
        const geoJson = {
            type: "FeatureCollection",
            features: data.map(item => ({
                type: "Feature",
                geometry: typeof item.geometryVuelo === "string" ? JSON.parse(item.geometryVuelo) : item.geometryVuelo,
                properties: {
                    vueloId: item.vueloId,
                    propietario: item.propietario,
                    fechaVuelo: item.fechaVuelo,
                    cuadroVuelo: item.cuadroVuelo,
                    cultivoVuelo: item.cultivoVuelo,
                    superficieVuelo: item.superficieVuelo,
                    caldohaVuelo: item.caldohaVuelo,
                    pilotoVuelo: item.pilotoVuelo,
                    pilotoNombreCompleto: item.pilotoNombreCompleto,
                    idPilotoVuelo: item.idPilotoVuelo,
                    tecnicoVuelo: item.tecnicoVuelo,
                    totalCaldoVuelo: item.totalCaldoVuelo,
                    totalH2OVuelo: item.totalH2OVuelo,
                    agq1: item.agq1,
                    dosisagq1: item.dosisagq1,
                    agq2: item.agq2,
                    dosisagq2: item.dosisagq2,
                    agq3: item.agq3,
                    dosisagq3: item.dosisagq3,
                    agq4: item.agq4,
                    dosisagq4: item.dosisagq4,
                    coad1: item.coad1,
                    dosiscoad1: item.dosiscoad1,
                    coad2: item.coad2,
                    dosiscoad2: item.dosiscoad2,
                    precioHa: item.precioHa,
                    formaPago: item.formaPago,
                    aclaracion: item.aclaracion,
                    colorVuelo: item.colorVuelo,
                }
            }))
        };

        const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: "application/json" });

        // Obtener la fecha actual en formato yyyy-mm-dd
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // Asignar el nombre con la fecha
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `vuelos_${formattedDate}.geojson`;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    applyBatchChanges(field: string, newValue: any): void {
        const selectedFlights = this.selection.selected.map(flight => flight.vueloId); // IDs de vuelos seleccionados
        const cambios = { [field]: newValue }; // Crea el objeto de cambios

        this._adminService.updateBatchFlights(selectedFlights, cambios)
            .pipe(
                catchError(err => {
                    errorAlert('Error al actualizar los vuelos masivamente.');
                    return of(null);
                })
            )
            .subscribe(response => {
                if (response) {
                    successAlert('Vuelos actualizados exitosamente.');
                    this.refreshData(); // Refresca la tabla
                    this.selection.clear(); // Limpia la selección
                }
            });
    }

    refreshData(): void {
        this._adminService.getFlightsAdminList(
            this.sort.active,
            this.sort.direction,
            this.paginator.pageIndex,
            this.searchFlights.value,
            this.paginator.pageSize
        ).subscribe(data => {
            this.data.data = data.items;
        });
    }
}
