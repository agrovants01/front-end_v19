import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserFormComponent } from 'src/app/admin/components/user-form/user-form.component';
import { GlobalsService } from 'src/app/shared/services/globals.service';
import { cancelAlert, warningAlert, loadingAlert, successAlert } from '../../../shared/services/alerts';
import { ReportService } from '../../services/report.service';
import { MapService } from 'src/app/shared/services/map.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import domtoimage from 'dom-to-image-more';
import { ImprimirVueloService } from 'src/app/admin/services/imprimirVuelo.service';
import Swal from 'sweetalert2';



declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => void;
    }
}

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
        console.log(this.vuelos);
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
            columnStyles: {
                0: { cellWidth: 23 },
                1: { cellWidth: 18 },
                2: { cellWidth: 18 },
                3: { cellWidth: 11 },// area
                4: { cellWidth: 17 },// agroq 1
                5: { cellWidth: 16 },// total agroq 1
                6: { cellWidth: 17 },// agroq 2
                7: { cellWidth: 16 },// total agroq 2
                8: { cellWidth: 17 },// agroq 3
                9: { cellWidth: 16 },// total agroq 3
                10: { cellWidth: 17 },// agroq 4
                11: { cellWidth: 16 },// total agroq 4
                12: { cellWidth: 18 },// coadyuv
                13: { cellWidth: 16 },// total coadyuv
                14: { cellWidth: 13 },// total h2o
                15: { cellWidth: 11 },// total caldo
            },
            didDrawPage: (data: { cursor: { y: number } }) => {
                finalY = data.cursor.y;
            }
        });

        // Agregar las imágenes de los vuelos
        for (const [index, vuelo] of this.flights.entries()) {
            doc.addPage();

            // Eliminar todas las capas de vuelo excepto la actual
            this.mapService.map$.subscribe((map: L.Map) => {
                map.eachLayer((layer: any) => {
                    if (layer.id && layer.id !== vuelo.vueloId) {
                        map.removeLayer(layer);
                    }
                });
            });

            // Esperar un poco para asegurarte de que las capas se hayan eliminado
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 500);
            });

            // Ir a la posición y zoom del vuelo
            await new Promise((resolve) => {
                this.mapService.flyToBounds(vuelo.geometryVuelo.coordinates[0]);
                // Esperar a que el mapa termine de moverse

                setTimeout(async () => {
                    // Capturar la imagen del vuelo
                    const mapElement = this.mapService.map.getContainer();
                    const dataUrl = await domtoimage.toPng(mapElement, {
                        width: mapElement.offsetWidth,
                        height: mapElement.offsetHeight,
                        style: {
                            transform: 'scale(1)',
                            transformOrigin: 'top left'
                        },
                        filter: (node) => {
                            if (!(node instanceof HTMLElement)) return true;
                            return !node.classList.contains('no-print');
                        }
                    });

                    const imgData = '../../../../assets/img/agrovants.png';
                    doc.addImage(imgData, 'PNG', 15, 7, 33.625, 14);

                    doc.setFontSize(12);
                    const titulo = "Planilla de Buenas Prácticas Agrícolas";
                    const subtitulo = vuelo.propietario;

                    const anchoPagina = doc.internal.pageSize.width;
                    doc.setFont("Helvetica", "bold");
                    doc.setTextColor(0, 0, 0);
                    doc.text(titulo, (anchoPagina - doc.getTextWidth(titulo)) / 2, 12);
                    doc.text(subtitulo, (anchoPagina - doc.getTextWidth(subtitulo)) / 2, 18);

                    let finalY = 25;
                    const table = this.getTableData(vuelo);
                    doc.autoTable({
                        head: [table.head],
                        body: table.body,
                        theme: 'grid',
                        startY: finalY,
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
                        columnStyles: {
                            0: { cellWidth: 23 },
                            1: { cellWidth: 18 },
                            2: { cellWidth: 18 },
                            3: { cellWidth: 11 },// area
                            4: { cellWidth: 17 },// agroq 1
                            5: { cellWidth: 16 },// total agroq 1
                            6: { cellWidth: 17 },// agroq 2
                            7: { cellWidth: 16 },// total agroq 2
                            8: { cellWidth: 17 },// agroq 3
                            9: { cellWidth: 16 },// total agroq 3
                            10: { cellWidth: 17 },// agroq 4
                            11: { cellWidth: 16 },// total agroq 4
                            12: { cellWidth: 18 },// coadyuv
                            13: { cellWidth: 16 },// total coadyuv
                            14: { cellWidth: 13 },// total h2o
                            15: { cellWidth: 11 },// total caldo
                        },
                        didDrawPage: (data: { cursor: { y: number } }) => {
                            finalY = data.cursor.y;
                        }
                    });

                    finalY += 10;

                    const imagenHeight = 154;
                    const imagenWidth = 231;

                    let newHeight = imagenHeight;
                    let newWidth = imagenWidth;
                    if (finalY + newHeight > doc.internal.pageSize.height - 10) {
                        newHeight = doc.internal.pageSize.height - finalY - 10;
                        newWidth = (newHeight / imagenHeight) * imagenWidth;
                    }

                    const x = (anchoPagina - newWidth) / 2;
                    doc.addImage(dataUrl, 'PNG', x, finalY, newWidth, newHeight);
                    doc.setDrawColor(128, 128, 128);
                    doc.setLineWidth(0.3);
                    doc.rect(x, finalY, newWidth, newHeight, 'S');

                    const text = "Imagen satelital de superficie de vuelo";
                    const textX = x + 2;
                    const textY = finalY + 5;

                    doc.setFont("Helvetica", "bold");
                    doc.setTextColor(0, 0, 0);
                    doc.text(text, textX - 0.3, textY - 0.3);
                    doc.text(text, textX + 0.3, textY - 0.3);
                    doc.text(text, textX - 0.3, textY + 0.3);
                    doc.text(text, textX + 0.3, textY + 0.3);

                    doc.setTextColor(253, 178, 0);
                    doc.text(text, textX, textY);

                    // Agregar de nuevo todas las capas de vuelo
                    this.mapService.addFlightsToMap(this.flights);

                    resolve(null);

                }, 1500);
                //================================================================================

            });
        }

        const pdfBlob = doc.output('blob');
        const fileURL = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = fileURL;

        a.download = `PLANILLA BPA CON DETALLES DE VUELOS DE ${this.flights[0].propietario} - ${new Date().getDate()}${this.getMonthString(new Date().getMonth())}${new Date().getFullYear().toString().slice(2)}.pdf`;




        //a.download = 'reporte_vuelos.pdf';
        a.click();
        setTimeout(() => {
            Swal.close();
            Swal.fire({
                title: 'Generación de reporte finalizada',
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            });
            this.dialogRef.close();
            Swal.fire({
                title: 'Informe generado con éxito',
                icon: 'success',
                confirmButtonText: 'Aceptar',
                showConfirmButton: true
            });
            this.data.formatRangeDates();
        }, 1000);
        URL.revokeObjectURL(fileURL);
    }

    getMonthString(month: number) {
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        return months[month];
    }
    getTableDataForAllFlights(flights: any[]) {
        // Ordenar vuelos por fecha ascendente
        const sortedFlights = [...flights].sort(
            (a, b) => new Date(a.fechaVuelo).getTime() - new Date(b.fechaVuelo).getTime()
        );

        // Encabezado con "Fecha" como primera columna
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
            'Coadyuv.',
            'Total Coadyuv.',
            'Total H2O',
            'Total Caldo'
        ];

        // Cuerpo de la tabla en el nuevo orden
        const body = sortedFlights.map((vuelo) => [
            vuelo.fechaVuelo,
            vuelo.cuadroVuelo,
            vuelo.cultivoVuelo,
            vuelo.superficieVuelo,
            vuelo.agq1 + '\n' + vuelo.dosisagq1 + ' lts/ha',
            vuelo.totagq1,
            vuelo.agq2 + '\n' + vuelo.dosisagq2 + ' lts/ha',
            vuelo.totagq2,
            vuelo.agq3 + '\n' + vuelo.dosisagq3 + ' lts/ha',
            vuelo.totagq3,
            vuelo.agq4 + '\n' + vuelo.dosisagq4 + ' lts/ha',
            vuelo.totagq4,
            vuelo.coad1 + '\n' + vuelo.dosiscoad1 + ' lts/ha',
            vuelo.totcoad1,
            vuelo.totalH2OVuelo,
            vuelo.totalCaldoVuelo,
        ]);

        return { head, body };
    }

    getTableData(vueloData: any) {
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
            'Coadyuv.',
            'Total Coadyuv.',
            'Total H2O',
            'Total Caldo'
        ];

        const body = [[
            vueloData.fechaVuelo,
            vueloData.cuadroVuelo,
            vueloData.cultivoVuelo,
            vueloData.superficieVuelo,
            vueloData.agq1 + '\n' + vueloData.dosisagq1 + ' lts/ha',
            vueloData.totagq1,
            vueloData.agq2 + '\n' + vueloData.dosisagq2 + ' lts/ha',
            vueloData.totagq2,
            vueloData.agq3 + '\n' + vueloData.dosisagq3 + ' lts/ha',
            vueloData.totagq3,
            vueloData.agq4 + '\n' + vueloData.dosisagq4 + ' lts/ha',
            vueloData.totagq4,
            vueloData.coad1 + '\n' + vueloData.dosiscoad1 + ' lts/ha',
            vueloData.totcoad1,
            vueloData.totalH2OVuelo,
            vueloData.totalCaldoVuelo,
        ]];

        return { head, body };
    }


}
