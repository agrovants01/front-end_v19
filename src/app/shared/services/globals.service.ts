import { Injectable } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from 'src/app/auth/services/auth.service';
import { NavigationExtras } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class GlobalsService {

    desktop: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
    activatedRoute: ActivatedRoute | null | undefined;


    constructor(
        private breakpointObserver: BreakpointObserver,
        public router: Router,
        private location: Location,
        private _authService: AuthService,
        private route: ActivatedRoute
    ) {
        /* Desktop Media Query */
        const desktop = '(min-width: 1024px)';
        this.breakpointObserver
            .observe([desktop])
            .subscribe((state: BreakpointState) => {
                state.matches ? this.desktop.next(true) : this.desktop.next(false);
            });
    }

    getMonth = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    getWeek(week: any) {
        switch (week) {
            case 's1':
                return 1;
            case 's2':
                return 2;
            case 's3':
                return 3;
            case 's4':
                return 4;
            default:
                const day: number = week.getDate();
                if (1 <= day && day <= 7) {
                    return 1;
                } else if (7 < day && day <= 14) {
                    return 2;
                } else if (14 < day && day <= 21) {
                    return 3;
                } else if (21 < day) {
                    return 4;
                } else {
                    return 'Error';
                }
        }
    }

    formatDate(date: Date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }

    randomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 100%, 50%)`;
    }

    hasRoute(route: string) {
        return this.router.url.includes(route);
    }

    // goHome() {
    //     if (this._authService.auth.perfilUsuario.toLocaleUpperCase() === 'ADMIN') {
    //         this.router.navigateByUrl('/owners');
    //     }
    //     if (this._authService.auth.perfilUsuario.toLocaleUpperCase() === 'PILOTO') {
    //         this.router.navigateByUrl(`/flights/${this._authService.auth.usuarioId}`);
    //     }
    //     if (this._authService.auth.perfilUsuario.toLocaleUpperCase() === 'PROPIETARIO') {
    //         this.router.navigateByUrl(`/owner/${this._authService.auth.usuarioId}`);
    //     }
    //     if (this._authService.auth.perfilUsuario.toLocaleUpperCase() === 'ADMINISTRATIVO') {
    //         this.router.navigateByUrl('/admin');
    //     }
    // }

    goHome() {
        const perfil = localStorage.getItem('perfil');
        switch (perfil) {
            case 'ADMIN':
                this.router.navigateByUrl('/owners');
                break;
            case 'ADMINISTRATIVO':
                this.router.navigateByUrl('/admin');
                break;
            case 'PROPIETARIO':
                this.router.navigateByUrl(`/owner/${localStorage.getItem('id')}`);
                break;
            case 'PILOTO':
                this.router.navigateByUrl('/owners');
                break;
            default:
                console.error('Perfil no reconocido');
        }
    }

    goLogin() {
        this._authService.logOut();
        this.router.navigateByUrl('/auth/login');
    }

    return() {

        this.location.back();
    }

    private isReloading = false;

    reloadPage() {
        const randomParam = Math.random();
        this.router.navigate([this.router.url], {
            queryParams: { reload: randomParam },
            skipLocationChange: true,
            replaceUrl: true
        });
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
}
