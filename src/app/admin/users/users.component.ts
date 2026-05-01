import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { UserFormComponent } from '../components/user-form/user-form.component';
import { AdminService } from '../services/admin.service';
import { UserList } from './users.interface';
import { successAlert, errorAlert, confirmAlert, confirmAlertDelete, confirmAlertDeleteUsuario } from '../../shared/services/alerts';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    standalone: false,
    selector: 'app-users',
    templateUrl: './users.component.html',
    styleUrls: ['users.component.css'],
})
export class UsersComponent implements AfterViewInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    addingUser: boolean = false;

    displayedColumns: string[] = [
        'aliasUsuario',
        'nombreUsuario',
        'apellidoUsuario',
        'emailUsuario',
        'perfilUsuario',
        'activo', // Nueva columna para el checkbox
        'estado', // Nueva columna para el semáforo
        'options'
    ];

    //data: UserList[] = [];

    data: MatTableDataSource<UserList> = new MatTableDataSource();


    searchUsers: FormControl = new FormControl('');
    isLoadingResults = true;
    dataError: boolean = false;

    // MatPaginator
    resultsLength = 0;
    pageSizeOptions: number[] = pageSizeOptions;

    @ViewChild(MatPaginator)
    paginator!: MatPaginator;
    @ViewChild(MatSort)
    sort!: MatSort;

    constructor(
        private _adminService: AdminService,
        public dialog: MatDialog
    ) { }


    ngAfterViewInit() {

        // If the user changes the sort order, reset back to the first page.
        this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

        merge(this.sort.sortChange, this.paginator.page, this.searchUsers.valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged()
            ))
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap(() => {
                    this.isLoadingResults = true;
                    return this._adminService.getUsuersAdminList(
                        this.sort.active,
                        this.sort.direction,
                        this.paginator.pageIndex,
                        this.searchUsers.value,
                        this.paginator.pageSize
                    ).pipe(
                        catchError(() => {
                            this.dataError = true;
                            return of(null)
                        })
                    );
                }),
                map((data) => {
                    // Flip flag to show that loading has finished.
                    this.isLoadingResults = false;

                    if (data === null) {
                        return [];
                    }

                    // Only refresh the result length if there is new data. In case of rate
                    // limit errors, we do not want to reset the paginator to zero, as that
                    // would prevent users from re-triggering requests.
                    this.resultsLength = data.total_count;
                    this.dataError = false;
                    return data.items; // Eliminada la línea que sobrescribía activo
                }),
            )
            .subscribe(data => {
                this.data.data = data;  // Asigna los datos al MatTableDataSource
                this.data.sort = this.sort;  // Asigna el MatSort al MatTableDataSource
            });
    }

    editUser(userData = undefined) {

        this.addingUser = true; //Disable the edit button

        this.dialog.open(UserFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            width: '500px',
            data: {
                title: 'Editar',
                user: userData
            }
        })
            .afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((user) => {

                if (user === undefined) {
                    this.addingUser = false;
                    return;
                };

                userData = user; //Set the data to recover if there's an error

                Swal.fire({
                    title: 'Guardando usuario',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                        this._adminService.updateUser(user)
                            .pipe(
                                takeUntil(this.unsubscribe$),
                            )
                            .subscribe((_) => {
                                Swal.close();
                                successAlert('El usuario ha sido actualizado, si se cambió el email, se envía contraseña temporal para login.')
                                    .then(() => {
                                        this.addingUser = false; //Reset the edit user button
                                        this.searchUsers.reset(''); //Reset the table
                                    });
                            }, (error: any) => {
                                console.log('Error:', error);
                                errorAlert('El usuario no ha sido actualizado', error.error.msg)
                                this.editUser(userData); //call the form with the recovered data
                            })
                    }
                })
            });
    }

    updateUserStatus(user: UserList, activo: boolean): void {
        this._adminService.updateUserStatus(user, activo).subscribe(
            (response) => {
                console.log('Estado del usuario actualizado correctamente');
            },
            (error) => {
                console.error('Error al actualizar el estado del usuario', error);
            }
        );
    }


    deleteUser(user: UserList) {

        this.addingUser = true; //Disable the buttons

        confirmAlertDeleteUsuario()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this._adminService.deleteUser(user)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((response: any) => {
                            successAlert(response.msg)
                                .then(() => {
                                    this.addingUser = false; //Reset the update user button
                                    this.searchUsers.reset(''); //Reset the table
                                    Swal.close();
                                });
                        }, (error: any) => {
                            console.log(error);
                            errorAlert(error.error.msg);
                            return;
                        })
                }
            });
        // Eliminar esta línea para evitar habilitar los botones prematuramente
        // this.addingUser = false; //Enable  the buttons
    }

    addUser(userData = undefined) {

        this.addingUser = true; // Deshabilita el botón de agregar

        this.dialog.open(UserFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            width: '500px',
            data: {
                title: 'Crear nuevo',
                user: userData
            }
        })
            .afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((user) => {

                if (user === undefined) {
                    this.addingUser = false;
                    return;
                }

                userData = user; // Guarda datos por si hay error y hay que reabrir el formulario

                Swal.fire({
                    title: 'Guardando usuario',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();

                        this._adminService.saveUser(user)
                            .pipe(takeUntil(this.unsubscribe$))
                            .subscribe({
                                next: (response: any) => {
                                    Swal.close();
                                    successAlert(response.msg || 'El usuario ha sido creado')
                                        .then(() => {
                                            this.addingUser = false; // Reactiva el botón
                                            this.searchUsers.reset(''); // Refresca la tabla
                                        });
                                },
                                error: (error: any) => {
                                    console.error('Error al crear usuario:', error);

                                    // Manejo robusto de errores con fallback
                                    const mensaje =
                                        error?.error?.msg ||
                                        error?.error?.error?.msg ||
                                        'Ocurrió un error al crear el usuario.';

                                    Swal.close();
                                    errorAlert('El usuario no ha sido creado', mensaje)
                                        .then(() => {
                                            // Reabre el formulario con los datos previos
                                            this.addUser(userData);
                                        });
                                }
                            });
                    }
                });

            });
    }


    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
