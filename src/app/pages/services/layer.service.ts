import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, of, Subject } from 'rxjs';
import { LayerTypeInput, LayerUpload } from '../../admin/upload-analysis-layer/analysisLayer.interface';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class LayerService {

    public elementDeleted: Subject<any> = new Subject();
    public elementUpdated: Subject<any> = new Subject();

    private baseUrl: string = environment.baseUrl;
    private geoserverUrl: string = environment.geoServerUrl;

    constructor(private http: HttpClient) { }

    /* Backend */

    getLayersTypes(): Observable<LayerTypeInput[]> {
        return this.http.get<any[]>(
            `${this.baseUrl}/indice/`
        )
    }

    saveLayer(layer: LayerUpload) {
        return this.http.post<LayerUpload>(
            `${this.baseUrl}/analisis/`,
            layer
        );
    }

    getOwnerAnalysisLayers(usuarioId: string, fechaDesde: Date, fechaHasta: Date) {
        const params = new HttpParams().appendAll({
            fechaDesde: fechaDesde.toString(),
            fechaHasta: fechaHasta.toString(),
        });
        return this.http.get<any>(
            `${this.baseUrl}/analisis/usuario/${usuarioId}`, { params }
        ).pipe(
            map(data => {
                if (data && data.forEach) {
                    data.forEach((analysis: any) => {
                        if (analysis.indice && analysis.indice.rangos) {
                            analysis.indice.rangos = this.getIndexColors(analysis.indice.rangos);
                        }
                    });
                }
                return data;
            }),
            catchError((error: any) => {
                console.error('[LayerService] Error fetching analysis layers:', error);
                return of(null);
            })
        );
    }

    deleteAnalysis(analisisId: string) {
        return this.http.put<any>(`${this.baseUrl}/analisis/bajaAnalisis/${analisisId}`, {});
    }

    getIndexColors(rangos: any) {
        rangos.sort((a: any, b: any) => a.desdeRango - b.desdeRango);
        let colors = '';
        rangos.forEach((rango: any) => {
            if (rangos.indexOf(rango) == 0) {
                colors += `${rango.colorRango}`
            } else {
                colors += `, ${rango.colorRango}`
            }
        });
        return `linear-gradient(${colors})`;
    }

    /* FakeBackend */

    getLayersTypesFake(): Observable<LayerTypeInput[]> {
        return this.http.get<LayerTypeInput[]>(
            `${this.baseUrl}/indices/`
        );
    }

    saveLayerFake(layer: LayerUpload) {
        const data = {
            id: Math.random,
            fechaAnalisis: layer.fechaAnalisis,
            imagenAnalisis: layer.imagenAnalisis,
            propietarioAnalisisId: layer.propietarioAnalisisId,
            indiceAnalisisId: layer.indiceAnalisisId
        };
        return this.http.post<LayerUpload>(
            `${this.baseUrl}/capas`,
            data
        );
    }

}
