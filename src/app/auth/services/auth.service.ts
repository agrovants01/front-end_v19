import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Auth } from '../aut.interface';
import { Login } from '../pages/login/login.interface';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router) { }

    private baseUrl: string = environment.baseUrl;

    private _auth!: Auth | undefined;

    get auth(): Auth {
        return { ...this._auth! };
    }

    verifyUser(): Observable<boolean> {
        return this.http.get<Auth>(`${this.baseUrl}/usuario/auth`, { withCredentials: true })
            .pipe(
                map((auth: Auth) => {
                    this._auth = auth;
                    return true
                }),
                catchError((error: any) => {
                    console.log(error);
                    return of(false)
                })
            );

    }
    verifyOwner(urlId: string | undefined): Observable<boolean> {

        const id = localStorage.getItem('idUsuarioLogueado');

        if (!id) {
            return of(false)
        }

        if (urlId === id || this.auth.perfilUsuario.toLocaleUpperCase() === 'ADMIN'
                         || this.auth.perfilUsuario.toLocaleUpperCase() === 'PILOTO'
                         || this.auth.perfilUsuario.toLocaleUpperCase() === 'ADMINISTRATIVO'
                         || this.auth.perfilUsuario.toLocaleUpperCase() === 'CONTRATISTA'

        ) {
            return of(true);
        }

        return of(false)

    }

    login(data: Login): Observable<any> {
        return this.http.post(`${this.baseUrl}/usuario/login`, data, { withCredentials: true })
            .pipe(
                tap((auth: any) => this._auth = {
                    usuarioId: auth.Idusuario,
                    perfilUsuario: auth.perfilUsuario
                }),
                tap(auth => localStorage.setItem('idUsuarioLogueado', auth.Idusuario)),
            );
    }

    resetPass(data: { token: string, newPassword: string }): Observable<any> {
        return this.http.post(`${this.baseUrl}/usuario/resetPass`, data)
            .pipe(
                tap((response: any) => console.log(response)),
                catchError((error: any) => {
                    console.log(error);
                    return of(error);
                })
            );
    }


    resetPassword(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/usuario/requestResetPass`, data)
    }


    logOut() {
        this.http.post(`${this.baseUrl}/usuario/logout`, {}, { withCredentials: true }).subscribe({
            next: () => {
                localStorage.clear();
                this._auth = undefined;
            },
            error: () => {
                localStorage.clear();
                this._auth = undefined;
            }
        });
    }


}
