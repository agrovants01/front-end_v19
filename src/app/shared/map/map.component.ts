import * as L from 'leaflet';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import 'node_modules/leaflet-geoserver-request/src/L.Geoserver.js';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { MapService } from '../services/map.service';
import { GlobalsService } from '../services/globals.service';
import '@geoman-io/leaflet-geoman-free';


@Component({
    standalone: false,
    selector: 'app-map',
    host: { class: 'flex-1' },
    templateUrl: './map.component.html',
    styles: [],
})
export class MapComponent implements OnInit {

    map!: L.Map;

    constructor(
        public mapService: MapService,
        public globalsService: GlobalsService,
    ) {
        L.Icon.Default.imagePath = "assets/leaflet/";
    }

    ngOnInit(): void {
        this.initMap();
    }

    private initMap(): void {
        /* Map initialization */
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

        /* Set zoom control */
        //L.control.zoom({ position: 'topright' }).addTo(this.map);

        const zoomControl = L.control.zoom({ position: 'topright' });
        zoomControl.addTo(this.map);

        const zoomControlElement = zoomControl.getContainer();

        zoomControlElement?.classList.add('no-print');


        /* Add tile layer */
        const googleTile = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 30,
            minZoom: 3,
        }).addTo(this.map);




        /* Set language to spanish */
        this.map.pm.setLang('es');

        /* Set map in mapService */
        this.mapService.setMap(this.map);

    }




    test() {
        /* Polygon example */
        const coordinates: [number, number][] = [
            [-32.832726481394324, -68.61285696497058],
            [-32.83363518632619, -68.60664492065206],
            [-32.83511986138191, -68.6068705809323],
            [-32.83431492015577, -68.61307410976855]
        ];

        const polygon = L.polygon(coordinates, { color: this.globalsService.randomColor() }).addTo(this.map);
        const bounds = polygon.getBounds();
        this.map.fitBounds(bounds);

        /* Image overlay example */
        const imageUrl = 'https://i.stack.imgur.com/wbRrq.png';
        L.imageOverlay(imageUrl, bounds).addTo(this.map);


        /* Add and remove draw controls */
        this.mapService.addDrawControls();
        this.mapService.removeDrawControls();

    }

    // Agrega esta propiedad a la clase:
    mostrarPronostico: boolean = false;

    // Y este método:
    togglePronosticoTiempo(): void {
        this.mostrarPronostico = !this.mostrarPronostico;
    }

}
