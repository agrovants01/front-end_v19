import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminService } from '../services/admin.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-backup-auto',
    templateUrl: './backup-auto.component.html',
    styleUrls: ['./backup-auto.component.css']
})
export class BackupAutoComponent implements OnInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();
    
    status: any = null;
    autoLogs: any[] = [];
    isLoading = true;
    isLoadingLogs = false;

    constructor(private _adminService: AdminService) { }

    ngOnInit(): void {
        this.loadStatus();
        this.loadAutoLogs();
    }

    loadStatus(): void {
        this.isLoading = true;
        this._adminService.getAutoBackupStatus()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((response: any) => {
                this.status = response;
                this.isLoading = false;
            }, (error) => {
                console.error('Error al cargar estado:', error);
                this.isLoading = false;
            });
    }

    loadAutoLogs(): void {
        this.isLoadingLogs = true;
        this._adminService.getBackupLog()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((response: any) => {
                this.autoLogs = (response.eventos || [])
                    .filter((e: any) => e.nombreBackup && e.nombreBackup.startsWith('BACKUP_AUTO_'))
                    .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                this.isLoadingLogs = false;
            }, (error) => {
                console.error('Error al cargar logs automáticos:', error);
                this.isLoadingLogs = false;
            });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
