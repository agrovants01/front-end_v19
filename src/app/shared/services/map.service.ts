import * as L from 'leaflet';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, pipe, Subject, throwError, forkJoin, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GlobalsService } from './globals.service';
import { Flight } from '../interfaces/flight.interface';
import { GeoJsonObject } from 'geojson';
import { OwnerAnalysis, Analysis } from '../interfaces/analysis.interface';
import { catchError, retry, take, tap, map } from 'rxjs/operators';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { OwnerService } from 'src/app/pages/services/owner.service';
import { MatButtonModule } from '@angular/material/button';
import { FlightsService } from 'src/app/pages/services/flights.service';
import { PolygonResponse } from './polygonResponse.interface';
import { AuthService } from 'src/app/auth/services/auth.service';
import { WmsLayerService } from './wms-layer.service';
declare var require: any
const geo2svg = require('geo2svg');

export interface ExtendedGeoJSONOptions extends L.GeoJSONOptions {
    idPolygon?: string;
}

@Injectable({
    providedIn: 'root'
})
export class MapService {

    private editingFinishedSubject = new Subject<void>();
    private isAddFlightMode = false;
    private baseUrl: string = environment.baseUrl;
    private geoServerUrl: string = environment.geoServerUrl;
    private datePipe: DatePipe = new DatePipe('es-AR');
    private numberPipe: DecimalPipe = new DecimalPipe('es-AR');

    private mapState: any = {};

    map!: L.Map;

    originalGeometries: Map<string, any> = new Map(); // Almacena geometrías originales
    polygonLayers: Map<string, L.Polygon> = new Map(); // Mapa de capas de polígonos por ID

    // Nuevas propiedades para controlar auto-guardado
    private autoSaveEnabled: boolean = false;
    private tempGeometries: Map<string, any> = new Map(); // Geometrías temporales no guardadas
    private geometrySnapshots: Map<string, any> = new Map(); // Snapshots para cancelación

    map$: Observable<L.Map> = new Observable<L.Map>(observer => {
        if (this.map) {
            observer.next(this.map);
        }
    });
    timeslider!: boolean;
    references!: boolean;
    viewList: any[] = [];
    viewListLength = 0;

    setAddFlightMode(valor: boolean) {
        this.isAddFlightMode = valor;
    }

    constructor(
        private http: HttpClient,
        private globalsService: GlobalsService,
        private ownerService: OwnerService,
        private flightsService: FlightsService,
        public authService: AuthService,
        private wmsLayerService: WmsLayerService,
    ) { }

    setState(state: any) {
        this.mapState = state;
    }

    getState() {
        return this.mapState;
    }

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
        //console.log('coordinates:', coordinates);

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

        //console.log('svgStr:', svgStr);

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

    removeEditLayers(): void {
        if (this.map) {
            this.map.eachLayer((layer: any) => {
                if (layer.pm && layer.pm.enabled()) {
                    this.map.removeLayer(layer);
                }
            });
        }
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
                if (layer.id == id || (layer as any)._id === id ||
                    layer.options?.idPolygon === id) {
                    featureGroup.addLayer(layer);
                }
            })
        })
        const bounds = featureGroup.getBounds();
        if (idList.length > 0) {
            this.map.fitBounds(bounds.pad(0.1));
        }
    }

    /* Flights: Añade los vuelos al mapa */
    addFlightsToMap(flights: any[], resetZoom: boolean = true) {
        if (flights.length < 0) return;

        this.map$
            .subscribe((map: L.Map) => {
                const idList: any[] = [];

                flights.forEach((f: any) => {
                    idList.push(f.vueloId)
                    const layer = this.createFlightLayer(f).addTo(map);
                });
                if (resetZoom) {
                    this.fitBoundsById(idList);
                }
            });
    }

    addFlightsToMap2(flights: any[], resetZoom: boolean = true, enableAutoSave: boolean = false) {
        // Configurar auto-guardado según el modo
        this.setAutoSaveEnabled(enableAutoSave);

        // Limpiar datos temporales previos
        this.tempGeometries.clear();
        this.geometrySnapshots.clear();

        // Iterar sobre los vuelos y agregarlos al mapa
        flights.forEach((flight) => {
            const layer = L.geoJSON(flight.geometryVuelo, { pmIgnore: false }) as L.GeoJSON;
            const polygonLayer = layer.getLayers()[0] as L.Polygon;

            // Guardar el ID del polígono en las opciones de la capa
            (polygonLayer.options as ExtendedGeoJSONOptions).idPolygon = flight.vueloId;

            // Guardar ID como propiedad personalizada
            (polygonLayer as any)._id = flight.vueloId;
            (polygonLayer as any).flightData = flight;

            // Guardar la geometría original
            this.originalGeometries.set(flight.vueloId, flight.geometryVuelo);

            // Guardar snapshot para cancelación
            this.geometrySnapshots.set(flight.vueloId, JSON.parse(JSON.stringify(flight.geometryVuelo)));

            // Agregar evento para detectar ediciones
            polygonLayer.off('pm:update'); // Remover eventos previos
            polygonLayer.on('pm:update', (event: any) => this.handleEdit(event));

            // Agregar al mapa y al mapa de capas
            polygonLayer.addTo(this.map);
            this.polygonLayers.set(flight.vueloId, polygonLayer);
        });

        // Activar la edición global de capas
        this.map.pm.enableGlobalEditMode({ limitMarkersToCount: 3 });

        // Ajustar el zoom del mapa
        if (resetZoom) {
            this.map.fitBounds(this.map.getBounds());
        }

        // Habilitar edición para todas las capas cargadas
        this.enableEditLayers();

        console.log(`Modo edición global iniciado. Auto-guardado: ${enableAutoSave ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }

    enableEditLayers(): void {
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Polygon) {
                layer.pm.enable();
            }
        });
    }

    handleEdit(e: any) {
        const layer = e.layer;
        const options = layer.options as ExtendedGeoJSONOptions;
        const id = options.idPolygon || (layer as any)._id;

        const geometry = layer.toGeoJSON();

        // Guardar en temporales
        if (id) {
            this.tempGeometries.set(id, geometry);
        }

        if (id && this.autoSaveEnabled) {
            // Modo individual: guardar automáticamente
            this.updateFlightGeometry(id, geometry)
                .subscribe(
                    (response) => {
                        console.log('✅ Geometría actualizada automáticamente');
                        this.editingFinishedSubject.next();
                    },
                    (error) => {
                        console.error('❌ Error al actualizar automáticamente', error);
                    }
                );
        } else if (id) {
            // Modo global: solo guardar localmente
            console.log('✏️ Edición detectada (guardada temporalmente)');
        } else {
            console.error('⚠️ No se encontró el ID del vuelo en el polígono editado.');
        }
    }

    // Método para habilitar/deshabilitar auto-guardado
    setAutoSaveEnabled(enabled: boolean): void {
        this.autoSaveEnabled = enabled;
        console.log(`Auto-guardado ${enabled ? 'activado' : 'desactivado'}`);
    }

    getEditingFinishedObservable() {
        return this.editingFinishedSubject.asObservable();
    }

    disableGeomanEditMode(): void {
        if (this.map && this.map.pm) {
            // Desactivar modo edición global
            this.map.pm.disableGlobalEditMode();

            // Desactivar edición en todas las capas
            this.map.eachLayer((layer: any) => {
                if (layer.pm) {
                    layer.pm.disable();
                }
            });

            // Remover controles de Geoman
            this.map.pm.removeControls();
        }
    }

    getEditingFinishedStatus(): boolean {
        return this.editingFinishedSubject.isStopped;
    }

    updateFlightGeometry(flightId: string, geometry: any): Observable<PolygonResponse> {
        return this.http.put<PolygonResponse>(`${this.baseUrl}/vuelo/actualizaPoligono/${flightId}`,
            { geometryVuelo: geometry },
            { headers: { 'Content-Type': 'application/json' } }
        );
    }

    // ===========================================
    // MÉTODOS PARA GESTIÓN DE CAMBIOS GLOBALES
    // ===========================================

    // Método para guardar todos los cambios editados
    saveAllChanges(): Observable<any[]> {
        return new Observable(observer => {
            const layers = this.polygonLayers;
            const updates: Observable<any>[] = [];
            const totalLayers = layers.size;
            let savedCount = 0;

            if (totalLayers === 0) {
                observer.next([]);
                observer.complete();
                return;
            }

            console.log(`🔄 Guardando ${totalLayers} vuelos editados...`);

            layers.forEach((layer, flightId) => {
                const geometry = layer.toGeoJSON();
                updates.push(
                    this.updateFlightGeometry(flightId, geometry).pipe(
                        tap(() => {
                            savedCount++;
                            console.log(`✅ Vuelo ${savedCount}/${totalLayers} guardado`);

                            // Actualizar geometría original con la nueva
                            this.originalGeometries.set(flightId, geometry);
                        }),
                        catchError(error => {
                            savedCount++;
                            console.error(`❌ Error al guardar vuelo ${flightId}:`, error);
                            return of({ error: true, flightId, message: error.message });
                        })
                    )
                );
            });

            forkJoin(updates).subscribe({
                next: (results) => {
                    // Limpiar geometrías temporales después de guardar
                    this.tempGeometries.clear();
                    console.log('🎉 Todos los cambios guardados correctamente');
                    this.editingFinishedSubject.next();
                    observer.next(results);
                    observer.complete();
                },
                error: (error) => {
                    console.error('❌ Error al guardar cambios:', error);
                    observer.error(error);
                }
            });
        });
    }

    // Método para cancelar todos los cambios
    cancelAllChanges(): Observable<void> {
        return new Observable(observer => {
            console.log('🔄 Cancelando todos los cambios...');
            let revertedCount = 0;
            const totalLayers = this.polygonLayers.size;

            if (totalLayers === 0) {
                console.log('⚠️ No hay vuelos para cancelar');
                observer.next();
                observer.complete();
                return;
            }

            // Revertir cada capa a su geometría original
            this.polygonLayers.forEach((layer, flightId) => {
                const originalGeometry = this.geometrySnapshots.get(flightId);
                if (originalGeometry && layer.setLatLngs) {
                    try {
                        let coordinates;
                        if (originalGeometry.type === 'Feature') {
                            coordinates = originalGeometry.geometry.coordinates[0];
                        } else if (originalGeometry.type === 'Polygon') {
                            coordinates = originalGeometry.coordinates[0];
                        } else if (originalGeometry.geometry && originalGeometry.geometry.type === 'Polygon') {
                            coordinates = originalGeometry.geometry.coordinates[0];
                        } else {
                            // Asumir que ya son las coordenadas
                            coordinates = originalGeometry;
                        }

                        const latLngs = coordinates.map((coord: [number, number]) =>
                            L.latLng(coord[1], coord[0])
                        );
                        layer.setLatLngs([latLngs]);
                        layer.redraw();

                        revertedCount++;
                        console.log(`↩️ Vuelo ${revertedCount}/${totalLayers} revertido`);
                    } catch (error) {
                        console.error(`❌ Error al revertir vuelo ${flightId}:`, error);
                    }
                }
            });

            // Limpiar datos temporales
            this.tempGeometries.clear();
            this.geometrySnapshots.clear();

            console.log('✅ Todos los cambios cancelados');
            observer.next();
            observer.complete();
        });
    }

    // ===========================================
    // MÉTODOS PARA EDICIÓN INDIVIDUAL AISLADA
    // ===========================================

    loadSingleFlightForEditing(flight: any): void {
        if (!this.map) return;

        console.log(`Cargando vuelo ${flight.vueloId} para edición aislada`);

        // Activar auto-guardado para modo individual
        this.setAutoSaveEnabled(true);

        // 1. Limpiar todo completamente (solo vuelos)
        this.clearMapForSingleFlightEditing();
        this.removeDrawControls();

        // 2. Crear el polígono individual para edición
        const layer = L.geoJSON(flight.geometryVuelo, {
            pmIgnore: false,
            style: {
                color: '#ff0000',
                fillColor: '#ff0000',
                fillOpacity: 0.2,
                weight: 4,
                interactive: true
            }
        });

        // 3. Obtener el polígono y configurarlo
        const polygonLayer = layer.getLayers()[0] as L.Polygon;

        // Asignar propiedades
        (polygonLayer as any)._id = flight.vueloId;
        (polygonLayer.options as ExtendedGeoJSONOptions).idPolygon = flight.vueloId;
        (polygonLayer as any).flightData = flight;

        // 4. Guardar geometría original para posible rollback
        this.originalGeometries.set(flight.vueloId, flight.geometryVuelo);
        this.geometrySnapshots.set(flight.vueloId, JSON.parse(JSON.stringify(flight.geometryVuelo)));

        // 5. Agregar al mapa
        polygonLayer.addTo(this.map);

        // 6. Guardar referencia
        this.polygonLayers.set(flight.vueloId, polygonLayer);

        // 7. Configurar Geoman para edición
        this.setupSingleFlightEditing(polygonLayer, flight.vueloId);
    }

    setupSingleFlightEditing(polygonLayer: L.Polygon, flightId: string): void {
        // 1. Agregar controles de edición (solo los necesarios)
        this.map.pm.addControls({
            position: 'topright',
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawPolygon: false,
            drawCircle: false,
            editMode: true,
            dragMode: false,
            cutPolygon: false,
            removalMode: false,
            rotateMode: false
        });

        // 2. Habilitar modo edición global (pero solo hay un polígono)
        this.map.pm.enableGlobalEditMode({
            snappable: true,
            snapDistance: 20,
            limitMarkersToCount: 99,
            allowEditing: true
        });

        // 3. Asegurar que este polígono sea editable
        if (polygonLayer.pm) {
            polygonLayer.pm.enable({
                allowEditing: true,
                snappable: true,
                snapDistance: 20
            });
        }

        // 4. Configurar evento para guardar cambios (con auto-guardado activado)
        polygonLayer.off('pm:update');
        polygonLayer.on('pm:update', (e: any) => {
            this.handleSingleFlightEdit(e, flightId);
        });

        console.log(`Vuelo ${flightId} listo para edición aislada (auto-guardado ACTIVADO)`);
    }

    handleSingleFlightEdit(e: any, flightId: string): void {
        const layer = e.layer;
        const geometry = layer.toGeoJSON();

        console.log(`Guardando cambios para vuelo ${flightId}...`);

        // 1. Actualizar en backend
        this.updateFlightGeometry(flightId, geometry)
            .subscribe(
                (response) => {
                    console.log('✅ Geometría actualizada en backend');

                    // 2. Actualizar datos locales
                    const flightData = (layer as any).flightData;
                    if (flightData) {
                        flightData.geometryVuelo = geometry;
                    }

                    // 3. Notificar que la edición se completó
                    setTimeout(() => {
                        this.editingFinishedSubject.next();
                    }, 500);
                },
                (error) => {
                    console.error('❌ Error al actualizar', error);
                    // Revertir a la geometría original si hay error
                    this.revertToOriginalGeometry(layer, flightId);
                }
            );
    }

    revertToOriginalGeometry(layer: L.Polygon, flightId: string): void {
        const originalGeometry = this.originalGeometries.get(flightId);
        if (originalGeometry && layer.setLatLngs) {
            try {
                const coordinates = originalGeometry.coordinates[0];
                const latLngs = coordinates.map((coord: [number, number]) =>
                    L.latLng(coord[1], coord[0])
                );
                layer.setLatLngs(latLngs);
                console.log('Geometría revertida a la original');
            } catch (error) {
                console.error('Error al revertir geometría:', error);
            }
        }
    }

    clearMapForSingleFlightEditing(): void {
        // Limpiar solo las capas de vuelos, NO todo el mapa
        this.map.eachLayer((layer: any) => {
            // Solo remover capas que sean vuelos
            if (layer.feature || layer.options?.idPolygon || (layer as any)._id) {
                this.map.removeLayer(layer);
            }
            // NO remover: map base layers, análisis, imágenes, etc.
        });

        // También limpiar las referencias internas
        this.polygonLayers.clear();
        this.originalGeometries.clear();
        this.tempGeometries.clear();
        this.geometrySnapshots.clear();
    }

    cancelEditingAndCleanup(): void {
        if (!this.map) return;

        console.log('Limpiando edición y controles');

        // 1. Deshabilitar Geoman
        this.disableGeomanEditMode();

        // 2. Remover controles
        this.removeDrawControls();

        // 3. Limpiar capas temporales
        this.polygonLayers.clear();
        this.originalGeometries.clear();
        this.tempGeometries.clear();
        this.geometrySnapshots.clear();

        // 4. Limpiar mapa de vuelos
        this.clearMapForSingleFlightEditing();

        // 5. Desactivar auto-guardado
        this.setAutoSaveEnabled(false);
    }

    // ===========================================
    // MÉTODOS AUXILIARES EXISTENTES
    // ===========================================

    // Método para cancelar edición individual
    cancelSingleFlightEditing(flightId: string): Observable<void> {
        return new Observable(observer => {
            console.log(`Cancelando edición del vuelo ${flightId}`);

            // 1. Obtener snapshot original
            const snapshot = this.geometrySnapshots.get(flightId);

            // 2. Revertir visualmente en el mapa
            if (snapshot) {
                this.revertLayerToOriginal(flightId, snapshot);
            }

            // 3. Limpiar todo
            this.clearGeometrySnapshot(flightId);
            this.disableGeomanEditMode();
            this.removeDrawControls();

            // 4. Si hay una capa activa, quitarla
            const layer = this.polygonLayers.get(flightId);
            if (layer) {
                this.map.removeLayer(layer);
                this.polygonLayers.delete(flightId);
            }

            // 5. Limpiar geometría original
            this.originalGeometries.delete(flightId);
            this.tempGeometries.delete(flightId);

            observer.next();
            observer.complete();
        });
    }

    revertLayerToOriginal(flightId: string, originalGeometry: any): void {
        const layer = this.polygonLayers.get(flightId);
        if (layer && layer.setLatLngs) {
            try {
                let coordinates;
                if (originalGeometry.type === 'Feature') {
                    coordinates = originalGeometry.geometry.coordinates[0];
                } else if (originalGeometry.type === 'Polygon') {
                    coordinates = originalGeometry.coordinates[0];
                } else if (originalGeometry.type === 'FeatureCollection') {
                    coordinates = originalGeometry.features[0].geometry.coordinates[0];
                } else {
                    coordinates = originalGeometry;
                }

                const latLngs = coordinates.map((coord: [number, number]) =>
                    L.latLng(coord[1], coord[0])
                );

                layer.setLatLngs([latLngs]);
                layer.redraw();
                console.log(`✅ Vuelo ${flightId} revertido a geometría original`);

                this.originalGeometries.set(flightId, originalGeometry);

            } catch (error) {
                console.error('❌ Error al revertir geometría:', error);
            }
        } else {
            console.warn(`⚠️ No se encontró la capa del vuelo ${flightId} para revertir`);
        }
    }

    saveOriginalGeometrySnapshot(flightId: string, geometry: any): void {
        this.geometrySnapshots.set(flightId, geometry);
    }

    getOriginalGeometrySnapshot(flightId: string): any {
        return this.geometrySnapshots.get(flightId);
    }

    clearGeometrySnapshot(flightId: string): void {
        this.geometrySnapshots.delete(flightId);
    }

    // ===========================================
    // MÉTODOS EXISTENTES PARA VUELOS INDIVIDUALES
    // ===========================================

    addFlightToMap(flight: Flight, noFitBounds: boolean = false) {
        this.map$.
            subscribe((map: L.Map) => {
                const layer = this.createFlightLayer(flight).addTo(map);
                if (!noFitBounds) {
                    const bounds = layer.getBounds();
                    map.fitBounds(bounds);
                }
            }).unsubscribe();
    }

    createFlightLayer(flight: Flight): any {
        const abrirDialogoVuelo = () => {
            this.ownerService.openInfoDialog(flight, 'flight');
        };
        const c = `${flight.colorVuelo}`;

        const geometry: any = flight.geometryVuelo;
        geometry.crs.properties.type = "flight";

        const polygonStyle = {
            color: c,
            fillColor: c,
            pmIgnore: false,
            snapIgnore: false,
            fillOpacity: this.isAddFlightMode ? 0.0 : 0.2,
            weight: this.isAddFlightMode ? 3 : 4,
        }

        const isAddFlightMode = this.isAddFlightMode;

        const layer: any = L.geoJSON(geometry, {
            style: polygonStyle
        });

        if (!isAddFlightMode) {
            layer.bindPopup(
                `<div style="font-size: 14px; font-weight: bold;">
        <p>Propietario: ${flight.propietario}<br>
        Cuadro: ${flight.cuadroVuelo}<br>
        Cultivo: ${flight.cultivoVuelo}<br>
        Fecha: ${this.datePipe.transform(flight.date, 'dd/MM/yyyy')}<br>
        Superficie: ${this.numberPipe.transform(flight.superficieVuelo)} ha<br>
        Piloto: ${flight.pilotoNombreCompleto}<br></p>
      </div>`, { closeButton: true }
            )
                .on("mouseover", (event: L.LeafletMouseEvent) => {
                    event.layer.setStyle({
                        fillOpacity: 0.3
                    });
                    layer.openPopup()
                })
                .on("mouseout", (event: L.LeafletMouseEvent) => {
                    const originalEvent = event.originalEvent;
                    if (!layer._popup || !layer._popup._container.contains(originalEvent.relatedTarget)) {
                        event.layer.setStyle({
                            fillOpacity: isAddFlightMode ? 1 : 0.4
                        });
                        layer.closePopup()
                    }
                })
                .on("click", (_: any) => {
                    layer.closePopup()
                    this.ownerService.openInfoDialog(flight, 'flight')
                })
        } else {
            layer.on("click", (_: any) => {
                // No hacer nada cuando se está en modo edición
            })
        }

        layer.id = flight.vueloId;
        return layer;
    }

    /* Analysis - Using WmsLayerService for robust WMS handling */
    addAnalysisListToMap(ownerAnalysis: any, options?: { zoomToFirst?: boolean }) {
        if (ownerAnalysis === null) return;
        if (!Array.isArray(ownerAnalysis) || ownerAnalysis.length === 0) return;

        this.map$.pipe(take(1)).subscribe((map: L.Map) => {
            ownerAnalysis.forEach((analysis: any, index: number) => {
                const layerName = analysis.imagenAnalisis;
                
                this.wmsLayerService.addWmsLayerToMap(map, layerName, {
                    opacity: 0.7,
                    zoomToBounds: options?.zoomToFirst && index === 0,
                    flyTo: true
                }).subscribe({
                    next: (wmsLayer) => {
                        console.log(`[MapService] Analysis layer added: ${layerName}`);
                    },
                    error: (error) => {
                        console.error(`[MapService] Error adding analysis layer: ${layerName}`, error);
                    }
                });
            });
        });
    }

    addAnalysisToMap(ownerAnalysis: any, options?: { zoomToBounds?: boolean; flyTo?: boolean }) {
        if (!ownerAnalysis) return;

        const layerName = ownerAnalysis.imagenAnalisis;
        
        this.map$.pipe(take(1)).subscribe((map: L.Map) => {
            this.wmsLayerService.addWmsLayerToMap(map, layerName, {
                opacity: 0.7,
                zoomToBounds: options?.zoomToBounds ?? true,
                flyTo: options?.flyTo ?? true
            }).subscribe({
                next: (wmsLayer) => {
                    console.log(`[MapService] Analysis layer added: ${layerName}`);
                },
                error: (error) => {
                    console.error(`[MapService] Error adding analysis layer: ${layerName}`, error);
                }
            });
        });
    }

    createAnalysisLayer(analysis: any) {
        const layerName = analysis.imagenAnalisis;
        console.log(`[MapService] Creating analysis layer: ${layerName} with URL: ${this.geoServerUrl}`);
        return this.wmsLayerService.createWmsLayer(layerName);
    }

    /* Search and add WMS layers from any Geoserver (for future feature) */
    addWmsLayerFromUrl(map: L.Map, layerName: string, geoserverUrl: string, options?: {
        opacity?: number;
        zoomToBounds?: boolean;
        flyTo?: boolean;
    }): Observable<L.Layer> {
        return this.wmsLayerService.addWmsLayerToMap(map, layerName, {
            geoserverUrl: geoserverUrl,
            opacity: options?.opacity,
            zoomToBounds: options?.zoomToBounds ?? true,
            flyTo: options?.flyTo ?? false
        });
    }

    /* Search layers in a Geoserver */
    searchWmsLayers(query: string, geoserverUrl?: string): Observable<any[]> {
        return this.wmsLayerService.searchLayers(query, geoserverUrl);
    }

    /* Get all layers from a Geoserver */
    getWmsLayers(geoserverUrl?: string): Observable<any[]> {
        return this.wmsLayerService.getCapabilities(geoserverUrl).pipe(
            map(capabilities => capabilities.layers)
        );
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
            templineStyle: { color: c } as any,
            hintlineStyle: { color: c } as any
        });
        this.map.pm.disableDraw();
        this.map.pm.setPathOptions({
            color: c,
            fillColor: c,
            fillOpacity: 0.7,
        });
    }

    addDrawControlsFlight() {
        const c = '#ff0000';

        this.map.pm.addControls({
            position: 'topright',
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawPolygon: true,
            drawCircle: false,
            editMode: false,
            cutPolygon: false,
            rotateMode: false,
            drawText: false,
        });
        this.map.pm.enableDraw('Polygon', {
            templineStyle: { color: c } as any,
            hintlineStyle: { color: c } as any
        });
        this.map.pm.disableDraw();
        this.map.pm.setPathOptions({
            color: c,
            fillColor: c,
            fillOpacity: 0.7,
        });
    }

    addDrawControlsFlightEdit() {
        const c = '#ff0000';

        this.map.pm.addControls({
            position: 'topright',
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawPolygon: false,
            drawCircle: false,
            editMode: true,
            cutPolygon: false,
            rotateMode: false,
            drawText: false,
            removalMode: false,
            dragMode: false,
        });
        this.map.pm.enableDraw('Polygon', {
            templineStyle: { color: c } as any,
            hintlineStyle: { color: c } as any
        });
        this.map.pm.disableDraw();
        this.map.pm.setPathOptions({
            color: c,
            fillColor: c,
            fillOpacity: 0.1,
        });
    }

    flyToBounds(coordinates: any[]): void {
        const latLngs = coordinates.map((coord) => L.latLng(coord[1], coord[0]));
        const bounds = L.latLngBounds(latLngs).pad(0.1);
        this.map.fitBounds(bounds, { animate: true, duration: 0.5 });
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

    addReferences() {
        this.references = true;
    }

    removeReferences() {
        this.references = false;
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

    toggleReferences() {
        document.querySelector('.references')?.classList.toggle('.references--active');
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
        this.removeReferences();
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
        return this.http.post<any>(`${this.baseUrl}/indice/google/`, req).pipe(
            catchError(error => {
                console.error('Error:', error);
                return throwError(error);
            })
        );
    }

    hideFlight(flight: any) {
        this.map$.subscribe((map: L.Map) => {
            map.eachLayer((layer: any) => {
                if (layer.id === flight.vueloId) {
                    layer.setOpacity(0);
                }
            });
        });
    }

    showFlight(flight: any) {
        this.map$.subscribe((map: L.Map) => {
            map.eachLayer((layer: any) => {
                if (layer.id === flight.vueloId) {
                    layer.setOpacity(1);
                }
            });
        });
    }
}







