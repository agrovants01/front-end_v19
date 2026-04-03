import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ReportService {

    private baseUrl: string = environment.baseUrl;

    constructor(
        private http: HttpClient
    ) { }

    //reporteVuelo en controllers
    getFlightsByDate(req: any): Observable<any[]> {
        return this.http.post<any[]>(`${this.baseUrl}/reporte/vuelosReporte/`, req);
    }

    //reporte en controllers
    generateReport(req: any): Observable<HttpResponse<any[]>> {
        return this.http.post<any>(`${this.baseUrl}/reporte/reporte/`, req, {
            responseType: (('arraybuffer') as any) as 'json',
            observe: 'response'
        });
    }

}
