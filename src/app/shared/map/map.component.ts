import * as L from 'leaflet';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import 'node_modules/leaflet-geoserver-request/src/L.Geoserver.js';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { MapService } from '../services/map.service';
import { GlobalsService } from '../services/globals.service';
import '@geoman-io/leaflet-geoman-free';
import { OrdenPedidoFormComponent } from '../../admin/orden-pedido/orden-pedido-form.component';
import { AdminService } from '../../admin/services/admin.service';

@Component({
    standalone: false,
    selector: 'app-map',
    host: { class: 'flex-1' },
    templateUrl: './map.component.html',
    styles: [],
})
export class MapComponent implements OnInit, OnDestroy {

    map!: L.Map;
    mostrarPronostico = false;
    isPickingLocation = false;
    pendingLocationMarker?: L.Marker;
    orderMarkersLayer = L.layerGroup();
    private _locationClickHandler?: (e: L.LeafletMouseEvent) => void;
    private _unsubscribe$ = new Subject<void>();
    private _ordenesVisible = true;

    constructor(
        public mapService: MapService,
        public globalsService: GlobalsService,
        private dialog: MatDialog,
        private adminService: AdminService,
        private router: Router,
    ) {
        L.Icon.Default.imagePath = "assets/leaflet/";
    }

    ngOnInit(): void {
        this.initMap();
        setTimeout(() => this._loadPinsIfOwnerRoute());
        this.router.events.pipe(
            filter(e => e instanceof NavigationEnd),
            takeUntil(this._unsubscribe$)
        ).subscribe(() => this._loadPinsIfOwnerRoute());
    }

    ngOnDestroy(): void {
        this._unsubscribe$.next();
        this._unsubscribe$.complete();
    }

    private initMap(): void {
        const center: L.LatLngExpression = [-32.833510288166, -68.60657620532825];
        this.map = L.map('map', {
            center: center,
            zoom: 7,
            maxZoom: 20,
            minZoom: 3,
            zoomDelta: 0.25,
            zoomSnap: 0,
            zoomControl: false,
            attributionControl: false
        });

        const zoomControl = L.control.zoom({ position: 'topright' });
        zoomControl.addTo(this.map);
        zoomControl.getContainer()?.classList.add('no-print');

        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 30,
            minZoom: 3,
        }).addTo(this.map);

        this.map.pm.setLang('es');
        this.mapService.setMap(this.map);

        this.orderMarkersLayer.addTo(this.map);

        this.mapService.ordenesVisible$
            .pipe(takeUntil(this._unsubscribe$))
            .subscribe(visible => {
                this._ordenesVisible = visible;
                if (visible && /^\/owner\//.test(this.router.url) && !this.router.url.includes('/add-flight')) {
                    this.orderMarkersLayer.addTo(this.map);
                    this.loadOrderPins();
                } else if (!visible) {
                    this.map.removeLayer(this.orderMarkersLayer);
                }
            });

        this.mapService.reloadOrdenesPins$
            .pipe(takeUntil(this._unsubscribe$))
            .subscribe(() => this._loadPinsIfOwnerRoute());
    }

    private _loadPinsIfOwnerRoute(): void {
        if (/^\/owner\//.test(this.router.url) && !this.router.url.includes('/add-flight') && this._ordenesVisible) {
            this.orderMarkersLayer.addTo(this.map);
            this.loadOrderPins();
        }
    }

    togglePronosticoTiempo(): void {
        this.mostrarPronostico = !this.mostrarPronostico;
    }

    get perfilPermitido(): boolean {
        const perfil = localStorage.getItem('perfil');
        return perfil === 'ADMIN' || perfil === 'PILOTO';
    }

    get propietarioSeleccionado(): boolean {
        return !!localStorage.getItem('nombreCompleto')
            && /^\/owner\//.test(this.router.url)
            && !this.router.url.includes('/add-flight');
    }

    private _greenIcon(): L.DivIcon {
        return L.divIcon({
            className: '',
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.4"/>
                    </filter>
                </defs>
                <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#4CAF50" stroke="#333" stroke-width="1.5" filter="url(#shadow)"/>
                <circle cx="12.5" cy="12.5" r="5" fill="white" stroke="#333" stroke-width="1"/>
            </svg>`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            tooltipAnchor: [16, -28],
        });
    }

    toggleOrdenesPedido(coordenadas?: string): void {
        if (!this.propietarioSeleccionado) return;

        const dialogRef = this.dialog.open(OrdenPedidoFormComponent, {
            width: '800px',
            maxHeight: '95vh',
            disableClose: true,
            data: {
                coordenadas,
                nombreCompleto: localStorage.getItem('nombreCompleto'),
                desdeMapa: true,
            },
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result === true) {
                this.loadOrderPins(() => this._removePendingMarker());
            } else if (result?.pickLocation) {
                this._enterLocationPickerMode();
            } else {
                this._removePendingMarker();
            }
        });
    }

    private _openOrdenReadonly(orden: any): void {
        const dialogRef = this.dialog.open(OrdenPedidoFormComponent, {
            width: '800px',
            maxHeight: '95vh',
            disableClose: false,
            data: {
                ...orden,
                soloLectura: true,
                desdeMapa: false,
                nombreCompleto: localStorage.getItem('nombreCompleto'),
            },
        });
        dialogRef.afterClosed().subscribe(() => {});
    }

    private _enterLocationPickerMode(): void {
        this.isPickingLocation = true;
        this._removePendingMarker();
        this.map.getContainer().style.cursor = 'crosshair';

        this._locationClickHandler = (e: L.LeafletMouseEvent) => {
            const coords = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
            this.pendingLocationMarker = L.marker(e.latlng, { icon: this._greenIcon() }).addTo(this.map);
            this.pendingLocationMarker.on('add', () => this.pendingLocationMarker?.getElement()?.classList.add('no-print'));
            this.isPickingLocation = false;
            this.map.getContainer().style.cursor = '';
            if (this._locationClickHandler) {
                this.map.off('click', this._locationClickHandler);
                this._locationClickHandler = undefined;
            }
            this.toggleOrdenesPedido(coords);
        };

        this.map.on('click', this._locationClickHandler);
    }

    private _removePendingMarker(): void {
        if (this.pendingLocationMarker) {
            this.map.removeLayer(this.pendingLocationMarker);
            this.pendingLocationMarker = undefined;
        }
    }

    private loadOrderPins(onComplete?: () => void): void {
        this.orderMarkersLayer.clearLayers();
        this.adminService.getUbicacionesOrdenes().subscribe({
            next: (ordenes) => {
                for (const orden of ordenes) {
                    if (!orden.opUbicacion) continue;
                    const parts = orden.opUbicacion.split(',').map(s => parseFloat(s.trim()));
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        const marker = L.marker([parts[0], parts[1]], { icon: this._greenIcon() });
                        marker.on('add', () => marker.getElement()?.classList.add('no-print'));
                        marker.bindPopup(
                            `<div style="font-size: 14px; font-weight: bold;">
                                <p>Orden de pedido: ${orden.opNomenclatura}</p>
                            </div>`,
                            { closeButton: true, offset: L.point(0, -38) }
                        );
                        marker.on('mouseover', () => marker.openPopup());
                        marker.on('mouseout', (e: L.LeafletMouseEvent) => {
                            const popup: any = marker.getPopup();
                            if (!popup || !popup._container?.contains(e.originalEvent?.relatedTarget as Node)) {
                                marker.closePopup();
                            }
                        });
                        marker.on('click', () => {
                            this._openOrdenReadonly(orden);
                        });
                        marker.addTo(this.orderMarkersLayer);
                    }
                }
                onComplete?.();
            },
            error: () => onComplete?.(),
        });
    }

    test() {
        const coordinates: [number, number][] = [
            [-32.832726481394324, -68.61285696497058],
            [-32.83363518632619, -68.60664492065206],
            [-32.83511986138191, -68.6068705809323],
            [-32.83431492015577, -68.61307410976855]
        ];

        const polygon = L.polygon(coordinates, { color: this.globalsService.randomColor() }).addTo(this.map);
        const bounds = polygon.getBounds();
        this.map.fitBounds(bounds);

        const imageUrl = 'https://i.stack.imgur.com/wbRrq.png';
        L.imageOverlay(imageUrl, bounds).addTo(this.map);

        this.mapService.addDrawControls();
        this.mapService.removeDrawControls();
    }

}
