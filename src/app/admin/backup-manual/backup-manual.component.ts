import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { confirmAlert, errorAlert, successAlert } from 'src/app/shared/services/alerts';
import Swal from 'sweetalert2';
import { BackupFormComponent } from '../components/backup-form/backup-form.component';
import { AdminService } from '../services/admin.service';
import { Backup } from '../backup/backup.interface';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';

@Component({
    selector: 'app-backup-manual',
    templateUrl: './backup-manual.component.html',
    styleUrls: ['./backup-manual.component.css']
})
export class BackupManualComponent implements AfterViewInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();
    private refresh$ = new Subject<void>();

    addingBackup: boolean = false;

    displayedColumns: string[] = [
        'nombreBackup',
        'fechaHoraBackup',
        'respaldadoPor',
        'fechaRestauracion',
        'restauradoPor',
        'options'
    ];

    pageSizeOptions: number[] = pageSizeOptions;

    data: Backup[] = [];
    searchBackup: FormControl = new FormControl('');
    resultsLength = 0;
    isLoadingResults = true;
    dataError: boolean = false;

    @ViewChild(MatPaginator)
    paginator!: MatPaginator;
    @ViewChild(MatSort)
    sort!: MatSort;

    constructor(
        private _adminService: AdminService,
        public dialog: MatDialog
    ) { }

    ngAfterViewInit(): void {
        this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

        merge(this.sort.sortChange, this.paginator.page, this.searchBackup.valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged()
            ), this.refresh$)
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap((data) => {
                    this.isLoadingResults = true;
                    return this._adminService.getBackupsList(
                        this.sort.active,
                        this.sort.direction,
                        this.paginator.pageIndex,
                        this.searchBackup.value
                    ).pipe(catchError(() => {
                        this.dataError = true;
                        return of(null);
                    }));
                }),
                map((data) => {
                    this.isLoadingResults = false;
                    if (data === null) {
                        this.dataError = true;
                        return [];
                    }

                    this.resultsLength = data.total_count;
                    this.dataError = false;
                    return data.items;
                }),
            )
            .subscribe(data => {
                this.data = data
            });
    }

    restoreBackup(backup: Backup): void {
        Swal.fire({
            title: `¿Está seguro de que desea reestablecer los datos?`,
            text: "Los cambios posteriores al backup se perderán",
            showDenyButton: true,
            confirmButtonText: `Confirmar`,
            denyButtonText: `Cancelar`,
            width: 'auto',
            reverseButtons: true,
        }).then((result: any) => {
            if (result.isConfirmed) {
                this.addingBackup = true;

                this._adminService.restaurarBackup(backup)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((response: any) => {
                            this.addingBackup = false;
                            if (response.fechaRestauracion) {
                                backup.fechaRestauracion = response.fechaRestauracion;
                            }
                            this.refresh$.next();
                            Swal.close();
                            successAlert(response.message);
                    }, (error) => {
                        console.log(error);
                        errorAlert('No se ha restaurado el backup');
                        return;
                    });
            }
        });
    }

    deleteBackup(backup: Backup): void {
        this.addingBackup = true;

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this._adminService.borrarBackup(backup)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((_) => {
                            this.addingBackup = false;
                            this.refresh$.next();
                            Swal.close();
                        }, (error) => {
                            console.log(error);
                            errorAlert('No se ha eliminado el backup');
                            return;
                        })

                }
            });
        this.addingBackup = false;
    }

    addBackup(backupData = undefined): void {
        this.addingBackup = true;

        this.dialog.open(BackupFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            width: '500px',
            data: {
                title: 'Crear nuevo',
                backup: backupData
            }
        }).afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((backup) => {

                if (backup === undefined) {
                    this.addingBackup = false;
                    return;
                };

                backupData = backup;
                this.saveBackup(backup, backupData);
            });
    }

    private saveBackup(backup: any, backupData: any): void {
        Swal.fire({
            title: 'Guardando backup',
            allowEnterKey: false,
            allowEscapeKey: false,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
                this._adminService.saveBackup(backup)
                    .pipe(
                        takeUntil(this.unsubscribe$),
                    )
                    .subscribe((_) => {
                        successAlert('El backup ha sido creado')
                            .then(() => {
                                this.addingBackup = false;
                                this.refresh$.next();
                                Swal.close();
                            });
                    }, (error: any) => {
                        console.log(error);
                        errorAlert('El backup no ha sido creado');
                        this.addBackup(backupData);
                    })
            }
        })
    }

    showDbCount(): void {
        this._adminService.getBackupCount()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((response: any) => {
                const counts = response.counts;
                const total = response.total;

                let i = 1;
                let html = '<table style="margin: auto; text-align: left; border-collapse: collapse;">';
                html += '<tr style="border-bottom: 1px solid #ccc;"><th style="padding: 4px 8px;">Nº</th><th style="padding: 4px 12px;">Tabla</th><th style="padding: 4px 12px; text-align: right;">Registros</th></tr>';
                for (const [table, count] of Object.entries(counts)) {
                    html += `<tr><td style="padding: 4px 8px; text-align: center;">${i}</td><td style="padding: 4px 12px;">${table}</td><td style="padding: 4px 12px; text-align: right;">${count}</td></tr>`;
                    i++;
                }
                html += `<tr style="border-top: 2px solid #333; font-weight: bold;"><td style="padding: 4px 8px;"></td><td style="padding: 4px 12px;">Total</td><td style="padding: 4px 12px; text-align: right;">${total}</td></tr>`;
                html += '</table>';

                Swal.fire({
                    title: 'Registros en la Base de Datos',
                    html: html,
                    width: 'auto',
                    confirmButtonText: 'Cerrar',
                });
            }, (error) => {
                console.log(error);
                errorAlert('No se pudo obtener el conteo de registros');
            });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
