import { Injectable } from '@angular/core';
import { MapService } from '../../shared/services/map.service';
import * as L from 'leaflet';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
import { formatDate } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class ImprimirVueloService {

    public selectedFlight: any;
    private flightsVisibility: { [id: string]: boolean } = {};
    ownerDataList: any[] = [];
    map!: L.Map;



    constructor(private mapService: MapService) {

    }

    hideShowLayer(event: any, data: any, marker?: any) {
        event.preventDefault();
        event.stopPropagation();
        const wasVisible = data.visibility; // Guarda el estado anterior de visibilidad
        data.visibility = !data.visibility;
        if (marker) {
            marker.visibility = !marker.visibility;
        }

        if (data.vueloId) {
            if (data.visibility) {
                this.mapService.addFlightToMap(data, true);
            } else {
                this.mapService.map$
                    .subscribe((map: L.Map) => {
                        map.eachLayer((layer: any) => {
                            const id = layer.id;
                            if (id === data.vueloId) {
                                layer.remove();
                            }
                        })
                    }).unsubscribe();
            }
        }
    }

    imprimirVuelo(data: any, ownerDataList: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            // Ocultar todos los vuelos excepto el seleccionado
            this.selectedFlight = data;

            ownerDataList.forEach((flight) => {
                if (flight.vueloId === data.vueloId) {
                    flight.isSelected = true;
                } else {
                    flight.isSelected = false;
                }
                if (flight.vueloId !== data.vueloId && flight.visibility) {
                    this.hideShowLayer({ preventDefault: () => { }, stopPropagation: () => { } }, flight);
                }
            });

            this.captureMapImage(data, ownerDataList).then(resolve).catch(reject);
        });
    }

    private async captureMapImage(data: any, ownerDataList: any[]): Promise<any[]> {
        const map = this.mapService.map;
        if (!map) {
            throw new Error('Mapa no definido');
        }

        // Esperar a que terminen de eliminarse las capas
        await this.waitForMapSettled(500);

        // Forzar recálculo del tamaño del contenedor del mapa
        map.invalidateSize();

        // Esperar a que todas las teselas terminen de cargar
        await this.waitForTilesLoaded(5000);

        // Cerrar popups abiertos (ej. hover de polígonos o pines de OP)
        map.closePopup();
        map.eachLayer((layer: any) => {
            if (layer && layer.closeTooltip) {
                layer.closeTooltip();
            }
        });

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

        const doc = new jsPDF('l', 'mm', 'a4');

        // CABECERA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`AREA DE VUELO DE PULVERIZACIÓN`, 32, 15);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Cliente: ${data.propietario}`, 32, 22);
        doc.text(`Zona: ${data.zonaVuelo}`, 32, 26);
        const fecha = formatDate(data.date, 'dd/MM/yyyy', 'es-Ar');
        doc.text(`Fecha: ${fecha}`, 32, 30);
        doc.text(`ID Vuelo: ${data.cuadroVuelo}`, 32, 34);
        doc.text(`Cultivo: ${data.cultivoVuelo}`, 32, 38);
        const superficie = data.superficieVuelo.toString().replace('.', ',');
        doc.text(`Superficie: ${superficie} ha`, 32, 42);

        const logoImg = new Image();
        logoImg.src = '../../../../assets/img/agrovants.png';
        await new Promise<void>((res) => { logoImg.onload = () => res(); });

        doc.addImage(logoImg, 'PNG', 185, 8, 77, 30);
        doc.addImage(dataUrl, 'PNG', 32, 46, 231, 154);
        doc.save(`vuelo_${data.propietario}_${data.cuadroVuelo}_${data.cultivoVuelo}.pdf`);

        // Volver a mostrar todos los vuelos
        ownerDataList.forEach((flight) => {
            flight.isSelected = false;
            if (!flight.visibility) {
                this.hideShowLayer({ preventDefault: () => { }, stopPropagation: () => { } }, flight);
            }
        });
        this.selectedFlight = null;
        return ownerDataList;
    }

    private waitForMapSettled(timeout: number): Promise<void> {
        const map = this.mapService.map;
        if (!map) return Promise.resolve();
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                map.off('moveend', onMoveEnd);
                resolve();
            };
            const onMoveEnd = () => finish();
            const timer = setTimeout(finish, timeout);
            map.on('moveend', onMoveEnd);
        });
    }

    private waitForTilesLoaded(timeout: number): Promise<void> {
        const map = this.mapService.map;
        if (!map) return Promise.resolve();
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

}
