import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class OwnerGuard implements CanActivate {

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot): Observable<boolean> {

        return this.authService.verifyUser().pipe(
            tap((isAuthenticated) => {
                if (!isAuthenticated) {
                    this.router.navigate(['/auth/login']);
                    return;
                }
            }),
            map((isAuthenticated) => {
                if (!isAuthenticated) {
                    return false;
                }

                const perfil = this.authService.auth.perfilUsuario?.toUpperCase() || '';
                const path = route.routeConfig?.path || '';
                const urlId = route.params.id;

                if (path === 'owners') {
                    if (perfil === 'ADMINISTRATIVO') {
                        this.router.navigate(['/404']);
                        return false;
                    }
                    return true;
                }

                if (path.startsWith('flights/')) {
                    if (perfil !== 'PILOTO' && perfil !== 'ADMIN') {
                        this.router.navigate(['/404']);
                        return false;
                    }
                    return true;
                }

                if (path.startsWith('owner/')) {
                    const userId = localStorage.getItem('idUsuarioLogueado');
                    if (perfil === 'ADMIN' || perfil === 'ADMINISTRATIVO' || perfil === 'PILOTO') {
                        return true;
                    }
                    if (urlId !== userId) {
                        this.router.navigate(['/404']);
                        return false;
                    }
                    return true;
                }

                return true;
            }),
            catchError(() => {
                this.router.navigate(['/auth/login']);
                return of(false);
            })
        );
    }
}
