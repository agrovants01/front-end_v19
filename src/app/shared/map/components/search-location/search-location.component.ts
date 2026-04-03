import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import * as L from 'leaflet';

@Component({
  standalone: false,
    selector: 'app-search-location',
    templateUrl: './search-location.component.html',
    styles: []
})
export class SearchLocationComponent implements OnChanges, OnDestroy {

    @Input('map')
    map: L.Map | undefined;

    private searchControl: any;
    private initialized = false; // Bandera para controlar inicialización única

    constructor() { }

    initSearch() {
        // Evitar múltiples inicializaciones
        if (this.initialized || !this.map) return;

        // Add search box
        const providerOSM = new OpenStreetMapProvider();

        this.searchControl = GeoSearchControl({
            provider: providerOSM,
            style: 'button',
            searchLabel: 'Buscar ubicación...',
            notFoundMessage: 'No se pudo encontrar la ubicación indicada.',
            autoClose: true,
        });

        this.map.addControl(this.searchControl);
        this.initialized = true; // Marcar como inicializado

        // Añadir clase para estilos
        const geosearchElement = this.searchControl.getContainer();
        geosearchElement?.classList.add('no-print');
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Solo inicializar si hay un mapa y no se ha inicializado antes
        if (this.map && !this.initialized && changes['map']?.currentValue) {
            // Pequeño delay para asegurar que el mapa esté listo
            setTimeout(() => {
                this.initSearch();
            }, 100);
        }
    }

    ngOnDestroy(): void {
        // Limpiar el control al destruir el componente
        if (this.searchControl && this.map) {
            this.map.removeControl(this.searchControl);
        }
    }
}
