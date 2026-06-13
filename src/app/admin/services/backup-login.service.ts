import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class BackupLoginService {

    private readonly BACKUP_AUTH_KEY = 'backup_auth_token';
    private baseUrl: string = environment.baseUrl;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    hasRequiredRole(): boolean {
        const perfil = this.authService.auth.perfilUsuario?.toUpperCase();
        return perfil === 'ADMIN';
    }

    isBackupAuthenticated(): boolean {
        return !!sessionStorage.getItem(this.BACKUP_AUTH_KEY);
    }

    authenticate(password: string): Observable<boolean> {
        return this.http.post<any>(`${this.baseUrl}/backup/verify-password`, { password })
            .pipe(
                map((response) => {
                    if (response.success && response.token) {
                        sessionStorage.setItem(this.BACKUP_AUTH_KEY, response.token);
                        return true;
                    }
                    return false;
                }),
                catchError(() => of(false))
            );
    }

    logout(): void {
        sessionStorage.removeItem(this.BACKUP_AUTH_KEY);
    }
}
