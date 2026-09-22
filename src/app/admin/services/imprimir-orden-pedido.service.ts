import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class ImprimirOrdenPedidoService {

    constructor() { }

    private _formatNumber(value: any): string {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (num === null || num === undefined || isNaN(num)) return '';
        return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    private _sanitizeFilename(value: string): string {
        return value
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/_+/g, '_');
    }

    private _getCliente(data: any): string {
        const alias = (data.propietarioAlias || '').toString().trim();
        if (alias) return alias;
        return (data.propietarioNombre || '').toString().trim();
    }

    imprimirOrdenPedido(data: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const doc = new jsPDF('p', 'mm', 'a4');

            const cliente = this._getCliente(data);

            //==========================================================================================
            // CABECERA (igual que Remito)
            //==========================================================================================

            autoTable(doc, {
                body: [[{ content: '', styles: { cellPadding: 0, lineWidth: 0.6, lineColor: [0, 0, 0] as [number, number, number], fillColor: [255, 255, 255] as [number, number, number], minCellHeight: 44 } }]],
                columns: [{ header: '', dataKey: 'col1' }],
                startY: 9,
                margin: { top: 9, right: 8, bottom: 0, left: 8 },
                theme: 'plain',
                tableWidth: 189,
            });

            autoTable(doc, {
                body: [[{ content: '', styles: { cellPadding: 0, lineWidth: 0.6, lineColor: [0, 0, 0] as [number, number, number], fillColor: [255, 255, 255] as [number, number, number], minCellHeight: 44 } }]],
                columns: [{ header: '', dataKey: 'col2' }],
                startY: 9,
                margin: { top: 9, right: 0, bottom: 0, left: 8 },
                theme: 'plain',
                tableWidth: 83,
            });

            autoTable(doc, {
                body: [[{ content: '', styles: { cellPadding: 0, lineWidth: 0.6, lineColor: [0, 0, 0] as [number, number, number], fillColor: [255, 255, 255] as [number, number, number], minCellHeight: 23 } }]],
                columns: [{ header: '', dataKey: 'col3' }],
                startY: 9,
                margin: { top: 9, right: 0, bottom: 0, left: 91 },
                theme: 'plain',
                tableWidth: 20,
            });

            autoTable(doc, {
                body: [[{ content: '', styles: { cellPadding: 0, lineWidth: 0.6, lineColor: [0, 0, 0] as [number, number, number], fillColor: [255, 255, 255] as [number, number, number], minCellHeight: 21 } }]],
                columns: [{ header: '', dataKey: 'col4' }],
                startY: 32,
                margin: { top: 32, right: 0, bottom: 0, left: 91 },
                theme: 'plain',
                tableWidth: 20,
            });

            autoTable(doc, {
                body: [[{ content: '', styles: { cellPadding: 0, lineWidth: 0.6, lineColor: [0, 0, 0] as [number, number, number], fillColor: [255, 255, 255] as [number, number, number], minCellHeight: 23 } }]],
                columns: [{ header: '', dataKey: 'col5' }],
                startY: 9,
                margin: { top: 9, right: 0, bottom: 0, left: 111 },
                theme: 'plain',
                tableWidth: 86,
            });

            autoTable(doc, {
                body: [[{ content: '', styles: { cellPadding: 0, lineWidth: 0.6, lineColor: [0, 0, 0] as [number, number, number], fillColor: [255, 255, 255] as [number, number, number], minCellHeight: 19 } }]],
                columns: [{ header: '', dataKey: 'col6' }],
                startY: 53,
                margin: { top: 53, right: 8, bottom: 0, left: 8 },
                theme: 'plain',
                tableWidth: 189,
            });

            //==========================================================================================
            // Textos de la cabecera
            //==========================================================================================

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('ORDEN DE PEDIDO', 137, 18);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nº ${data.opNomenclatura || ''}`, 140, 26);

            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.text('OP', 94, 25);

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text('DOCUMENTO\nNO VÁLIDO\nCOMO\nFACTURA', 101, 39, { align: 'center' });

            const fechaActual = new Date();
            const dia = fechaActual.getDate().toString().padStart(2, '0');
            const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
            const año = fechaActual.getFullYear();

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`AGROVANTS S.A.S.\nCUIT 30-71832717-9\nCel.: 261 6508470\nFecha de impresión: ${dia}/${mes}/${año}`, 113, 37.5, { align: 'left' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Cliente: ', 10, 58);
            doc.setFont('helvetica', 'normal');
            doc.text(cliente, 10, 63);
            doc.setFont('helvetica', 'normal');
            doc.text('IVA: 10.5%', 10, 70);
            doc.setFont('helvetica', 'normal');
            doc.text(`CUIT: ${data.propietarioCuit || ''}`, 50, 70);
            doc.setFont('helvetica', 'bold');
            doc.text('Domicilio: ', 92, 58);
            doc.setFont('helvetica', 'normal');
            doc.text(`${data.propietarioDomicilio || ''}`, 92, 63);
            doc.setFont('helvetica', 'bold');
            doc.text('Teléfono: ', 92, 70);
            doc.setFont('helvetica', 'normal');
            doc.text(`${data.propietarioTelefono || ''}`, 110, 70);

            const logoImg = new Image();
            logoImg.src = '../../../assets/img/agrovants.png';
            doc.addImage(logoImg, 'PNG', 10, 16, 77, 30);

            //==========================================================================================
            // CUERPO - GRILLA DE FORMULARIO
            //==========================================================================================

            const fecha = data.opFecha ? formatDate(data.opFecha, 'dd/MM/yyyy', 'es-Ar') : '';
            const precioHa = data.opPrecioHa || 0;
            const superficie = data.opSuperficie || 0;
            const subtotal = precioHa * superficie;

            let agroqList: string[] = [];
            for (let i = 1; i <= 4; i++) {
                const nom = data[`opAgroq${i}`];
                if (nom) {
                    const dosis = data[`opDosisAgroq${i}`];
                    agroqList.push(dosis ? `${nom} - ${this._formatNumber(dosis)} lts/ha` : nom);
                }
            }
            let coadList: string[] = [];
            for (let i = 1; i <= 2; i++) {
                const nom = data[`opCoad${i}`];
                if (nom) {
                    const dosis = data[`opDosisCoad${i}`];
                    coadList.push(dosis ? `${nom} - ${this._formatNumber(dosis)} lts/ha` : nom);
                }
            }

            const TEAL: [number, number, number] = [51, 102, 102];
            const WHITE: [number, number, number] = [255, 255, 255];
            const BLACK: [number, number, number] = [0, 0, 0];

            const labelStyle = () => ({
                halign: 'center' as const,
                valign: 'middle' as const,
                cellPadding: { top: 1, left: 3, bottom: 1, right: 3 } as any,
                lineWidth: 0.4,
                lineColor: BLACK,
                fillColor: TEAL,
                textColor: WHITE,
                fontStyle: 'bold' as const,
                fontSize: 9,
                minCellHeight: 7,
            });

            const valueStyle = () => ({
                halign: 'left' as const,
                valign: 'middle' as const,
                cellPadding: { top: 1, left: 3, bottom: 1, right: 3 } as any,
                lineWidth: 0.4,
                lineColor: BLACK,
                fillColor: WHITE,
                textColor: BLACK,
                fontStyle: 'normal' as const,
                fontSize: 9,
                minCellHeight: 7,
            });

            const body = [
                // Fila labels: Fecha | Piloto | Propietario | Cultivo
                [
                    { content: 'Fecha', styles: labelStyle() },
                    { content: 'Piloto', styles: labelStyle() },
                    { content: 'Propietario', styles: labelStyle() },
                    { content: 'Cultivo', styles: labelStyle() },
                ],
                // Fila valores
                [
                    { content: fecha || '-', styles: valueStyle() },
                    { content: data.pilotoAlias || data.piloto || '-', styles: valueStyle() },
                    { content: cliente || '-', styles: valueStyle() },
                    { content: data.opCultivo || '-', styles: valueStyle() },
                ],
                // Fila labels: Superficie | Forma de Pago | Precio/Ha | Precio Total
                [
                    { content: 'Superficie (Ha)', styles: labelStyle() },
                    { content: 'Forma de Pago', styles: labelStyle() },
                    { content: 'Precio/Ha', styles: labelStyle() },
                    { content: 'Precio Total (+IVA)', styles: labelStyle() },
                ],
                // Fila valores
                [
                    { content: this._formatNumber(superficie), styles: valueStyle() },
                    { content: data.opFormaPago || '-', styles: valueStyle() },
                    { content: `$ ${this._formatNumber(precioHa)}`, styles: valueStyle() },
                    { content: `$ ${this._formatNumber(subtotal * 1.105)}`, styles: valueStyle() },
                ],
                // Fila labels: Agroquímicos (2 col) | Coadyuvantes (2 col)
                [
                    { content: 'Agroquímicos', colSpan: 2, styles: labelStyle() },
                    { content: 'Coadyuvantes', colSpan: 2, styles: labelStyle() },
                ],
                // Fila valores
                [
                    { content: agroqList.length > 0 ? agroqList.join('\n') : '-', colSpan: 2, styles: valueStyle() },
                    { content: coadList.length > 0 ? coadList.join('\n') : '-', colSpan: 2, styles: valueStyle() },
                ],
                // Fila label: Aclaración (full width)
                [
                    { content: 'Aclaración', colSpan: 4, styles: labelStyle() },
                ],
                // Fila valor
                [
                    { content: data.opAclaracion || '-', colSpan: 4, styles: valueStyle() },
                ],
            ];

            const startY = 75;

            autoTable(doc, {
                body,
                startY: startY,
                margin: { left: 8, right: 8 },
                theme: 'plain',
                tableWidth: 189,
                styles: {
                    font: 'helvetica',
                    textColor: BLACK,
                },
                columnStyles: {
                    0: { cellWidth: 47.25 },
                    1: { cellWidth: 47.25 },
                    2: { cellWidth: 47.25 },
                    3: { cellWidth: 47.25 },
                },
            });

            //==========================================================================================
            // FOOTER
            //==========================================================================================

            autoTable(doc, {
                body: [[{ content: 'WWW.AGROVANTS.COM', styles: { font: 'helvetica', halign: 'center' as const, valign: 'middle' as const, fontSize: 12, fontStyle: 'bold', textColor: TEAL, fillColor: WHITE, cellPadding: 0, lineWidth: 0.6, lineColor: BLACK, minCellHeight: 10 } }]],
                columns: [{ header: '', dataKey: 'colultima' }],
                startY: 277,
                margin: { top: 9, right: 8, bottom: 0, left: 8 },
                theme: 'plain',
                tableWidth: 189,
            });

            //==========================================================================================
            // Nombre del archivo
            //==========================================================================================
            const diaFile = fechaActual.getDate().toString().padStart(2, '0');
            const mesFile = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
            const añoFile = fechaActual.getFullYear().toString().slice(2);
            const nombreArchivo = `Orden_Pedido_${this._sanitizeFilename(cliente)}_${data.opNomenclatura || 'OP'}_${diaFile}-${mesFile}-${añoFile}.pdf`;

            doc.save(nombreArchivo);
            resolve();
        });
    }
}
