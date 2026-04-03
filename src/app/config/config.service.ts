import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
    providedIn: 'root'
})
export class ConfigService {

    constructor(private http: HttpClient) { }

    private baseUrl: string = environment.baseUrl;

    changePassword(password: any): Observable<any> {
        const userId: string = localStorage.getItem('id') || '';
        return this.http.put<any>(
            `${this.baseUrl}/usuario/editContrasenia/${userId}`, password
        );
    }

    changeEmail(email: any): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/usuario/requestChangeMail`, email
        );
    }


    updateUser(user: any): Observable<any> {
        const userId: string = localStorage.getItem('id') || '';
        return this.http.put<any>(
            `${this.baseUrl}/usuario/editUsuario/${userId}`, user
        );
    }

}
