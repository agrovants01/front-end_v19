import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FlightService {

    private baseUrl: string = environment.baseUrl;

    public elementDeleted: Subject<any> = new Subject();
    public elementUpdated: Subject<any> = new Subject();

    constructor(
        private http: HttpClient
    ) { }


    saveFlight(req: any): Observable<any[]> {
        return this.http.post<any[]>(`${this.baseUrl}/vuelo/`, req);
    }

    // // actualizaPoligono en backend
    // updateFlightGeometry(flightId: string, geometry: any): Observable<any> {
    //     const url = `${this.baseUrl}/actualizaVuelo/${flightId}/geometry`;
    //     return this.http.put(url, { geometry });
    // }

    getOwnerObservations(usuarioId: string, fechaDesde: Date, fechaHasta: Date) {

        const params = new HttpParams().appendAll({
            fechaDesde: fechaDesde.toString(),
            fechaHasta: fechaHasta.toString(),
            propietarioObservacion: usuarioId
        });
        return this.http.get<any>(
            `${this.baseUrl}/observacion/${usuarioId}`, { params }
        )
    }

    deleteObservation(observacionId: string): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/observacion/bajaObservacion/${observacionId}`, {});
    }


}
