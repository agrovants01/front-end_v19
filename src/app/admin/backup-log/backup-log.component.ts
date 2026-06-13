import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { AdminService } from '../services/admin.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface BackupEvent {
    tipo: string;
    backupId: string;
    nombreBackup: string;
    fecha: string;
    usuarioId: string | null;
    usuarioAlias: string | null;
    ip: string | null;
    nota?: string;
}

@Component({
    standalone: false,
    selector: 'app-backup-log',
    templateUrl: './backup-log.component.html',
    styleUrls: ['./backup-log.component.css']
})
export class BackupLogComponent implements OnInit, OnDestroy {

    @ViewChild('tableWrapper') tableWrapper!: ElementRef;
    private unsubscribe$ = new Subject<void>();
    eventos: BackupEvent[] = [];
    isLoading = true;
    autoRefresh = true;
    refreshInterval: any;

    constructor(private _adminService: AdminService) { }

    ngOnInit(): void {
        this.loadLog();

        this.refreshInterval = setInterval(() => {
            if (this.autoRefresh) {
                this.loadLog();
            }
        }, 30000);
    }

    scrollToBottom(): void {
        setTimeout(() => {
            if (this.tableWrapper) {
                const wrapper = this.tableWrapper.nativeElement;
                wrapper.scrollTop = wrapper.scrollHeight;
            }
        }, 100);
    }

    loadLog(): void {
        this.isLoading = true;
        this._adminService.getBackupLog()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((response: any) => {
                this.eventos = response.eventos || [];
                this.isLoading = false;
                this.scrollToBottom();
            }, (error) => {
                console.error('Error al cargar log:', error);
                this.isLoading = false;
            });
    }

    toggleAutoRefresh(): void {
        this.autoRefresh = !this.autoRefresh;
    }

    getTipoLabel(tipo: string): string {
        const labels: { [key: string]: string } = {
            'backup': 'Backup',
            'restauracion': 'Restauración',
            'eliminacion': 'Eliminación'
        };
        return labels[tipo] || tipo;
    }

    getTipoClass(tipo: string): string {
        const classes: { [key: string]: string } = {
            'backup': 'tipo-backup',
            'restauracion': 'tipo-restauracion',
            'eliminacion': 'tipo-eliminacion'
        };
        return classes[tipo] || '';
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}
