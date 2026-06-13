import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BackupLoginService } from '../services/backup-login.service';

@Injectable({
    providedIn: 'root'
})
export class BackupGuard implements CanActivate {

    constructor(
        private backupLoginService: BackupLoginService,
        private router: Router
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): boolean {
        if (!this.backupLoginService.hasRequiredRole()) {
            this.router.navigate(['/admin']);
            return false;
        }

        if (!this.backupLoginService.isBackupAuthenticated()) {
            this.router.navigate(['/admin/backup-login'], {
                queryParams: { returnUrl: state.url }
            });
            return false;
        }

        return true;
    }
}
