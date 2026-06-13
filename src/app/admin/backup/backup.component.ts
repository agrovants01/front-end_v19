import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BackupLoginService } from '../services/backup-login.service';

@Component({
    standalone: false,
    selector: 'app-backup',
    templateUrl: './backup.component.html',
    styleUrls: ['./backup.component.css']
})
export class BackupAdminComponent {

    constructor(
        private backupLoginService: BackupLoginService,
        private router: Router
    ) { }

    logout(): void {
        this.backupLoginService.logout();
        this.router.navigate(['/admin']);
    }
}
