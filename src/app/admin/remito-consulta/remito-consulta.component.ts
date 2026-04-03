import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { AdminService } from '../services/admin.service';
import { OwnerService } from 'src/app/pages/services/owner.service';
import { OwnerListInput } from 'src/app/pages/owner/owner.interface';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    standalone: false,
    selector: 'app-remito-consulta',
    templateUrl: './remito-consulta.component.html',
    styleUrls: ['./remito-consulta.component.css']
})
export class RemitoConsultaComponent implements OnInit, OnDestroy {
    private unsubscribe$ = new Subject<void>();

    @ViewChild(MatSort) sort!: MatSort;

    ownersList: OwnerListInput[] = [];
    cargando = false;
    cargandoDetalle = false;
    cargandoPdf = false;
    propietarioSeleccionado: string | null = null;

    // Datos y tabla
    remitos: any[] = [];
    dataSource = new MatTableDataSource<any>();

    // Variables para el detalle del remito
    remitoSeleccionado: any = null;
    vuelosDetalle: any[] = [];
    totalHectareasDetalle: number = 0;
    totalSinIvaDetalle: number = 0;
    totalConIvaDetalle: number = 0;

    // Columnas para tablas
    columnasDisplay: string[] = [
        'numero',
        'fecha',
        'totalHa',
        'totalSinIva',
        'totalConIva',
        'acciones'
    ];

    columnasVuelos = ['nro', 'cuadro', 'fecha', 'cultivo', 'superficie', 'precio', 'subtotal', 'piloto'];

    remitoForm!: FormGroup;

    constructor(
        private ownerService: OwnerService,
        private adminService: AdminService,
        private fb: FormBuilder
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.obtenerPropietarios();
    }

    ngAfterViewInit(): void {
        this.dataSource.sort = this.sort;
    }

    /** 🔹 Inicializar formulario */
    initForm(): void {
        this.remitoForm = this.fb.group({
            fechaInicio: [null],
            fechaFin: [null]
        });
    }

    /** 🔹 Obtener listado de propietarios */
    obtenerPropietarios(): void {
        this.cargando = true;
        this.ownerService
            .getOwnersList()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe({
                next: (owners: OwnerListInput[]) => {
                    this.ownersList = owners.sort((a, b) =>
                        a.nombrePropietario.localeCompare(b.nombrePropietario)
                    );
                    this.cargando = false;
                },
                error: (err) => {
                    console.error('❌ Error al obtener propietarios:', err);
                    this.cargando = false;
                }
            });
    }

    /** 🔹 Calcular total con IVA (10.5%) */
    calcularTotalConIva(totalSinIva: number): number {
        if (!totalSinIva || isNaN(totalSinIva)) return 0;
        return totalSinIva * 1.105;
    }

    /** 🔹 Cuando se selecciona un propietario */
    onPropietarioSelected(event?: any): void {
        if (event) {
            this.propietarioSeleccionado = event.value;
        }

        if (this.propietarioSeleccionado) {
            this.obtenerRemitos();
            this.cerrarDetalle();
        } else {
            this.remitos = [];
            this.dataSource.data = [];
        }
    }

    /** 🔹 Método principal de búsqueda */
    obtenerRemitos(): void {
        if (!this.propietarioSeleccionado) {
            console.warn('⚠️ No hay propietario seleccionado');
            return;
        }

        this.cargando = true;

        const fechaInicio = this.remitoForm.get('fechaInicio')?.value;
        const fechaFin = this.remitoForm.get('fechaFin')?.value;

        let desde: string | undefined;
        let hasta: string | undefined;

        if (fechaInicio) {
            desde = this.formatDate(fechaInicio);
        }

        if (fechaFin) {
            hasta = this.formatDate(fechaFin);
        }

        this.adminService
            .getRemitosPorPropietario(this.propietarioSeleccionado, desde, hasta)
            .subscribe({
                next: (data) => {
                    // Ordenar por defecto: fecha ascendente, luego número de remito ascendente
                    this.remitos = this.ordenarRemitosPorDefecto(data || []);
                    this.dataSource.data = this.remitos;

                    this.cargando = false;
                },
                error: (err) => {
                    console.error('❌ Error al obtener remitos:', err);
                    this.cargando = false;
                    this.remitos = [];
                    this.dataSource.data = [];
                }
            });
    }

    /** 🔹 Ordenamiento por defecto: fecha ascendente, luego número de remito */
    private ordenarRemitosPorDefecto(remitos: any[]): any[] {
        return (remitos || []).sort((a, b) => {
            // 1. Primero por fecha ascendente
            const fechaA = new Date(a.fechaRemito || 0).getTime();
            const fechaB = new Date(b.fechaRemito || 0).getTime();

            if (fechaA !== fechaB) {
                return fechaA - fechaB;
            }

            // 2. Si las fechas son iguales, ordenar por número de remito ascendente
            return this.compararNumeroRemito(a.numRemito, b.numRemito);
        });
    }

    /** 🔹 Método para comparar números de remito */
    private compararNumeroRemito(numA: string, numB: string): number {
        // Para formato "0025-0047"
        const partesA = (numA || '0000-0000').split('-');
        const partesB = (numB || '0000-0000').split('-');

        if (partesA.length >= 2 && partesB.length >= 2) {
            // Comparar parte izquierda
            const izqA = parseInt(partesA[0]) || 0;
            const izqB = parseInt(partesB[0]) || 0;

            if (izqA !== izqB) {
                return izqA - izqB;
            }

            // Comparar parte derecha
            const derA = parseInt(partesA[1]) || 0;
            const derB = parseInt(partesB[1]) || 0;

            return derA - derB;
        }

        // Fallback: comparación alfabética
        return (numA || '').localeCompare(numB || '');
    }

    /** 🔹 Ordenar datos cuando se hace clic en las flechas */
    ordenarDatos(sort: Sort): void {
        if (!sort.active || sort.direction === '') {
            // Si no hay orden, usar el orden por defecto
            this.dataSource.data = this.ordenarRemitosPorDefecto([...this.remitos]);
            return;
        }

        this.dataSource.data = [...this.remitos].sort((a, b) => {
            const isAsc = sort.direction === 'asc';

            switch (sort.active) {
                case 'numero':
                    const comparacionNumero = this.compararNumeroRemito(a.numRemito, b.numRemito);
                    return isAsc ? comparacionNumero : -comparacionNumero;

                case 'fecha':
                    const fechaA = new Date(a.fechaRemito || 0).getTime();
                    const fechaB = new Date(b.fechaRemito || 0).getTime();
                    return isAsc ? fechaA - fechaB : fechaB - fechaA;

                case 'totalHa':
                    return isAsc ? (a.totalHectareas || 0) - (b.totalHectareas || 0)
                        : (b.totalHectareas || 0) - (a.totalHectareas || 0);

                case 'totalSinIva':
                    return isAsc ? (a.totalSinIva || 0) - (b.totalSinIva || 0)
                        : (b.totalSinIva || 0) - (a.totalSinIva || 0);

                case 'totalConIva':
                    const totalConIvaA = this.calcularTotalConIva(a.totalSinIva || 0);
                    const totalConIvaB = this.calcularTotalConIva(b.totalSinIva || 0);
                    return isAsc ? totalConIvaA - totalConIvaB : totalConIvaB - totalConIvaA;

                default:
                    return 0;
            }
        });
    }

    /** 🔹 Ver detalle de un remito */
    verRemito(remito: any): void {
        this.cargandoDetalle = true;
        this.remitoSeleccionado = null;
        this.vuelosDetalle = [];

        this.adminService.getRemitoPorNumero(remito.numRemito).subscribe({
            next: (remitoCompleto) => {
                this.remitoSeleccionado = remitoCompleto;

                // CORRECCIÓN PRINCIPAL: Ordenar los vuelos por fecha ascendente (más antiguo primero)
                this.vuelosDetalle = (remitoCompleto.Vuelos || []).sort((a: any, b: any) => {
                    const fechaA = new Date(a.date || 0).getTime();
                    const fechaB = new Date(b.date || 0).getTime();
                    return fechaA - fechaB; // Orden ascendente
                });

                this.calcularTotalesDetalle();
                this.cargandoDetalle = false;

                if (remitoCompleto.anulado) {
                }
            },
            error: (error) => {
                console.error('❌ Error al cargar detalles del remito:', error);
                this.cargandoDetalle = false;
                alert('Error al cargar los detalles del remito.');
            }
        });
    }

    /** 🔹 Calcular totales del detalle */
    calcularTotalesDetalle(): void {
        this.totalHectareasDetalle = this.vuelosDetalle.reduce((t, v) => t + (v.superficieVuelo || 0), 0);
        this.totalSinIvaDetalle = this.vuelosDetalle.reduce((t, v) => t + ((v.precioHa || 0) * (v.superficieVuelo || 0)), 0);
        this.totalConIvaDetalle = this.totalSinIvaDetalle * 1.105;
    }

    /** 🔹 Cerrar el detalle del remito */
    cerrarDetalle(): void {
        this.remitoSeleccionado = null;
        this.vuelosDetalle = [];
        this.totalHectareasDetalle = 0;
        this.totalSinIvaDetalle = 0;
        this.totalConIvaDetalle = 0;
    }

    /** 🔹 Formatear fecha a YYYY-MM-DD */
    private formatDate(date: Date): string {
        if (!date) return '';
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
    }

    /** 🔹 Reimprimir remito (método completo) */
    // reimprimirRemito(remito: any): void {
    //     if (!remito) return;

    //     this.cargandoPdf = true;
    //     const doc = new jsPDF('p', 'mm', 'a4');

    //     // CORRECCIÓN: Ordenar los vuelos por fecha ascendente para el PDF
    //     const vuelos = (remito.Vuelos || []).sort((a: any, b: any) => {
    //         const fechaA = new Date(a.date || 0).getTime();
    //         const fechaB = new Date(b.date || 0).getTime();
    //         return fechaA - fechaB; // Orden ascendente
    //     });

    //     // ==========================================================================================
    //     // Cabecera principal (igual que en la versión anterior)
    //     autoTable(doc, {
    //         body: [[{ content: '', styles: { minCellHeight: 44, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
    //         startY: 9,
    //         margin: { top: 9, right: 8, left: 8 },
    //         theme: 'plain',
    //         tableWidth: 189,
    //     });

    //     autoTable(doc, {
    //         body: [[{ content: '', styles: { minCellHeight: 44, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
    //         startY: 9,
    //         margin: { left: 8 },
    //         theme: 'plain',
    //         tableWidth: 83,
    //     });

    //     autoTable(doc, {
    //         body: [[{ content: '', styles: { minCellHeight: 23, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
    //         startY: 9,
    //         margin: { left: 91 },
    //         theme: 'plain',
    //         tableWidth: 20,
    //     });

    //     autoTable(doc, {
    //         body: [[{ content: '', styles: { minCellHeight: 21, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
    //         startY: 32,
    //         margin: { left: 91 },
    //         theme: 'plain',
    //         tableWidth: 20,
    //     });

    //     autoTable(doc, {
    //         body: [[{ content: '', styles: { minCellHeight: 23, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
    //         startY: 9,
    //         margin: { left: 111 },
    //         theme: 'plain',
    //         tableWidth: 86,
    //     });

    //     // ==========================================================================================
    //     // Segunda fila de datos de empresa
    //     autoTable(doc, {
    //         body: [[{ content: '', styles: { minCellHeight: 19, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
    //         startY: 53,
    //         margin: { left: 8 },
    //         theme: 'plain',
    //         tableWidth: 189,
    //     });

    //     // ==========================================================================================
    //     // Logo + encabezado
    //     const logoImg = new Image();
    //     logoImg.src = '../../../assets/img/agrovants.png';
    //     doc.addImage(logoImg, 'PNG', 10, 16, 77, 30);

    //     doc.setFont('helvetica', 'bold');
    //     doc.setFontSize(22);
    //     doc.text('REMITO', 137, 18);

    //     // 🔴 AGREGAR "HISTÓRICO" EN ROJO SI EL REMITO ESTÁ ANULADO
    //     if (remito.anulado) {
    //         doc.setTextColor(255, 0, 0); // Color rojo: RGB(255, 0, 0)
    //         doc.setFontSize(16);
    //         doc.text('HISTÓRICO', 137, 26); // Justo debajo de "REMITO"
    //         doc.setTextColor(0, 0, 0); // Volver a color negro
    //     }

    //     doc.setFontSize(40);
    //     doc.text('R', 96, 25);

    //     doc.setFontSize(7.5);
    //     doc.text('DOCUMENTO\nNO VÁLIDO\nCOMO\nFACTURA', 101, 39, { align: 'center' });

    //     // Fecha del remito
    //     const fechaStr = remito.fechaRemito?.split('T')[0] || '';
    //     const [anio, mes, dia] = fechaStr.split('-');
    //     const fechaRemito = `${dia}/${mes}/${anio}`;

    //     doc.setFontSize(11);
    //     doc.setFont('helvetica', 'normal');
    //     doc.text(`AGROVANTS S.A.S.\nCUIT 30-71832717-9\nCel.: 261 6508470\nFecha: ${fechaRemito}`, 113, 37.5);

    //     const numRemito = remito.numRemito || '---';
    //     doc.setFontSize(10);
    //     doc.text(`Remito número: ${numRemito}`, 150, 30);

    //     // ==========================================================================================
    //     // Datos del cliente
    //     const cliente = remito.fk_Usuario || {};

    //     doc.setFont('helvetica', 'bold');
    //     doc.setFontSize(10);
    //     doc.text('Cliente: ', 10, 58);
    //     doc.setFont('helvetica', 'normal');
    //     doc.text(cliente.aliasUsuario || `${cliente.nombreUsuario || ''} ${cliente.apellidoUsuario || ''}`.trim(), 10, 63);

    //     doc.setFont('helvetica', 'normal');
    //     doc.text('IVA: 10.5%', 10, 70);
    //     doc.text(`CUIT: ${cliente.cuitUsuario || '---'}`, 50, 70);

    //     doc.setFont('helvetica', 'bold');
    //     doc.text('Domicilio: ', 92, 58);
    //     doc.setFont('helvetica', 'normal');
    //     doc.text(cliente.domicilioUsuario || '---', 92, 63);

    //     doc.setFont('helvetica', 'bold');
    //     doc.text('Teléfono: ', 92, 70);
    //     doc.setFont('helvetica', 'normal');
    //     doc.text(cliente.telefonoUsuario || '---', 110, 70);

    //     // ==========================================================================================
    //     // Tabla de vuelos
    //     const columnas = [
    //         { header: 'Nº', dataKey: 'nroVuelo' },
    //         { header: 'Parcela', dataKey: 'cuadroVuelo' },
    //         { header: 'Fecha', dataKey: 'fecha' },
    //         { header: 'Cultivo', dataKey: 'cultivo' },
    //         { header: 'Superficie', dataKey: 'superficie' },
    //         { header: 'Precio/Ha', dataKey: 'precioHa' },
    //         { header: 'Subtotal', dataKey: 'subtotal' },
    //         { header: 'Piloto', dataKey: 'piloto' },
    //     ];

    //     const datos = vuelos.map((v: any, i: number) => {
    //         const fechaVuelo = v.date ? new Date(v.date).toLocaleDateString('es-AR') : '';
    //         return {
    //             nroVuelo: i + 1,
    //             cuadroVuelo: v.cuadroVuelo || '',
    //             fecha: fechaVuelo,
    //             cultivo: v.cultivoVuelo || '',
    //             superficie: (v.superficieVuelo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }),
    //             precioHa: `$ ${v.precioHa?.toLocaleString('es-AR') || '0'}`,
    //             subtotal: `$ ${(v.precioHa * v.superficieVuelo || 0).toLocaleString('es-AR')}`,
    //             piloto: v.pilotoNombreCompleto || '',
    //         };
    //     });

    //     // Fijar cantidad de filas
    //     const startY = 75;
    //     const filasNecesarias = 26;
    //     for (let i = datos.length; i < filasNecesarias; i++) {
    //         datos.push({ nroVuelo: '', cuadroVuelo: '', fecha: '', cultivo: '', superficie: '', precioHa: '', subtotal: '', piloto: '' });
    //     }

    //     autoTable(doc, {
    //         head: [columnas.map(c => c.header)],
    //         body: datos.map((d: any) => columnas.map(c => d[c.dataKey])),
    //         startY,
    //         margin: { left: 8, bottom: 32 },
    //         theme: 'striped',
    //         tableWidth: 189,
    //         styles: {
    //             font: 'helvetica',
    //             fontSize: 10,
    //             textColor: [0, 0, 0],
    //             cellPadding: 1,
    //             lineWidth: 0.1,
    //             lineColor: [0, 0, 0],
    //             minCellHeight: 5,
    //         },
    //         headStyles: {
    //             fontSize: 10,
    //             textColor: [255, 255, 255],
    //             fillColor: [51, 102, 102],
    //             halign: 'center',
    //         },
    //         didDrawPage: function (data) {
    //             const pageHeight = doc.internal.pageSize.height;
    //             const pageNumberText = `Página ${data.pageNumber}`;
    //             const remitoText = `Remito número: ${numRemito}`;
    //             const pageNumberWidth = doc.getTextWidth(pageNumberText);
    //             const xPageNumber = (doc.internal.pageSize.width - pageNumberWidth) / 2;
    //             const y = pageHeight - 5;
    //             doc.setFontSize(10);
    //             doc.text(remitoText, 10, y);
    //             doc.text(pageNumberText, xPageNumber, y);
    //         }
    //     });

    //     // ==========================================================================================
    //     // Totales - VERSIÓN CORREGIDA
    //     const totalHa = vuelos.reduce((t: number, v: any) => t + (v.superficieVuelo || 0), 0);
    //     const totalSinIva = vuelos.reduce((t: number, v: any) => t + ((v.precioHa || 0) * (v.superficieVuelo || 0)), 0);
    //     const totalConIva = totalSinIva * 1.105;

    //     // Extraer precios únicos como números
    //     const preciosUnicos = [...new Set(vuelos.map((v: any) => v.precioHa || 0))];
    //     const precioUnitario: number = preciosUnicos.length === 1 ? Number(preciosUnicos[0]) : 0;

    //     autoTable(doc, {
    //         body: [[{ content: '', styles: { minCellHeight: 32, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
    //         startY: 245,
    //         margin: { left: 8 },
    //         theme: 'plain',
    //         tableWidth: 189,
    //     });

    //     autoTable(doc, {
    //         body: [[{
    //             content: `TOTAL HECTÁREAS = ${totalHa.toLocaleString('es-AR', { minimumFractionDigits: 2 })}    TOTAL PESOS = $ ${totalSinIva.toLocaleString('es-AR')}`,
    //             styles: { fillColor: [153, 204, 153], halign: 'center', fontSize: 10 }
    //         }]],
    //         startY: 252,
    //         margin: { left: (doc.internal.pageSize.width - 150) / 2 },
    //         theme: 'plain',
    //         tableWidth: 150,
    //     });

    //     autoTable(doc, {
    //         body: [[{
    //             content: `PRECIO UNITARIO = $ ${(precioUnitario || 0).toLocaleString('es-AR')}    TOTAL $ + IVA = $ ${totalConIva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    //             styles: { fillColor: [153, 204, 153], halign: 'center', fontSize: 10 }
    //         }]],
    //         startY: 264,
    //         margin: { left: (doc.internal.pageSize.width - 150) / 2 },
    //         theme: 'plain',
    //         tableWidth: 150,
    //     });

    //     // ==========================================================================================
    //     // Fila final
    //     autoTable(doc, {
    //         body: [[{
    //             content: 'WWW.AGROVANTS.COM',
    //             styles: {
    //                 font: 'helvetica',
    //                 halign: 'center',
    //                 valign: 'middle',
    //                 fontSize: 12,
    //                 fontStyle: 'bold',
    //                 textColor: [51, 102, 102],
    //                 fillColor: [255, 255, 255],
    //                 cellPadding: 0,
    //                 lineWidth: 0.6,
    //                 lineColor: [0, 0, 0],
    //                 minCellHeight: 10,
    //             }
    //         }]],
    //         startY: 277,
    //         margin: { top: 9, right: 8, bottom: 0, left: 8 },
    //         theme: 'plain',
    //         tableWidth: 189,
    //     });

    //     doc.setFontSize(10);
    //     doc.setFont('helvetica', 'bold');
    //     doc.text('WWW.AGROVANTS.COM', 280, 70, { align: 'center' });

    //     // Guardar archivo
    //     const nombreArchivo = `Remito_Nº${numRemito}_Fecha_${dia}-${mes}-${anio.slice(2)}.pdf`;
    //     doc.save(nombreArchivo);

    //     this.cargandoPdf = false;
    // }

    /** 🔹 Reimprimir remito (método completo) */
    reimprimirRemito(remito: any): void {
        if (!remito) return;

        this.cargandoPdf = true;
        const doc = new jsPDF('p', 'mm', 'a4');

        // CORRECCIÓN: Ordenar los vuelos por fecha ascendente para el PDF
        const vuelos = (remito.Vuelos || []).sort((a: any, b: any) => {
            const fechaA = new Date(a.date || 0).getTime();
            const fechaB = new Date(b.date || 0).getTime();
            return fechaA - fechaB; // Orden ascendente
        });

        // ==========================================================================================
        // Cabecera principal (igual que en la versión anterior)
        autoTable(doc, {
            body: [[{ content: '', styles: { minCellHeight: 44, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
            startY: 9,
            margin: { top: 9, right: 8, left: 8 },
            theme: 'plain',
            tableWidth: 189,
        });

        autoTable(doc, {
            body: [[{ content: '', styles: { minCellHeight: 44, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
            startY: 9,
            margin: { left: 8 },
            theme: 'plain',
            tableWidth: 83,
        });

        autoTable(doc, {
            body: [[{ content: '', styles: { minCellHeight: 23, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
            startY: 9,
            margin: { left: 91 },
            theme: 'plain',
            tableWidth: 20,
        });

        autoTable(doc, {
            body: [[{ content: '', styles: { minCellHeight: 21, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
            startY: 32,
            margin: { left: 91 },
            theme: 'plain',
            tableWidth: 20,
        });

        autoTable(doc, {
            body: [[{ content: '', styles: { minCellHeight: 23, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
            startY: 9,
            margin: { left: 111 },
            theme: 'plain',
            tableWidth: 86,
        });

        // ==========================================================================================
        // Segunda fila de datos de empresa
        autoTable(doc, {
            body: [[{ content: '', styles: { minCellHeight: 19, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
            startY: 53,
            margin: { left: 8 },
            theme: 'plain',
            tableWidth: 189,
        });

        // ==========================================================================================
        // Logo + encabezado
        const logoImg = new Image();
        logoImg.src = '../../../assets/img/agrovants.png';
        doc.addImage(logoImg, 'PNG', 10, 16, 77, 30);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('REMITO', 137, 18);

        // 🔴 AGREGAR "HISTÓRICO" EN ROJO SI EL REMITO ESTÁ ANULADO
        if (remito.anulado) {
            doc.setTextColor(255, 0, 0); // Color rojo: RGB(255, 0, 0)
            doc.setFontSize(16);
            doc.text('HISTÓRICO', 137, 26); // Justo debajo de "REMITO"
            doc.setTextColor(0, 0, 0); // Volver a color negro
        }

        doc.setFontSize(40);
        doc.text('R', 96, 25);

        doc.setFontSize(7.5);
        doc.text('DOCUMENTO\nNO VÁLIDO\nCOMO\nFACTURA', 101, 39, { align: 'center' });

        // Fecha del remito - CORREGIDO
        const fechaStr = remito.fechaRemito?.split('T')[0] || '';
        let fechaRemitoFormateada = '---';
        if (fechaStr) {
            const [anio, mes, dia] = fechaStr.split('-');
            fechaRemitoFormateada = `${dia}/${mes}/${anio}`;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`AGROVANTS S.A.S.\nCUIT 30-71832717-9\nCel.: 261 6508470\nFecha: ${fechaRemitoFormateada}`, 113, 37.5);

        const numRemito = remito.numRemito || '---';
        doc.setFontSize(10);
        doc.text(`Remito número: ${numRemito}`, 150, 30);

        // ==========================================================================================
        // Datos del cliente
        const cliente = remito.fk_Usuario || {};

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Cliente: ', 10, 58);
        doc.setFont('helvetica', 'normal');
        doc.text(cliente.aliasUsuario || `${cliente.nombreUsuario || ''} ${cliente.apellidoUsuario || ''}`.trim(), 10, 63);

        doc.setFont('helvetica', 'normal');
        doc.text('IVA: 10.5%', 10, 70);
        doc.text(`CUIT: ${cliente.cuitUsuario || '---'}`, 50, 70);

        doc.setFont('helvetica', 'bold');
        doc.text('Domicilio: ', 92, 58);
        doc.setFont('helvetica', 'normal');
        doc.text(cliente.domicilioUsuario || '---', 92, 63);

        doc.setFont('helvetica', 'bold');
        doc.text('Teléfono: ', 92, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(cliente.telefonoUsuario || '---', 110, 70);

        // ==========================================================================================
        // Tabla de vuelos
        const columnas = [
            { header: 'Nº', dataKey: 'nroVuelo' },
            { header: 'Parcela', dataKey: 'cuadroVuelo' },
            { header: 'Fecha', dataKey: 'fecha' },
            { header: 'Cultivo', dataKey: 'cultivo' },
            { header: 'Superficie', dataKey: 'superficie' },
            { header: 'Precio/Ha', dataKey: 'precioHa' },
            { header: 'Subtotal', dataKey: 'subtotal' },
            { header: 'Piloto', dataKey: 'piloto' },
        ];

        const datos = vuelos.map((v: any, i: number) => {
            // CORRECCIÓN: Formatear fecha para evitar problemas de zona horaria
            const fechaVuelo = this.formatDateParaPDF(v.date);
            return {
                nroVuelo: i + 1,
                cuadroVuelo: v.cuadroVuelo || '',
                fecha: fechaVuelo,
                cultivo: v.cultivoVuelo || '',
                superficie: (v.superficieVuelo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }),
                precioHa: `$ ${v.precioHa?.toLocaleString('es-AR') || '0'}`,
                subtotal: `$ ${(v.precioHa * v.superficieVuelo || 0).toLocaleString('es-AR')}`,
                piloto: v.pilotoNombreCompleto || '',
            };
        });

        // Fijar cantidad de filas
        const startY = 75;
        const filasNecesarias = 26;
        for (let i = datos.length; i < filasNecesarias; i++) {
            datos.push({ nroVuelo: '', cuadroVuelo: '', fecha: '', cultivo: '', superficie: '', precioHa: '', subtotal: '', piloto: '' });
        }

        autoTable(doc, {
            head: [columnas.map(c => c.header)],
            body: datos.map((d: any) => columnas.map(c => d[c.dataKey])),
            startY,
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
                const pageHeight = doc.internal.pageSize.height;
                const pageNumberText = `Página ${data.pageNumber}`;
                const remitoText = `Remito número: ${numRemito}`;
                const pageNumberWidth = doc.getTextWidth(pageNumberText);
                const xPageNumber = (doc.internal.pageSize.width - pageNumberWidth) / 2;
                const y = pageHeight - 5;
                doc.setFontSize(10);
                doc.text(remitoText, 10, y);
                doc.text(pageNumberText, xPageNumber, y);
            }
        });

        // ==========================================================================================
        // Totales - VERSIÓN CORREGIDA
        const totalHa = vuelos.reduce((t: number, v: any) => t + (v.superficieVuelo || 0), 0);
        const totalSinIva = vuelos.reduce((t: number, v: any) => t + ((v.precioHa || 0) * (v.superficieVuelo || 0)), 0);
        const totalConIva = totalSinIva * 1.105;

        // Extraer precios únicos como números
        const preciosUnicos = [...new Set(vuelos.map((v: any) => v.precioHa || 0))];
        const precioUnitario: number = preciosUnicos.length === 1 ? Number(preciosUnicos[0]) : 0;

        autoTable(doc, {
            body: [[{ content: '', styles: { minCellHeight: 32, lineWidth: 0.6, lineColor: [0, 0, 0] } }]],
            startY: 245,
            margin: { left: 8 },
            theme: 'plain',
            tableWidth: 189,
        });

        autoTable(doc, {
            body: [[{
                content: `TOTAL HECTÁREAS = ${totalHa.toLocaleString('es-AR', { minimumFractionDigits: 2 })}    TOTAL PESOS = $ ${totalSinIva.toLocaleString('es-AR')}`,
                styles: { fillColor: [153, 204, 153], halign: 'center', fontSize: 10 }
            }]],
            startY: 252,
            margin: { left: (doc.internal.pageSize.width - 150) / 2 },
            theme: 'plain',
            tableWidth: 150,
        });

        autoTable(doc, {
            body: [[{
                content: `PRECIO UNITARIO = $ ${(precioUnitario || 0).toLocaleString('es-AR')}    TOTAL $ + IVA = $ ${totalConIva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                styles: { fillColor: [153, 204, 153], halign: 'center', fontSize: 10 }
            }]],
            startY: 264,
            margin: { left: (doc.internal.pageSize.width - 150) / 2 },
            theme: 'plain',
            tableWidth: 150,
        });

        // ==========================================================================================
        // Fila final
        autoTable(doc, {
            body: [[{
                content: 'WWW.AGROVANTS.COM',
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
                }
            }]],
            startY: 277,
            margin: { top: 9, right: 8, bottom: 0, left: 8 },
            theme: 'plain',
            tableWidth: 189,
        });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('WWW.AGROVANTS.COM', 280, 70, { align: 'center' });

        // Guardar archivo - CORREGIDO
        const fechaActual = new Date();
        const diaActual = fechaActual.getDate().toString().padStart(2, '0');
        const mesActual = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        const añoActual = fechaActual.getFullYear().toString().slice(2);
        const nombreArchivo = `Remito_Nº${numRemito}_Reimpresion_${diaActual}-${mesActual}-${añoActual}.pdf`;
        doc.save(nombreArchivo);

        this.cargandoPdf = false;
    }

    /** 🔹 Método para formatear fecha para el PDF evitando problemas de zona horaria */
    private formatDateParaPDF(dateString: string): string {
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
            console.error('Error al formatear fecha para PDF:', error);
            return dateString;
        }
    }




    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
