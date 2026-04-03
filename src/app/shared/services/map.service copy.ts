import * as L from 'leaflet';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, pipe } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GlobalsService } from './globals.service';
import { Flight } from '../interfaces/flight.interface';
import { GeoJsonObject } from 'geojson';
import { OwnerAnalysis, Analysis } from '../interfaces/analysis.interface';
import { retry, take } from 'rxjs/operators';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { OwnerService } from 'src/app/pages/services/owner.service';
declare var require: any
const geo2svg = require('geo2svg');

@Injectable({
    providedIn: 'root'
})
export class MapService {

    private baseUrl: string = environment.baseUrl;
    private geoServerUrl: string = environment.geoServerUrl;
    private datePipe: DatePipe = new DatePipe('es-AR');
    private numberPipe: DecimalPipe = new DecimalPipe('es-AR');


    map!: L.Map;
    map$: Observable<L.Map> = new Observable<L.Map>(observer => {
        if (this.map) {
            observer.next(this.map);
        }
    });
    timeslider!: boolean;
    viewList: any[] = [];
    viewListLength = 0;

    constructor(
        private http: HttpClient,
        private globalsService: GlobalsService,
        private ownerService: OwnerService
    ) { }

    setMap(map: L.Map) {
        this.map = map;
    }

    /* Utilities */
    layerToFeature(polygon: L.Polygon) {
        const latlngs: any = polygon.getLatLngs()[0];
        let coordinates = [];
        for (let latlng of latlngs) {
            coordinates.push([latlng.lng, latlng.lat])
        }
        const feature: any = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [coordinates]
            }
        }
        return feature;
    }

    geojsonSvgPath(coordinates: any) {
        const geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": coordinates
                    }
                }
            ]
        };
        const option = {
            size: [30, 30],
            padding: [0, 0, 0, 0],
            output: 'string',
            precision: 3,
        };
        const svgStr = geo2svg(geojson, option);
        return svgStr.slice(svgStr.indexOf('path d="') + 8, svgStr.indexOf('"  fill='));
    }

    /* Map management */
    clearMap() {
        this.map.eachLayer((layer: any) => {
            if (layer.pm) {
                this.map.removeLayer(layer);
            }
        })
    }

    removeAllFeatures() {
        this.map.eachLayer((layer: any) => {
            if (layer.toGeoJSON) {
                this.map.removeLayer(layer);
            }
        })
    }

    getAllFeatures() {
        const features: any[] = [];
        this.map.eachLayer((layer: any) => {
            if (layer.feature) {
                features.push(layer.feature);
            }
        })
        return features;
    }

    getAllFlights() {
        const flights: any[] = [];
        this.map.eachLayer((layer: any) => {
            if (layer.feature) {
                flights.push(layer.feature);
            }
        })
        return flights.filter(f => f.geometry.crs.properties.type == "flight");
    }

    fitBoundsById(idList: any[]) {
        let featureGroup = L.featureGroup();
        idList.forEach(id => {
            this.map.eachLayer((layer: any) => {
                if (layer.id == id) {
                    featureGroup.addLayer(layer);
                }
            })
        })
        const bounds = featureGroup.getBounds();
        idList.length > 0 ? this.map.fitBounds(bounds) : false;
    }

    /* Flights */
    addFlightsToMap(flights: Flight[]) {
        if (flights.length < 0) return;
        this.map$
            .subscribe((map: L.Map) => {
                const idList: any[] = [];
                flights.forEach((f: any) => {
                    idList.push(f.vueloId)
                    this.createFlightLayer(f).addTo(map);
                });
                this.fitBoundsById(idList);
            })
            .unsubscribe();
    }

    addFlightToMap(flight: Flight) {
        this.map$.
            subscribe((map: L.Map) => {
                const layer = this.createFlightLayer(flight).addTo(map);
                const bounds = layer.getBounds();
                map.fitBounds(bounds);
            }).unsubscribe();
    }

    createFlightLayer(flight: Flight): any {
        const c = `${flight.colorVuelo}`;
        //const c = this.globalsService.randomColor();

        const geometry: any = flight.geometryVuelo;
        geometry.crs.properties.type = "flight";

        const polygonStyle = { //TODO: FIX get flights
            color: c,
            fillColor: c,
            fillOpacity: 0.15,
            pmIgnore: true,
            snapIgnore: false,
        }

        const layer: any = L.geoJSON(geometry, {
            style: polygonStyle
        }).bindPopup( //TODO: Fix styles Popup
            `<p>${flight.aplicacionVuelo}</p>
       <p>Cuadro: ${flight.cuadroVuelo}</p>
       <p>Cultivo: ${flight.cultivoVuelo}</p>
       <p>${this.datePipe.transform(flight.date, 'dd/MM/yyyy')} </p>
       <p>${this.numberPipe.transform(flight.superficieVuelo)} ha</p>
      `, { closeButton: false }
        )
            .on("mouseover", function (event) {
                event.layer.setStyle({
                    fillOpacity: 0.35
                });
                layer.openPopup()
            })
            .on("mouseout", function (event) {
                event.layer.setStyle({
                    fillOpacity: 0.15
                });
            })
            .on("click", (_) => {
                layer.closePopup()
                this.ownerService.openInfoDialog(flight, 'flight')
            })
        layer.id = flight.vueloId;
        return layer;
    }

    /* Observations */
    addObservationsToMap(observations: any[]) {
        if (observations.length < 0) return;
        this.map$
            .subscribe((map: L.Map) => {
                observations.forEach((obs: any) => {
                    const markers = obs.marcadores;
                    markers.forEach((m: any) => {
                        const marker = this.createObservationLayer(m, obs)
                            .addTo(map);
                    })
                });
            }).unsubscribe();
    }

    addObservationToMap(marker: any, observation: any) {
        this.map$.
            subscribe((map: L.Map) => {
                const layer = this.createObservationLayer(marker, observation).addTo(map);
            }).unsubscribe();
    }

    createObservationLayer(marker: any, observation: any): any {
        let layer: any;
        const c = '#00dd4d';

        if (marker.geometryMarcador.type === 'Point') {
            const coordinates = L.GeoJSON.coordsToLatLng(marker.geometryMarcador.coordinates);
            layer = L.marker(coordinates, {
                draggable: false,
                alt: 'Puntero de Observación',
                keyboard: false,
                zIndexOffset: 1000
            })
        }

        if (marker.geometryMarcador.type === 'Polygon') {
            layer = L.geoJSON(marker.geometryMarcador, {
                style: {
                    color: c,
                    fillColor: c,
                    fillOpacity: 0.15,
                    pmIgnore: true,
                    snapIgnore: false,
                }
            })
        }

        layer.bindPopup(
            `<p>Observación creada el día: <strong>${this.datePipe.transform(observation.date, 'dd/MM/yyyy')} </strong></p>
           `, { closeButton: false }
        )
            .on("mouseover", () => {
                layer.openPopup()
            })
            .on("mouseout", () => {
                layer.closePopup()
            })
            .on("click", () => {
                this.ownerService.openInfoDialog(observation, 'observation')
            })

        layer.id = marker.marcadorId;
        return layer;
    }

    /* Analysis */
    addAnalysisListToMap(ownerAnalysis: any) {
        if (ownerAnalysis === null) return;
        if (ownerAnalysis.length < 0) return;
        this.map$
            .subscribe((map: L.Map) => {
                ownerAnalysis.forEach((analysis: any) => {
                    const wmsLayer = this.createAnalysisLayer(analysis)
                    wmsLayer.addTo(map)
                    //TODO: Get the png layer
                })
            }).unsubscribe()
    }

    addAnalysisToMap(ownerAnalysis: any) {
        this.map$
            .subscribe((map: L.Map) => {
                const wmsLayer = this.createAnalysisLayer(ownerAnalysis)
                if (wmsLayer) {
                    wmsLayer.addTo(map)
                }
                //TODO: Get the png layer
            }).unsubscribe()
    }

    createAnalysisLayer(analysis: any) {
        /* Geoserver request */
        const layer = analysis.imagenAnalisis;
        const wmsLayer = L.Geoserver.wms(this.geoServerUrl, {
            layers: layer
        })
        //wmsLayer.id = analysis.analisisId;
        return wmsLayer;
    }

    /* Map controls */
    addDrawControls() {
        const c = '#00dd4d';
        this.map.pm.addControls({
            position: 'topright',
            drawMarker: true,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawPolygon: true,
            drawCircle: false,
            editMode: true,
            cutPolygon: false,
            rotateMode: false,
            drawText: false,
        });
        this.map.pm.enableDraw('Polygon', {
            templineStyle: { color: c },
            hintlineStyle: { color: c }
        });
        this.map.pm.disableDraw();
        this.map.pm.setPathOptions({
            color: c,
            fillColor: c,
            fillOpacity: 0.15,
        });
    }

    removeDrawControls() {
        this.map.pm.disableDraw();
        this.map.pm.removeControls();
    }

    addTimeslider() {
        this.timeslider = true;
    }

    removeTimeslider() {
        this.timeslider = false;
    }

    addImageOverlay(imageOverlay: any, bounds: any) {
        imageOverlay.addTo(this.map);
        this.map.fitBounds(bounds);
    }

    removeImageOverlay(imageOverlay: any) {
        this.map.removeLayer(imageOverlay);
    }

    /* Satelite Analysis View */
    openView() {
        document.querySelector('.view')?.classList.add('view--active');
    }

    toggleView() {
        document.querySelector('.view')?.classList.toggle('view--active');
    }

    updateView() {
        this.viewList = [...this.viewList];
        this.viewListLength = this.viewList.length;
    }

    cleanView() {
        this.viewList = [];
        this.viewListLength = this.viewList.length;
    }

    refreshView() {
        this.viewList.forEach((sateliteAnalysis: any) => {
            if (sateliteAnalysis.show) {
                this.showSateliteAnalysisView(sateliteAnalysis);
            }
        });
    }

    addSateliteAnalysisToView(sateliteAnalysis: any) {
        this.addSateliteAnalysisToMap(sateliteAnalysis.image);
        this.viewList.push(sateliteAnalysis);
        this.updateView();
    }

    hideSateliteAnalysisView(sateliteAnalysis: any) {
        const i = this.viewList.indexOf(sateliteAnalysis);
        sateliteAnalysis.show = false;
        this.viewList[i] = sateliteAnalysis;
        this.removeSateliteAnalysisFromMap(sateliteAnalysis.image);
        this.updateView();
    }

    showSateliteAnalysisView(sateliteAnalysis: any) {
        const i = this.viewList.indexOf(sateliteAnalysis);
        sateliteAnalysis.show = true;
        this.viewList[i] = sateliteAnalysis;
        this.addSateliteAnalysisToMap(sateliteAnalysis.image);
        this.updateView();
    }

    removeSateliteAnalysisFromView(sateliteAnalysis: any) {
        const i = this.viewList.indexOf(sateliteAnalysis);
        this.viewList.splice(i, 1);
        this.removeSateliteAnalysisFromMap(sateliteAnalysis.image);
        this.updateView();
    }

    addSateliteAnalysisToMap(image: any) {
        image.addTo(this.map);
    }

    removeSateliteAnalysisFromMap(image: any) {
        this.map.removeLayer(image);
    }

    /* Index reference */
    openIndexReference() {
        document.querySelector('.indexReference')?.classList.add('indexReference--active');
    }

    toggleIndexReference() {
        document.querySelector('.indexReference')?.classList.toggle('indexReference--active');
    }

    /* Back-end requests */
    getSateliteAnalysis(req: any): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/indice/google/`, req);
    }

}
