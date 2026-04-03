import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { OwnerDataInfoComponent } from '../components/owner-data-info/owner-data-info.component';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})

// Creado por mi para recuperar todos los vuelos creados.
export class FlightsService {

    private baseUrl: string = environment.baseUrl;

    constructor(
        private http: HttpClient,
        private dialog: MatDialog

    ) { }


    getAllFlights() {

        // Este endpoint seria "vueloGetAll" en el backend para el admin, muestra todos los vuelos en el modo admin antes de hacer nada.
        return this.http.get<any>(
            `${this.baseUrl}/vuelo/edicion`,
        )
    }


    openInfoDialog(data: any, type: string) {
        this.dialog.open(OwnerDataInfoComponent, {
            data: {
                type,
                data
            }
        })
    }


}
