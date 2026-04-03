import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, of, Subject } from 'rxjs';
import { catchError, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { confirmAlert, errorAlert, successAlert } from 'src/app/shared/services/alerts';
import Swal from 'sweetalert2';
import { BackupFormComponent } from '../components/backup-form/backup-form.component';
import { AdminService } from '../services/admin.service';
import { Backup } from './backup.interface';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';


@Component({
    standalone: false,
    selector: 'app-backup',
    templateUrl: './backup.component.html',
    styles: [
    ]
})
export class BackupComponent implements AfterViewInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    addingBackup: boolean = false;

    displayedColumns: string[] = [
        'nombreBackup',
        'fechaHoraBackup',
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
        // If the backup changes the sort order, reset back to the first page.
        this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

        merge(this.sort.sortChange, this.paginator.page, this.searchBackup.valueChanges)
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap((data) => {
                    this.isLoadingResults = true;
                    return this._adminService.getBackupsList(
                        //return this._adminService.getUsuersAdminList( TODO: Make backend
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
                    // Flip flag to show that loading has finished.
                    this.isLoadingResults = false;
                    if (data === null) {
                        return [];
                    }

                    // Only refresh the result length if there is new data. In case of rate
                    // limit errors, we do not want to reset the paginator to zero, as that
                    // would prevent backups from re-triggering requests.
                    this.resultsLength = data.total_count;
                    this.dataError = true;
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
                this.addingBackup = true; // Deshabilitar los botones

                this._adminService.restaurarBackup(backup) // ojo con los nombres
                    .pipe(takeUntil(this.unsubscribe$))
                    .subscribe((response: any) => {
                        this.addingBackup = false; // Restablecer el botón de restaurar backup
                        this.searchBackup.reset(''); // Restablecer la tabla
                        Swal.close();
                        successAlert(response.message); // Mostrar mensaje de éxito
                    }, (error) => {
                        console.log(error);
                        errorAlert('No se ha restaurado el backup');
                        return;
                    });
            }
        });
    }

    deleteBackup(backup: Backup): void {

        this.addingBackup = true; //Disable the buttons

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this._adminService.borrarBackup(backup)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((_) => {
                            this.addingBackup = false; //Reset the update backup button
                            this.searchBackup.reset(''); //Reset the table
                            Swal.close();
                        }, (error) => {
                            console.log(error);
                            errorAlert('No se ha eliminado el backup');
                            return;
                        })

                }
            });
        this.addingBackup = false; //Enable  the buttons

        //TODO: Make backend
    }

    addBackup(backupData = undefined): void {

        this.addingBackup = true; //Disable the add button

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

                backupData = backup; //Set the data to recover if there's an error

                Swal.fire({
                    title: 'Guardando usuario',
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
                                        this.addingBackup = false; //Reset the create backup button
                                        this.searchBackup.reset(''); //Reset the table
                                        Swal.close();
                                    });
                            }, (error: any) => {
                                console.log(error);
                                errorAlert('El backup no ha sido creado');
                                this.addBackup(backupData); //call the form with the recovered data
                            })
                    }
                })
            });
    }
    //TODO: Make backend

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
