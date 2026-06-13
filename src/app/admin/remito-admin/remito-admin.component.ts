import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { forkJoin, Subject, merge, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { OwnerListInput } from 'src/app/pages/owner/owner.interface';
import { OwnerService } from 'src/app/pages/services/owner.service';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { AdminService } from '../services/admin.service';
import { SelectionModel } from '@angular/cdk/collections';
import * as XLSX from 'xlsx';
import { errorAlert } from 'src/app/shared/services/alerts';
import { MatCheckbox } from '@angular/material/checkbox';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { MatTabGroup } from '@angular/material/tabs';
import { MatDateRangePicker } from '@angular/material/datepicker';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

@Component({
    standalone: false,
    selector: 'app-remito-admin',
    templateUrl: './remito-admin.component.html',
    styleUrls: ['./remito-admin.component.css']
})
export class RemitoAdminComponent implements OnInit, AfterViewInit {

    private unsubscribe$ = new Subject<void>();
    private sweetAlert = Swal;

    ownersList: OwnerListInput[] = [];
    selectedPropietarioId: string | null = null;
    remitoForm!: FormGroup;
    resultsLength: number = 0;
    pageSizeOptions: number[] = [50, 100, 500];
    dataSource = new MatTableDataSource<any>([]);
    isLoadingResults = false;
    dataError = false;

    displayedColumns: string[] = [
        'select',
        'cuadroVuelo',
        'date',
        'cultivoVuelo',
        'superficieVuelo',
        'precioHa',
        'pilotoNombreCompleto',
        'numRemito',
    ];
    selection = new SelectionModel<any>(true, []);
    private refreshTrigger$ = new Subject<void>();
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(
        private ownerService: OwnerService,
        private adminService: AdminService,
        private formBuilder: FormBuilder,
        private router: Router,
    ) { }

    ngOnInit(): void {
        this.remitoForm = this.formBuilder.group({
            propietarioFlight: new FormControl(),
            startDate: new FormControl(),
            endDate: new FormControl()
        });

        this.obtenerPropietarios();

        // Limpiar el número de remito temporal al entrar al componente
        localStorage.removeItem('numeroRemito');

        // Obtener el último remito solo si no existe
        if (!localStorage.getItem('ultimoRemito')) {
            this.adminService.getUltimoRemito().subscribe((response: any) => {
                let ultimoRemito = response.ultimoRemito;

                if (ultimoRemito && !ultimoRemito.startsWith('R')) {
                    ultimoRemito = 'R' + ultimoRemito;
                }

                localStorage.setItem('ultimoRemito', ultimoRemito);
            });
        }
    }

    ngAfterViewInit(): void {
        this.sort.disableClear = true;
        this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

        merge(
            this.sort.sortChange,
            this.paginator.page,
            this.refreshTrigger$
        )
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap(() => {
                    if (!this.selectedPropietarioId) return of(null);

                    this.isLoadingResults = true;

                    const startDate = this.remitoForm.get('startDate')?.value;
                    const endDate = this.remitoForm.get('endDate')?.value;

                    let range: { fechaDesde: string; fechaHasta: string } | undefined;

                    if (startDate && endDate) {
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                        range = {
                            fechaDesde: fmtDate(new Date(startDate)),
                            fechaHasta: fmtDate(new Date(endDate)),
                        };
                    }

                    return this.adminService.getOwnerFlightsRemito(
                        this.selectedPropietarioId,
                        this.sort.active || 'fechaVuelo',
                        this.sort.direction || 'asc',
                        this.paginator.pageIndex,
                        this.paginator.pageSize,
                        range
                    ).pipe(
                        catchError(() => {
                            this.dataError = true;
                            return of(null);
                        })
                    );
                }),
                map((data) => {
                    if (!data) return [];
                    this.isLoadingResults = false;
                    this.resultsLength = data.count;
                    this.dataError = false;
                    return data.rows.map(flight => ({
                        ...flight,
                        date: this.formatDate(flight.date),
                        numRemito: flight.numRemito && flight.numRemito !== 'Ninguno' && flight.numRemito !== null && flight.numRemito !== ''
                            ? (flight.numRemito.startsWith('R') ? flight.numRemito : 'R' + flight.numRemito)
                            : flight.numRemito
                    }));
                })
            )
            .subscribe(data => {
                this.dataSource.data = data;
            });
    }

    //=======================================================================

    masterToggle(): void {
        this.isAllSelected() ?
            this.selection.clear() :
            this.dataSource.data.forEach(row => this.selection.select(row));
    }

    isAllSelected(): boolean {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    isIndeterminate(): boolean {
        return this.selection.hasValue() && !this.isAllSelected();
    }

    obtenerPropietarios() {
        this.ownerService.getOwnersList()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((owners: OwnerListInput[]) => {
                this.ownersList = owners.sort((a, b) => a.nombrePropietario.localeCompare(b.nombrePropietario));
            })
    }

    onPropietarioSelected(): void {
        const propietarioControl = this.remitoForm?.get('propietarioFlight');
        if (propietarioControl) {
            const selectedPropietario = propietarioControl.value;

            if (selectedPropietario && selectedPropietario.id) {
                this.selectedPropietarioId = selectedPropietario.id;
                this.selection.clear();
                this.remitoForm.get('startDate')?.setValue(null);
                this.remitoForm.get('endDate')?.setValue(null);
                this.refreshTrigger$.next();
            } else {
                this.selectedPropietarioId = null;
                this.dataSource.data = [];
                this.resultsLength = 0;
                this.selection.clear();
            }
        }
    }

    onDateRangeChange(): void {
        this.refreshTrigger$.next();
    }

    private formatDate(dateString: string): string {
        if (!dateString) return '';

        try {
            // Si la fecha ya tiene un formato con hora, convertirla correctamente
            // Si solo tiene fecha, agregar 'T00:00:00' para evitar problemas de zona horaria
            const dateStr = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
            const date = new Date(dateStr);

            // Verificar si la fecha es válida
            if (isNaN(date.getTime())) {
                return dateString;
            }

            // Usar UTC para evitar problemas de zona horaria
            const day = date.getUTCDate().toString().padStart(2, '0');
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const year = date.getUTCFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Error al formatear fecha:', error);
            return dateString;
        }
    }

    verificarYGenerarRemito() {
        if (this.selection.selected.length === 0) {
            errorAlert(
                'Selección requerida',
                'Debe seleccionar al menos un vuelo para generar el remito'
            );
            return;
        }

        const vuelosConRemitoEmitido = this.selection.selected.filter(
            vuelo => vuelo.numRemito !== null && vuelo.numRemito !== '' && vuelo.numRemito !== 'Ninguno'
        );

        const continuarProceso = () => {
            // =========================
            // CALCULAR TOTALES
            // =========================
            let totalHectareas = 0;
            let totalSinIva = 0;

            this.selection.selected.forEach(vuelo => {
                totalHectareas += vuelo.superficieVuelo;
                totalSinIva += vuelo.precioHa * vuelo.superficieVuelo;
            });

            const totalConIva = totalSinIva * 1.105;

            // =========================
            // CREAR OBJETO DE REMITO
            // =========================
            const propietario = this.remitoForm.get('propietarioFlight')?.value;
            if (!propietario || !propietario.id) {
                errorAlert('Error', 'No se encontró un propietario válido para el remito');
                return;
            }

            const nuevoRemito = {
                fechaRemito: new Date(),
                fk_Usuario: propietario.id,
                creadorId: localStorage.getItem('idUsuarioLogueado'),
                totalHectareas,
                totalSinIva,
                totalConIva,
                vuelosIds: this.selection.selected.map(vuelo => vuelo.vueloId)
            };

            // =========================
            // GUARDAR REMITO EN BACKEND
            // =========================
            this.adminService.postRemito(nuevoRemito).subscribe({
                next: (response) => {
                    console.log('✅ Remito guardado en base de datos:', response);

                    const numeroRemitoGenerado = response.remito.numRemito;

                    // ✅ ACTUALIZAR localStorage con el número devuelto por el backend
                    localStorage.setItem('numeroRemito', numeroRemitoGenerado);
                    localStorage.setItem('ultimoRemito', numeroRemitoGenerado);

                    // =========================
                    // ACTUALIZAR LOS VUELOS CON EL NUEVO NÚMERO DE REMITO
                    // =========================
                    const peticiones = this.selection.selected.map(vuelo => {
                        return this.adminService.actualizaNumRemito(vuelo.vueloId, numeroRemitoGenerado);
                    });

                    forkJoin(peticiones).subscribe({
                        next: () => {
                            console.log('✈️ Vuelos actualizados con número de remito');

                            // GENERAR EL PDF Y LUEGO REFRESCAR
                            this.generateRemito();
                            this.onPropietarioSelected();

                            // ✅ LIMPIAR el número de remito temporal DESPUÉS de generar el PDF
                            localStorage.removeItem('numeroRemito');
                        },
                        error: (error) => {
                            console.error('❌ Error al actualizar vuelos:', error);
                            errorAlert('Error', 'No se pudieron actualizar los vuelos con el número de remito');
                        }
                    });
                },
                error: (error) => {
                    console.error('❌ Error al guardar el remito:', error);
                    errorAlert('Error', 'No se pudo guardar el remito en la base de datos');

                    localStorage.removeItem('numeroRemito');
                }
            });
        };

        // =========================
        // VALIDAR VUELOS CON REMITO EXISTENTE
        // =========================
        if (vuelosConRemitoEmitido.length > 0) {
            Swal.fire({
                title: 'Advertencia',
                text: 'Se han detectado vuelos con remitos emitidos. ¿Desea cancelar el proceso de emisión de remito?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Cancelar',
                cancelButtonText: 'Continuar'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.selection.clear();
                    // También limpiar el número temporal si se cancela
                    localStorage.removeItem('numeroRemito');
                } else {
                    continuarProceso();
                }
            });
        } else {
            continuarProceso();
        }
    }

    generateRemito() {
        const doc = new jsPDF('p', 'mm', 'a4');

        //==========================================================================================
        // Dibujamos la fila grande de la cabecera del remito primero:
        autoTable(doc, {
            body: [
                [
                    {
                        content: '',
                        colSpan: 1,
                        rowSpan: 1,
                        styles: {
                            halign: 'center',
                            valign: 'middle',
                            fontSize: 12,
                            fontStyle: 'normal',
                            textColor: [0, 0, 0],
                            fillColor: [255, 255, 255],
                            cellPadding: 0,
                            lineWidth: 0.6,
                            lineColor: [0, 0, 0],
                            minCellHeight: 44,
                        },
                    },
                ],
            ],
            columns: [
                {
                    header: '',
                    dataKey: 'col1',
                },
            ],
            startY: 9,
            margin: { top: 9, right: 8, bottom: 0, left: 8 },
            theme: 'plain',
            tableWidth: 189,
        });

        //==========================================================================================
        // Dibujamos la celda que encierra el logo
        autoTable(doc, {
            body: [
                [
                    {
                        content: '',
                        colSpan: 1,
                        rowSpan: 1,
                        styles: {
                            halign: 'center',
                            valign: 'middle',
                            fontSize: 12,
                            fontStyle: 'normal',
                            textColor: [0, 0, 0],
                            fillColor: [255, 255, 255],
                            cellPadding: 0,
                            lineWidth: 0.6,
                            lineColor: [0, 0, 0],
                            minCellHeight: 44,
                        },
                    },
                ],
            ],
            columns: [
                {
                    header: '',
                    dataKey: 'col2',
                },
            ],
            startY: 9,
            margin: { top: 9, right: 0, bottom: 0, left: 8 },
            theme: 'plain',
            tableWidth: 83,
        });

        //==========================================================================================
        // Dibujamos la celda que encierra la letra R de remito? en el medio de la celda principal
        autoTable(doc, {
            body: [
                [
                    {
                        content: '',
                        colSpan: 1,
                        rowSpan: 1,
                        styles: {
                            halign: 'center',
                            valign: 'middle',
                            fontSize: 12,
                            fontStyle: 'normal',
                            textColor: [0, 0, 0],
                            fillColor: [255, 255, 255],
                            cellPadding: 0,
                            lineWidth: 0.6,
                            lineColor: [0, 0, 0],
                            minCellHeight: 23,
                        },
                    },
                ],
            ],
            columns: [
                {
                    header: '',
                    dataKey: 'col3',
                },
            ],
            startY: 9,
            margin: { top: 9, right: 0, bottom: 0, left: 91 },
            theme: 'plain',
            tableWidth: 20,
        });
                //==========================================================================================
        // Dibujamos la celda que encierra la leyenda "DOCUMENTO NO VALIDO COMO FACTURA"
        autoTable(doc, {
            body: [
                [
                    {
                        content: '',
                        colSpan: 1,
                        rowSpan: 1,
                        styles: {
                            halign: 'center',
                            valign: 'middle',
                            fontSize: 12,
                            fontStyle: 'normal',
                            textColor: [0, 0, 0],
                            fillColor: [255, 255, 255],
                            cellPadding: 0,
                            lineWidth: 0.6,
                            lineColor: [0, 0, 0],
                            minCellHeight: 21,
                        },
                    },
                ],
            ],
            columns: [
                {
                    header: '',
                    dataKey: 'col4',
                },
            ],
            startY: 32,
            margin: { top: 32, right: 0, bottom: 0, left: 91 },
            theme: 'plain',
            tableWidth: 20,
        });

        //==========================================================================================
        // Dibujamos la celda que dice remito y el numero de remito
        autoTable(doc, {
            body: [
                [
                    {
                        content: '',
                        colSpan: 1,
                        rowSpan: 1,
                        styles: {
                            halign: 'center',
                            valign: 'middle',
                            fontSize: 12,
                            fontStyle: 'normal',
                            textColor: [0, 0, 0],
                            fillColor: [255, 255, 255],
                            cellPadding: 0,
                            lineWidth: 0.6,
                            lineColor: [0, 0, 0],
                            minCellHeight: 23,
                        },
                    },
                ],
            ],
            columns: [
                {
                    header: '',
                    dataKey: 'col3',
                },
            ],
            startY: 9,
            margin: { top: 9, right: 0, bottom: 0, left: 111 },
            theme: 'plain',
            tableWidth: 86,
        });

        //==========================================================================================
        // Dibujamos la fila segunda de los datos de la empresa
        autoTable(doc, {
            body: [
                [
                    {
                        content: '',
                        colSpan: 1,
                        rowSpan: 1,
                        styles: {
                            halign: 'center',
                            valign: 'middle',
                            fontSize: 12,
                            fontStyle: 'normal',
                            textColor: [0, 0, 0],
                            fillColor: [255, 255, 255],
                            cellPadding: 0,
                            lineWidth: 0.6,
                            lineColor: [0, 0, 0],
                            minCellHeight: 19,
                        },
                    },
                ],
            ],
            columns: [
                {
                    header: '',
                    dataKey: 'col1',
                },
            ],
            startY: 53,
            margin: { top: 53, right: 8, bottom: 0, left: 8 },
            theme: 'plain',
            tableWidth: 189,
        });

        //==========================================================================================
        // Agregamos la palabra Remito en 25 dentro de la ultima celda derecha superior
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('REMITO', 137, 18);

        // 🧾 GESTIÓN DE REMITO (usa el número ya guardado en localStorage)
        const textoRemito = localStorage.getItem('numeroRemito');

        if (textoRemito) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Remito número: ${textoRemito}`, 150, 30);
        } else {
            console.error('⚠️ No se encontró "numeroRemito" en localStorage. Genera el número antes de crear el PDF.');
        }
        //==========================================================================================
        // Agregamos la letra R en negrita y grande en la celda del medio
        doc.setFontSize(40);
        doc.setFont('helvetica', 'bold');
        doc.text('R', 96, 25);

        //==========================================================================================
        // Agregamos el texto "DOCUMENTO NO VÁLIDO COMO FACTURA" en la celda del medio
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('DOCUMENTO\nNO VÁLIDO\nCOMO\nFACTURA', 101, 39, { align: 'center' });

        //==========================================================================================
        // Agregamos los datos de la empresa emisora (AGROVANTS)
        const fechaActual2 = new Date();
        const dia2 = fechaActual2.getDate().toString().padStart(2, '0');
        const mes2 = (fechaActual2.getMonth() + 1).toString().padStart(2, '0');
        const año2 = fechaActual2.getFullYear();

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`AGROVANTS S.A.S.\nCUIT 30-71832717-9\nCel.: 261 6508470\nFecha: ${dia2}/${mes2}/${año2}`, 113, 37.5, { align: 'left' });

        // Agregamos la palabra Empresa en la fila de abajo para los datos del cliente:
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Cliente: ', 10, 58);

        // Agregamos el nombre del propietario
        const propietarioControl = this.remitoForm?.get('propietarioFlight');
        if (propietarioControl) {
            const selectedPropietario = propietarioControl.value;
            const propietarioNombre = selectedPropietario?.alias || '';
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(propietarioNombre, 10, 63);
        }

        // Agregamos la palabra IVA DE CLIENTE
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('IVA: 10.5%', 10, 70);

        // Agregamos el cuit del propietario
        const propietarioControl2 = this.remitoForm?.get('propietarioFlight');
        if (propietarioControl2) {
            const selectedPropietario = propietarioControl2.value;
            const propietarioCuit = selectedPropietario?.cuit || '';
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`CUIT: ${propietarioCuit}`, 50, 70);
        }

        // Agregamos la palabra DOMICILIO (DE CLIENTE)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Domicilio: ', 92, 58);

        // Agregamos el DOMICLIO del propietario
        const propietarioControl3 = this.remitoForm?.get('propietarioFlight');
        if (propietarioControl3) {
            const selectedPropietario = propietarioControl3.value;
            const propietarioDomicilio = selectedPropietario?.domicilio || '';
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${propietarioDomicilio}`, 92, 63);
        }

        // Agregamos la palabra TELEFONO (DE CLIENTE)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Teléfono: ', 92, 70);

        // Agregamos el TELEFONO del propietario
        const propietarioControl4 = this.remitoForm?.get('propietarioFlight');
        if (propietarioControl4) {
            const selectedPropietario = propietarioControl4.value;
            const propietarioTelefono = selectedPropietario?.telefono || '';
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${propietarioTelefono}`, 110, 70);
        }

        //==========================================================================================
        // Introducimos el logo de la empresa
        const logoImg = new Image();
        logoImg.src = '../../../assets/img/agrovants.png';
        doc.addImage(logoImg, 'PNG', 10, 16, 77, 30);

        // Agregamos el listado de vuelos seleccionados
        const vuelosSeleccionados = this.selection.selected;
        const vuelosConRemitoEmitido = vuelosSeleccionados.filter(vuelo => vuelo.remitoEmitido !== null && vuelo.remitoEmitido !== '' && vuelo.remitoEmitido !== 'Ninguno');

        const columnas = [
            { header: 'Nº', dataKey: 'nroVuelo' },
            { header: 'Parcela', dataKey: 'cuadroVuelo' },
            { header: 'Fecha', dataKey: 'date' },
            { header: 'Cultivo', dataKey: 'cultivoVuelo' },
            { header: 'Superficie', dataKey: 'superficieVuelo' },
            { header: 'Precio/Ha', dataKey: 'precioHa' },
            { header: 'Subtotal', dataKey: 'subtotal' },
            { header: 'Piloto', dataKey: 'pilotoNombreCompleto' },
        ];

        const datos = vuelosSeleccionados.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((vuelo, index) => {
            return {
                nroVuelo: index + 1 as number | string,
                cuadroVuelo: vuelo.cuadroVuelo,
                date: vuelo.date,
                cultivoVuelo: vuelo.cultivoVuelo,
                superficieVuelo: vuelo.superficieVuelo,
                precioHa: `$ ${vuelo.precioHa.toLocaleString('es-AR')}`,
                subtotal: `$ ${(vuelo.precioHa * vuelo.superficieVuelo).toLocaleString('es-AR')}`,
                pilotoNombreCompleto: vuelo.pilotoNombreCompleto,
            };
        });

        // Calcula la posición inicial de la tabla
        const startY = 75;

        // Calcula la cantidad de filas necesarias para alcanzar la posición 220
        const filasNecesarias = Math.ceil((220 - startY) / 5);

        // Agrega filas vacías al arreglo datos
        for (let i = datos.length; i < filasNecesarias; i++) {
            datos.push({
                nroVuelo: '',
                cuadroVuelo: '',
                date: '',
                cultivoVuelo: '',
                superficieVuelo: '',
                precioHa: '',
                subtotal: '',
                pilotoNombreCompleto: '',
            });
        }

        // Calcula la altura total de la tabla
        const tableHeight = datos.length * 10;

        const textoRemito3 = localStorage.getItem('numeroRemito');

        autoTable(doc, {
            head: [columnas.map((columna) => columna.header)],
            body: datos.map((dato: any) => columnas.map((columna) => dato[columna.dataKey])),
            startY: startY,
            margin: { left: 8, bottom: 32 },
            theme: 'striped',
            tableWidth: 189,
            styles: {
                font: 'helvetica',
                fontSize: 10,
                textColor: [0, 0, 0],
                cellPadding: 1,
                lineWidth: 0.1,
                lineColor: [0, 0, 0],
                minCellHeight: 5,
            },
            headStyles: {
                fontSize: 10,
                textColor: [255, 255, 255],
                fillColor: [51, 102, 102],
                halign: 'center',
            },

            didDrawPage: function (data) {
                doc.setFontSize(10);
                const pageHeight = doc.internal.pageSize.height;
                const pageNumberText = `Página ${data.pageNumber}`;
                const remitoText = `Remito número: ${textoRemito3}`;
                const remitoWidth = doc.getTextWidth(remitoText);
                const pageNumberWidth = doc.getTextWidth(pageNumberText);
                const xRemito = 10;
                const xPageNumber = (doc.internal.pageSize.width - pageNumberWidth) / 2;
                const y = pageHeight - 5;
                doc.text(remitoText, xRemito, y);
                doc.text(pageNumberText, xPageNumber, y);
            }
        });

        //==========================================================================================
        // CALCULO CORREGIDO DE TOTALES - USANDO LOS DATOS ORIGINALES
        let totalHectareas = 0;
        let totalSinIva = 0;
        let totalConIva = 0;

        this.selection.selected.forEach((vuelo) => {
            totalHectareas += vuelo.superficieVuelo;
            totalSinIva += vuelo.precioHa * vuelo.superficieVuelo;
        });

        totalConIva = totalSinIva * 1.105;

        // Si todos los vuelos tienen el mismo precio por hectárea, tomamos ese valor
        const preciosUnicos = [...new Set(this.selection.selected.map(v => v.precioHa))];
        const precioUnitario = preciosUnicos.length === 1 ? preciosUnicos[0] : 0;

        //==========================================================================================
        // Dibujamos la fila penultima del pie de pagina
        autoTable(doc, {
            body: [
                [
                    {
                        content: '',
                        colSpan: 1,
                        rowSpan: 1,
                        styles: {
                            halign: 'center',
                            valign: 'middle',
                            fontSize: 12,
                            fontStyle: 'normal',
                            textColor: [0, 0, 0],
                            fillColor: [255, 255, 255],
                            cellPadding: 0,
                            lineWidth: 0.6,
                            lineColor: [0, 0, 0],
                            minCellHeight: 32,
                        },
                    },
                ],
            ],
            columns: [
                {
                    header: '',
                    dataKey: 'colpenultima',
                },
            ],
            startY: 245,
            margin: { top: 9, right: 8, bottom: 0, left: 8 },
            theme: 'plain',
            tableWidth: 189,
        });

        //==========================================================================================
        // Dibuja la celda con el total de hectáreas y el total de pesos (CORREGIDO)
        autoTable(doc, {
            body: [
                [
                    {
                        content: `TOTAL HECTÁREAS = ${totalHectareas.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}    TOTAL PESOS = $ ${totalSinIva.toLocaleString('es-AR')}`,
                        styles: {
                            fontSize: 10,
                            textColor: [0, 0, 0],
                            fillColor: [153, 204, 153],
                            halign: 'center',
                            lineWidth: 0.3,
                            lineColor: [0, 0, 0],
                        },
                    },
                ],
            ],
            columns: [
                { header: '', dataKey: 'col1' },
            ],
            startY: 252,
            margin: { left: (doc.internal.pageSize.width - 150) / 2 },
            theme: 'plain',
            tableWidth: 150,
        });

        //========================================================================================
        // Dibuja la celda con el PRECIO UNITARIO Y PRECIO MAS IVA (CORREGIDO)
        autoTable(doc, {
            body: [
                [
                    {
                        content: `PRECIO UNITARIO = $ ${precioUnitario.toLocaleString('es-AR')}    TOTAL $ + IVA = $ ${totalConIva.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        styles: {
                            fontSize: 10,
                            textColor: [0, 0, 0],
                            fillColor: [153, 204, 153],
                            halign: 'center',
                            lineWidth: 0.3,
                            lineColor: [0, 0, 0],
                        },
                    },
                ],
            ],
            columns: [
                { header: '', dataKey: 'col1' },
            ],
            startY: 264,
            margin: { left: (doc.internal.pageSize.width - 150) / 2 },
            theme: 'plain',
            tableWidth: 150,
        });

        //==========================================================================================
        // Dibujamos la fila ultima del pie de pagina
        autoTable(doc, {
            body: [
                [
                    {
                        content: 'WWW.AGROVANTS.COM',
                        colSpan: 1,
                        rowSpan: 1,
                        styles: {
                            font: 'helvetica',
                            halign: 'center',
                            valign: 'middle',
                            fontSize: 12,
                            fontStyle: 'bold',
                            textColor: [51, 102, 102],
                            fillColor: [255, 255, 255],
                            cellPadding: 0,
                            lineWidth: 0.6,
                            lineColor: [0, 0, 0],
                            minCellHeight: 10,
                        },
                    },
                ],
            ],
            columns: [
                {
                    header: '',
                    dataKey: 'colultima',
                },
            ],
            startY: 277,
            margin: { top: 9, right: 8, bottom: 0, left: 8 },
            theme: 'plain',
            tableWidth: 189,
        });

        // Agregamos la palabra WWWW.AGROVANTS.COM
        // doc.setFontSize(10);
        // doc.setFont('helvetica', 'bold');
        // doc.text('WWW.AGROVANTS.COM', 102, 284, { align: 'center' });

        const fechaActual = new Date();
        const dia = fechaActual.getDate().toString().padStart(2, '0');
        const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaActual.getFullYear().toString().slice(2);

        const textoRemito2 = localStorage.getItem('numeroRemito');

        // Generar nombre del archivo con el formato R0025-0038 (ya incluye la R)
        const nombreArchivo = `Remito_Nº${textoRemito2}_Fecha_${dia}-${mes}-${año}.pdf`;

        doc.save(nombreArchivo);

        this.selection.clear();
        this.router.navigate(['/admin/remito-admin']);
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();

        // Limpiar el número de remito temporal al salir del componente
        localStorage.removeItem('numeroRemito');
    }
}
