import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserFormComponent } from 'src/app/admin/components/user-form/user-form.component';
import { GlobalsService } from 'src/app/shared/services/globals.service';
import { cancelAlert, warningAlert, loadingAlert, successAlert, errorAlert } from '../../../shared/services/alerts';
import { ReportService } from '../../services/report.service';
import { MapService } from 'src/app/shared/services/map.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import domtoimage from 'dom-to-image-more';
import { ImprimirVueloService } from 'src/app/admin/services/imprimirVuelo.service';
import * as XLSXStyle from 'xlsx-js-style';
import Swal from 'sweetalert2';



declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => void;
    }
}

/**
 * Componente de diálogo para generar reportes PDF de vuelos.
 * 
 * Se abre como MatDialog desde OwnerComponent o FlightsComponent.
 * 
 * Funcionalidades:
 * - Selección de rango de fechas para filtrar vuelos
 * - Lista de vuelos seleccionados para el reporte
 * - Dos modos de generación:
 *   1. Sin imágenes: envía IDs de vuelos al backend y descarga el PDF
 *   2. Con imágenes: genera el PDF en el cliente con jsPDF + dom-to-image-more,
 *      capturando el mapa para cada vuelo como imagen
 * - Tabla resumen con: fecha, cuadro, cultivo, área, agroquímicos, coadyuvantes, totales
 * - Formato: Planilla de Buenas Prácticas Agrícolas (BPA)
 */
@Component({
  standalone: false,
    selector: 'app-report',
    templateUrl: './report.component.html'
})
export class ReportComponent implements OnInit {

    range = new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
        includeImages: new FormControl(false),
    });

    includeImages = false;


    userId: string;
    vuelos: any[];

    fromDate: any;
    flights: any[] = [];

    private unsubscribe$ = new Subject<void>();

    constructor(
        private mapService: MapService,
        public dialogRef: MatDialogRef<UserFormComponent>,
        private globalsService: GlobalsService,
        private reportService: ReportService,
        private imprimirVueloService: ImprimirVueloService,
        //@Inject(MAT_DIALOG_DATA) public userId: string,
        @Inject(MAT_DIALOG_DATA) public data: {
            userId: string, vuelos: any[], ownerDataList: any[], formatRangeDates: () => void
        },
    ) {
        this.userId = data.userId;
        this.vuelos = data.vuelos;
    }

    ngOnInit(): void {
        const includeImagesControl = this.range.get('includeImages');
        if (includeImagesControl) {
            includeImagesControl.valueChanges.subscribe((value) => {
                this.includeImages = value ?? false;
            });
        }
    }

    setFromDate(fromDate: any) {
        this.fromDate = fromDate;
    }


    getFlights(toDate: any) {
        if (toDate) {
            const req = {
                "fechaDesde": this.globalsService.formatDate(this.fromDate),
                "fechaHasta": this.globalsService.formatDate(toDate),
                "usuarioId": this.userId
            }
            this.reportService.getFlightsByDate(req)
                .pipe(takeUntil(this.unsubscribe$))
                .subscribe(flights => {
                    this.flights = flights.sort((a, b) => new Date(a.fechaVuelo).getTime() - new Date(b.fechaVuelo).getTime());
                    if (this.flights.length == 0) {
                        warningAlert("No se encontraron vuelos para el rango de fechas indicado");
                    }
                });
        }
    }


    removeFlight(i: any) {
        this.flights = this.flights.filter((flight) => flight.vueloId !== i);
    }

    cancel(): void {
        cancelAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this.dialogRef.close();
                }
            });
    }

    generateReport() {

        if (this.flights.length == 0) {

            warningAlert("Debe agregar algún vuelo para generar un informe.");

        } else {

            if (this.includeImages) {
                this.generateReportWithImages();
            } else {

                const dataFlights: any[] = [];
                this.flights.forEach(flight => { dataFlights.push(flight.vueloId); })
                const data = { "vuelos": dataFlights };


                loadingAlert('Generando informe...');


                this.reportService.generateReport(data)
                    .pipe(takeUntil(this.unsubscribe$))
                    .subscribe((res: any) => {
                        const blob = new Blob([res.body], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `PLANILLA BPA DE VUELOS DE ${this.flights[0].propietario} - ${new Date().getDate()}${this.getMonthString(new Date().getMonth())}${new Date().getFullYear().toString().slice(2)}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        this.dialogRef.close();
                        successAlert('Informe generado con éxito');
                    });
            }
        }
    }


    async generateReportWithImages() {
        Swal.fire({
            title: 'Generando reporte con imágenes de parcelas',
            text: 'Por favor espere, este proceso demorará según la cantidad de vuelos elegidos',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
        const doc = new jsPDF('l', 'mm', 'a4');

        // Agregar la tabla con todos los vuelos en la primera página
        const imgData = '../../../../assets/img/agrovants.png';
        doc.addImage(imgData, 'PNG', 15, 7, 33.625, 14);

        doc.setFontSize(12);
        const titulo = "Planilla de Buenas Prácticas Agrícolas";
        const subtitulo = `Vuelos seleccionados de: ${this.flights[0].propietario}`;

        const anchoPagina = doc.internal.pageSize.width;
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(titulo, (anchoPagina - doc.getTextWidth(titulo)) / 2, 12);
        doc.text(subtitulo, (anchoPagina - doc.getTextWidth(subtitulo)) / 2, 18);

        let finalY = 0;
        const table = this.getTableDataForAllFlights(this.flights);
        doc.autoTable({
            head: [table.head],
            body: table.body,
            theme: 'grid',
            startY: 25,
            styles: {
                fontSize: 8,
                cellWidth: 'wrap',
                overflow: 'linebreak',
                halign: 'left'
            },
            headStyles: {
                fontSize: 7,
                fillColor: [16, 71, 16],
                textColor: [255, 255, 255],
                valign: 'middle',
                halign: 'left'
            },
            columnStyles: table.columnStyles,
            didDrawPage: (data: { cursor: { y: number } }) => {
                finalY = data.cursor.y;
            }
        });

        // =========================================================================
        // AGENTS.MD RULE #1: THIS LOOP IS FRAGILE - DO NOT MODIFY WITHOUT READING
        // =========================================================================
        // The pattern MUST be:
        //   1. await map$.subscribe (remove layers except current)
        //   2. addFlightToMap(vuelo, true) — re-add current polygon
        //   3. waitForMapSettled + flyToBounds
        //   4. invalidateSize + waitForTilesLoaded
        //   5. domtoimage.toPng (capture)
        // NEVER remove the addFlightToMap call. NEVER move addFlightsToMap
        // outside this loop. NEVER use fire-and-forget map$.subscribe.
        // See AGENTS.md for full rules.
        // =========================================================================
        for (const [index, vuelo] of this.flights.entries()) {
            doc.addPage();

            // Eliminar todas las capas de vuelo excepto la actual
            await new Promise<void>((resolve) => {
                this.mapService.map$.subscribe((map: L.Map) => {
                    map.eachLayer((layer: any) => {
                        if (layer.id && layer.id !== vuelo.vueloId) {
                            map.removeLayer(layer);
                        }
                    });
                    resolve();
                });
            });

            // Re-agregar el polígono del vuelo actual (fue eliminado en la iteración anterior)
            this.mapService.addFlightToMap(vuelo, true);

            // Esperar un poco para asegurarte de que las capas se hayan eliminado
            await this.waitForMapSettled(300);

            // Ir a la posición y zoom del vuelo
            this.mapService.flyToBounds(vuelo.geometryVuelo.coordinates[0]);
            await this.waitForMapSettled(2000);

            // Guard: si el mapa no está disponible, abortar con mensaje claro
            const map = this.mapService.map;
            if (!map) {
                throw new Error('Mapa no disponible para generar el reporte');
            }

            // Forzar recálculo del tamaño del contenedor del mapa
            map.invalidateSize();

            // Esperar a que todas las teselas terminen de cargar
            await this.waitForTilesLoaded(3000);

            // Cerrar popups abiertos (ej. hover de polígonos o pines de OP)
            map.closePopup();
            map.eachLayer((layer: any) => {
                if (layer && layer.closeTooltip) {
                    layer.closeTooltip();
                }
            });

            // Capturar la imagen del vuelo
            const mapElement = map.getContainer();
            if (!mapElement) {
                throw new Error('Contenedor del mapa no disponible');
            }
            const dataUrl = await domtoimage.toPng(mapElement, {
                width: mapElement.offsetWidth,
                height: mapElement.offsetHeight,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                },
                filter: (node) => {
                    const el = node as HTMLElement;
                    return !(el.classList && el.classList.contains('no-print'));
                }
            });

            const imgData2 = '../../../../assets/img/agrovants.png';
            doc.addImage(imgData2, 'PNG', 15, 7, 33.625, 14);

            doc.setFontSize(12);
            const titulo2 = "Planilla de Buenas Prácticas Agrícolas";
            const subtitulo2 = vuelo.propietario;

            const anchoPagina2 = doc.internal.pageSize.width;
            doc.setFont("Helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(titulo2, (anchoPagina2 - doc.getTextWidth(titulo2)) / 2, 12);
            doc.text(subtitulo2, (anchoPagina2 - doc.getTextWidth(subtitulo2)) / 2, 18);

            let finalY2 = 25;
            const table2 = this.getTableData(vuelo);
            doc.autoTable({
                head: [table2.head],
                body: table2.body,
                theme: 'grid',
                startY: finalY2,
                styles: {
                    fontSize: 8,
                    cellWidth: 'wrap',
                    overflow: 'linebreak',
                    halign: 'left'
                },
                headStyles: {
                    fontSize: 7,
                    fillColor: [16, 71, 16],
                    textColor: [255, 255, 255],
                    valign: 'middle',
                    halign: 'left'
                },
                columnStyles: table2.columnStyles,
                didDrawPage: (data: { cursor: { y: number } }) => {
                    finalY2 = data.cursor.y;
                }
            });

            finalY2 += 10;

            const imagenHeight = 154;
            const imagenWidth = 231;

            let newHeight = imagenHeight;
            let newWidth = imagenWidth;
            if (finalY2 + newHeight > doc.internal.pageSize.height - 10) {
                newHeight = doc.internal.pageSize.height - finalY2 - 10;
                newWidth = (newHeight / imagenHeight) * imagenWidth;
            }

            const x = (anchoPagina2 - newWidth) / 2;
            doc.addImage(dataUrl, 'PNG', x, finalY2, newWidth, newHeight);
            doc.setDrawColor(128, 128, 128);
            doc.setLineWidth(0.3);
            doc.rect(x, finalY2, newWidth, newHeight, 'S');

            const text = "Imagen satelital de superficie de vuelo";
            const textX = x + 2;
            const textY = finalY2 + 5;

            doc.setFont("Helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(text, textX - 0.3, textY - 0.3);
            doc.text(text, textX + 0.3, textY - 0.3);
            doc.text(text, textX - 0.3, textY + 0.3);
            doc.text(text, textX + 0.3, textY + 0.3);

            doc.setTextColor(253, 178, 0);
            doc.text(text, textX, textY);
        }

        const pdfBlob = doc.output('blob');
        const fileURL = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = fileURL;

        a.download = `PLANILLA BPA CON DETALLES DE VUELOS DE ${this.flights[0].propietario} - ${new Date().getDate()}${this.getMonthString(new Date().getMonth())}${new Date().getFullYear().toString().slice(2)}.pdf`;




        //a.download = 'reporte_vuelos.pdf';
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(fileURL);
        }, 1000);
        setTimeout(() => {
            Swal.close();
            Swal.fire({
                title: 'Informe generado con éxito',
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            });
            this.dialogRef.close();
            this.data.formatRangeDates();
        }, 1000);
        } catch (error) {
            console.error('Error al generar el reporte con imágenes:', error);
            Swal.close();
            errorAlert('No se pudo generar el reporte con imágenes', 'Revisá la consola del navegador para más detalles.');
        } finally {
            // Restaurar todas las capas de vuelo aunque falle
            this.mapService.addFlightsToMap(this.flights);
        }
    }

    getMonthString(month: number) {
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        return months[month];
    }

    /**
     * Espera a que el mapa termine de moverse (evento 'moveend') o hasta un timeout.
     * Si no hay mapa disponible, resuelve inmediatamente.
     */
    private waitForMapSettled(timeout: number): Promise<void> {
        const map = this.mapService.map;
        if (!map) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                map.off('moveend', onMoveEnd);
                clearTimeout(timer);
                resolve();
            };
            const onMoveEnd = () => finish();
            const timer = setTimeout(finish, timeout);
            map.on('moveend', onMoveEnd);
        });
    }

    /**
     * Espera a que todas las capas de teselas terminen de cargar (evento 'load' del mapa)
     * o hasta un timeout. Esto asegura que las imágenes del mapa base estén completamente
     * renderizadas antes de capturar la imagen con dom-to-image.
     */
    private waitForTilesLoaded(timeout: number): Promise<void> {
        const map = this.mapService.map;
        if (!map) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                map.off('load', onLoad);
                resolve();
            };
            const onLoad = () => finish();
            const timer = setTimeout(finish, timeout);
            map.on('load', onLoad);
        });
    }
    private formatoProducto(nombre: any, dosis: any): string {
        if (nombre === null || nombre === undefined || String(nombre).trim() === '' || String(nombre).trim() === '-') {
            return '-';
        }
        return `${nombre}\n${dosis} lts/ha`;
    }

    private formatoProductoExcel(nombre: any, dosis: any): string {
        if (nombre === null || nombre === undefined || String(nombre).trim() === '' || String(nombre).trim() === '-') {
            return '-';
        }
        return `${nombre}\n${dosis} lts/ha`;
    }

    private esProductoReal(nombre: any): boolean {
        if (nombre === null || nombre === undefined) return false;
        const n = String(nombre).trim();
        return n !== '' && n !== '-';
    }

    private buildColumnStyles(cantCoad: number): any {
        const columnStyles: any = {
            0: { cellWidth: 23 },
            1: { cellWidth: 18 },
            2: { cellWidth: 18 },
            3: { cellWidth: 11 },
            4: { cellWidth: 17 }, 5: { cellWidth: 16 },
            6: { cellWidth: 17 }, 7: { cellWidth: 16 },
            8: { cellWidth: 17 }, 9: { cellWidth: 16 },
            10: { cellWidth: 17 }, 11: { cellWidth: 16 },
            12: { cellWidth: 18 }, 13: { cellWidth: 16 },
            14: { cellWidth: 13 }, 15: { cellWidth: 11 },
        };
        if (cantCoad >= 2) {
            columnStyles[4] = { cellWidth: 15 }; columnStyles[5] = { cellWidth: 14 };
            columnStyles[6] = { cellWidth: 15 }; columnStyles[7] = { cellWidth: 14 };
            columnStyles[8] = { cellWidth: 15 }; columnStyles[9] = { cellWidth: 14 };
            columnStyles[10] = { cellWidth: 15 }; columnStyles[11] = { cellWidth: 14 };
            columnStyles[12] = { cellWidth: 16 }; columnStyles[13] = { cellWidth: 14 };
            columnStyles[14] = { cellWidth: 16 }; columnStyles[15] = { cellWidth: 14 };
            columnStyles[16] = { cellWidth: 12 }; columnStyles[17] = { cellWidth: 10 };
        }
        return columnStyles;
    }

    exportToExcel() {
        if (this.flights.length === 0) {
            warningAlert('Debe agregar algún vuelo para generar la planilla de cálculo.');
            return;
        }

        const table = this.getTableDataForAllFlights(this.flights);
        const propietario = this.flights[0]?.propietario || '';

        // Reconstruir body con formato Excel (espacios en vez de \n)
        const cantCoad = this.flights.some((v: any) => this.esProductoReal(v.coad2)) ? 2 : 1;
        const bodyExcel = this.flights
            .sort((a, b) => new Date(a.fechaVuelo).getTime() - new Date(b.fechaVuelo).getTime())
            .map((vuelo) => {
                const fila: any[] = [
                    vuelo.fechaVuelo,
                    vuelo.cuadroVuelo,
                    vuelo.cultivoVuelo,
                    vuelo.superficieVuelo,
                    this.formatoProductoExcel(vuelo.agq1, vuelo.dosisagq1),
                    vuelo.totagq1,
                    this.formatoProductoExcel(vuelo.agq2, vuelo.dosisagq2),
                    vuelo.totagq2,
                    this.formatoProductoExcel(vuelo.agq3, vuelo.dosisagq3),
                    vuelo.totagq3,
                    this.formatoProductoExcel(vuelo.agq4, vuelo.dosisagq4),
                    vuelo.totagq4,
                    this.formatoProductoExcel(vuelo.coad1, vuelo.dosiscoad1),
                    vuelo.totcoad1,
                ];
                if (cantCoad >= 2) {
                    fila.push(
                        this.formatoProductoExcel(vuelo.coad2, vuelo.dosiscoad2),
                        this.esProductoReal(vuelo.coad2) ? vuelo.totcoad2 : '-'
                    );
                }
                fila.push(vuelo.totalH2OVuelo, vuelo.totalCaldoVuelo);
                return fila;
            });

        // Construir data con título + subtitulo + headers + body
        const data: any[][] = [
            ['Planilla de Buenas Prácticas Agrícolas'],
            [propietario],
            [],
            table.head,
            ...bodyExcel
        ];

        const ws = XLSXStyle.utils.aoa_to_sheet(data);

        // Combinar celdas para el título y subtítulo
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: table.head.length - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: table.head.length - 1 } },
        ];

        // Estilo título (sin fondo verde)
        ws['A1'].s = {
            font: { bold: true, sz: 14, color: { rgb: '000000' }, name: 'Calibri' },
            alignment: { horizontal: 'center', vertical: 'center' },
        };

        // Estilo subtítulo (sin fondo verde)
        ws['A2'].s = {
            font: { bold: true, sz: 12, color: { rgb: '000000' }, name: 'Calibri' },
            alignment: { horizontal: 'center', vertical: 'center' },
        };

        // Estilo headers (fila 4 = índice 3)
        const headerRow = 3;
        for (let c = 0; c < table.head.length; c++) {
            const cellRef = XLSXStyle.utils.encode_cell({ r: headerRow, c });
            if (ws[cellRef]) {
                ws[cellRef].s = {
                    font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
                    fill: { fgColor: { rgb: '104710' } },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } },
                    },
                };
            }
        }

        // Estilo body
        for (let r = headerRow + 1; r < data.length; r++) {
            const isEvenRow = (r - headerRow) % 2 === 0;
            for (let c = 0; c < table.head.length; c++) {
                const cellRef = XLSXStyle.utils.encode_cell({ r, c });
                if (ws[cellRef]) {
                    ws[cellRef].s = {
                        font: { sz: 9, name: 'Calibri', color: { rgb: '000000' } },
                        fill: { fgColor: { rgb: isEvenRow ? 'FFFFFF' : 'DCF0DC' } },
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                        border: {
                            top: { style: 'thin', color: { rgb: '000000' } },
                            bottom: { style: 'thin', color: { rgb: '000000' } },
                            left: { style: 'thin', color: { rgb: '000000' } },
                            right: { style: 'thin', color: { rgb: '000000' } },
                        },
                    };
                }
            }
        }

        // Ancho de columnas (totales y agroq más estrechos para que entre en A4 apaisado)
        const totalKeywords = ['Total', 'H2O', 'Caldo'];
        const agroqKeywords = ['Agroq', 'Coadyuv'];
        const colWidths = table.head.map((header: string, i: number) => {
            if (totalKeywords.some(k => header.includes(k))) {
                return { wch: 8 };
            }
            if (agroqKeywords.some(k => header.includes(k))) {
                return { wch: 11 };
            }
            let maxLen = header?.length || 10;
            bodyExcel.forEach((row: any[]) => {
                const cellLen = String(row[i] ?? '').length;
                if (cellLen > maxLen) maxLen = cellLen;
            });
            return { wch: maxLen + 2 };
        });
        ws['!cols'] = colWidths;

        const wb = XLSXStyle.utils.book_new();
        XLSXStyle.utils.book_append_sheet(wb, ws, 'Planilla BPA');

        const date = new Date();
        const fecha = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        XLSXStyle.writeFile(wb, `PLANILLA BPA ${propietario} - ${fecha}.xlsx`);
    }

    exportToGeoJson() {
        if (this.flights.length === 0) {
            warningAlert('Debe agregar algún vuelo para generar el archivo GeoJSON.');
            return;
        }
        const features = this.flights.map((vuelo: any, index: number) => ({
            type: 'Feature',
            geometry: vuelo.geometryVuelo,
            properties: {
                id: index + 1,
                fechaVuelo: vuelo.fechaVuelo,
                cuadroVuelo: vuelo.cuadroVuelo,
                cultivoVuelo: vuelo.cultivoVuelo,
                superficieVuelo: vuelo.superficieVuelo,
                propietario: vuelo.propietario,
                pilotoNombreCompleto: vuelo.pilotoNombreCompleto,
                tecnicoVuelo: vuelo.tecnicoVuelo,
                agq1: vuelo.agq1,
                dosisagq1: vuelo.dosisagq1,
                totagq1: vuelo.totagq1,
                agq2: vuelo.agq2,
                dosisagq2: vuelo.dosisagq2,
                totagq2: vuelo.totagq2,
                agq3: vuelo.agq3,
                dosisagq3: vuelo.dosisagq3,
                totagq3: vuelo.totagq3,
                agq4: vuelo.agq4,
                dosisagq4: vuelo.dosisagq4,
                totagq4: vuelo.totagq4,
                coad1: vuelo.coad1,
                dosiscoad1: vuelo.dosiscoad1,
                totcoad1: vuelo.totcoad1,
                coad2: vuelo.coad2,
                dosiscoad2: vuelo.dosiscoad2,
                totcoad2: vuelo.totcoad2,
                totalH2OVuelo: vuelo.totalH2OVuelo,
                totalCaldoVuelo: vuelo.totalCaldoVuelo,
                caldohaVuelo: vuelo.caldohaVuelo,
            }
        }));

        const geoJson = {
            type: 'FeatureCollection',
            features
        };

        const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/json' });
        const propietario = this.flights[0]?.propietario || '';
        const date = new Date();
        const fecha = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PLANILLA BPA ${propietario} - ${fecha}.geojson`;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    getTableDataForAllFlights(flights: any[]) {
        // Ordenar vuelos por fecha ascendente
        const sortedFlights = [...flights].sort(
            (a, b) => new Date(a.fechaVuelo).getTime() - new Date(b.fechaVuelo).getTime()
        );

        // Encabezado con "Fecha" como primera columna
        const cantCoad = sortedFlights.some((v: any) => this.esProductoReal(v.coad2)) ? 2 : 1;
        const head = [
            'Fecha',
            'Cuadro',
            'Cultivo',
            'Área',
            'Agroq. 1',
            'Total Agroq. 1',
            'Agroq. 2',
            'Total Agroq. 2',
            'Agroq. 3',
            'Total Agroq. 3',
            'Agroq. 4',
            'Total Agroq. 4',
            'Coadyuv.1',
            'Total Coadyuv.1',
        ];
        if (cantCoad >= 2) {
            head.push('Coadyuv.2', 'Total Coadyuv.2');
        }
        head.push('Total H2O', 'Total Caldo');

        // Cuerpo de la tabla en el nuevo orden
        const body = sortedFlights.map((vuelo) => {
            const fila = [
                vuelo.fechaVuelo,
                vuelo.cuadroVuelo,
                vuelo.cultivoVuelo,
                vuelo.superficieVuelo,
                this.formatoProducto(vuelo.agq1, vuelo.dosisagq1),
                vuelo.totagq1,
                this.formatoProducto(vuelo.agq2, vuelo.dosisagq2),
                vuelo.totagq2,
                this.formatoProducto(vuelo.agq3, vuelo.dosisagq3),
                vuelo.totagq3,
                this.formatoProducto(vuelo.agq4, vuelo.dosisagq4),
                vuelo.totagq4,
                this.formatoProducto(vuelo.coad1, vuelo.dosiscoad1),
                vuelo.totcoad1,
            ];
            if (cantCoad >= 2) {
                fila.push(
                    this.formatoProducto(vuelo.coad2, vuelo.dosiscoad2),
                    this.esProductoReal(vuelo.coad2) ? vuelo.totcoad2 : '-'
                );
            }
            fila.push(vuelo.totalH2OVuelo, vuelo.totalCaldoVuelo);
            return fila;
        });

        return { head, body, columnStyles: this.buildColumnStyles(cantCoad) };
    }

    getTableData(vueloData: any) {
        const cantCoad = this.esProductoReal(vueloData.coad2) ? 2 : 1;
        const head = [
            'Fecha',
            'Cuadro',
            'Cultivo',
            'Área',
            'Agroq. 1',
            'Total Agroq. 1',
            'Agroq. 2',
            'Total Agroq. 2',
            'Agroq. 3',
            'Total Agroq. 3',
            'Agroq. 4',
            'Total Agroq. 4',
            'Coadyuv.1',
            'Total Coadyuv.1',
        ];
        if (cantCoad >= 2) {
            head.push('Coadyuv.2', 'Total Coadyuv.2');
        }
        head.push('Total H2O', 'Total Caldo');

        const body = [[
            vueloData.fechaVuelo,
            vueloData.cuadroVuelo,
            vueloData.cultivoVuelo,
            vueloData.superficieVuelo,
            this.formatoProducto(vueloData.agq1, vueloData.dosisagq1),
            vueloData.totagq1,
            this.formatoProducto(vueloData.agq2, vueloData.dosisagq2),
            vueloData.totagq2,
            this.formatoProducto(vueloData.agq3, vueloData.dosisagq3),
            vueloData.totagq3,
            this.formatoProducto(vueloData.agq4, vueloData.dosisagq4),
            vueloData.totagq4,
            this.formatoProducto(vueloData.coad1, vueloData.dosiscoad1),
            vueloData.totcoad1,
        ]];
        if (cantCoad >= 2) {
            body[0].push(
                this.formatoProducto(vueloData.coad2, vueloData.dosiscoad2),
                this.esProductoReal(vueloData.coad2) ? vueloData.totcoad2 : '-'
            );
        }
        body[0].push(vueloData.totalH2OVuelo, vueloData.totalCaldoVuelo);

        return { head, body, columnStyles: this.buildColumnStyles(cantCoad) };
    }


}
