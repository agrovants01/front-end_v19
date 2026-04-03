import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth } from '../aut.interface';
import { AuthService } from '../services/auth.service';
import { tap } from 'rxjs/operators';
import { errorAlert } from '../../shared/services/alerts';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanLoad {

    constructor(private router: Router, private authService: AuthService) { }

    private _auth!: Auth | undefined;

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

        return this.authService.verifyUser()
            .pipe(
                tap((authState: boolean) => {
                    if (!authState) {
                        this.router.navigate(['auth/login']);
                    }

                })
            )
    }
    canLoad(
        route: Route,
        segments: UrlSegment[]): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

        return this.authService.verifyUser()
            .pipe(
                tap((authState: boolean) => {
                    if (!authState) {
                        this.router.navigate(['auth/login']);
                    }

                })
            )

    }
}
