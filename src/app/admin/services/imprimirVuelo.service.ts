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

            setTimeout(() => {
                const map = this.mapService.map;
                if (map) {
                    // Cerrar popups abiertos (ej. hover de polígonos o pines de OP)
                    map.closePopup();
                    map.eachLayer((layer: any) => {
                        if (layer && layer.closeTooltip) {
                            layer.closeTooltip();
                        }
                    });

                    const mapElement = map.getContainer();
                    if (!mapElement) {
                        reject(new Error('Contenedor del mapa no disponible'));
                        return;
                    }
                    domtoimage.toPng(mapElement, {
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
                    })
                        .then((dataUrl: string) => {
                            const doc = new jsPDF('l', 'mm', 'a4'); // 'l' para landscape (apaisado)

                            // CABECERA-------------------------------------------------
                            // Titulo
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

                            // Agregar el logo de la empresa
                            const logoImg = new Image();
                            logoImg.src = '../../../../assets/img/agrovants.png';
                            logoImg.onload = () => {
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
                                resolve(ownerDataList);
                            };
                        })
                        .catch((error: Error) => {
                            console.error('Error al generar la imagen', error);
                            reject(error);
                        });
                } else {
                    console.error('Mapa no definido');
                    reject(new Error('Mapa no definido'));
                }
            }, 1000); // Retraso de 1000 milisegundos (1 segundo)
        });
    }

    // toggleFlightVisibility(event: any, data: any) {
    //     event.stopPropagation();

    //     if (this.selectedFlight && this.selectedFlight.vueloId === data.vueloId) {
    //         // Volver a mostrar todos los vuelos
    //         this.ownerDataList.forEach((flight) => {
    //             flight.isSelected = false;
    //             if (!flight.visibility) {
    //                 this.hideShowLayer({ preventDefault: () => { }, stopPropagation: () => { } }, flight);
    //             }
    //         });
    //         this.selectedFlight = null;
    //     } else {
    //         // Ocultar todos los vuelos excepto el seleccionado
    //         this.selectedFlight = data;
    //         this.ownerDataList.forEach((flight) => {
    //             if (flight.vueloId === data.vueloId) {
    //                 flight.isSelected = true;
    //             } else {
    //                 flight.isSelected = false;
    //             }
    //             if (flight.vueloId !== data.vueloId && flight.visibility) {
    //                 this.hideShowLayer({ preventDefault: () => { }, stopPropagation: () => { } }, flight);
    //             }
    //         });
    //     }
    // }

}
