import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpHeaders
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class JWTInterceptor implements HttpInterceptor {

    constructor() { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        // Excluir las APIs externas
        if (this.isExternalAPI(request.url)) {
            return next.handle(request);
        }

        // El token se envía automáticamente via cookie HttpOnly
        // Solo agregamos withCredentials para asegurar que las cookies se envíen
        const currentRequest = request.clone({
            withCredentials: true
        });

        return next.handle(currentRequest);
    }

    /**
     * Verifica si la URL es de una API externa que no requiere token
     */
    private isExternalAPI(url: string): boolean {
        const externalAPIs = [
            'open-meteo.com',
            'api.open-meteo.com',
            'nominatim.openstreetmap.org',
            'tile.openstreetmap.org',
        ];

        return externalAPIs.some(api => url.includes(api));
    }
}
