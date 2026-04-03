// src/app/admin/adjuvants/adjuvants.component.ts

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { merge, of, Subject } from 'rxjs';
import { catchError, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AdjuvantFormComponent } from '../components/adjuvant-form/adjuvant-form.component';
import { AdminService } from '../services/admin.service';
import { AdjuvantList } from './adjuvants.interface';
import { successAlert, errorAlert, confirmAlertDelete } from '../../shared/services/alerts';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';

// Interfaz para la respuesta paginada
export interface PaginatedResponse<T> {
    items: T[];
    total_count: number;
}

@Component({
    standalone: false,
    selector: 'app-adjuvants',
    templateUrl: './adjuvants.component.html',
    styleUrls: ['./adjuvants.component.css']
})
export class AdjuvantsComponent implements AfterViewInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    addingAdjuvant: boolean = false;
    isAdmin: boolean = true; // Temporal, luego lo ajustas con el auth service

    displayedColumns: string[] = [
        'ListadoCoadNom',
        'ListadoCoadDesc',
        'options'
    ];

    data: MatTableDataSource<AdjuvantList> = new MatTableDataSource();

    searchAdjuvants: FormControl = new FormControl('');
    isLoadingResults = true;
    dataError: boolean = false;

    // MatPaginator
    resultsLength = 0;
    pageSizeOptions: number[] = pageSizeOptions;

    @ViewChild(MatPaginator)
    paginator!: MatPaginator;
    @ViewChild(MatSort)
    sort!: MatSort;

    // Variable para resultados de importación
    resultadosImportacion: any = null;

    constructor(
        private _adminService: AdminService,
        public dialog: MatDialog
    ) { }

    ngAfterViewInit() {
        // Si el usuario cambia el orden, resetear a primera página
        this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

        merge(this.sort.sortChange, this.paginator.page, this.searchAdjuvants.valueChanges)
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap(() => {
                    this.isLoadingResults = true;

                    // Asegurar que sort.active tenga un valor válido
                    const sortActive = this.sort.active && this.sort.active !== 'nan'
                        ? this.sort.active
                        : 'ListadoCoadNom';

                    const sortDirection = this.sort.direction || 'ASC';

                    return this._adminService.getAdjuvantsList(
                        sortActive,
                        sortDirection,
                        this.paginator.pageIndex,
                        this.searchAdjuvants.value || '',
                        this.paginator.pageSize
                    ).pipe(
                        catchError((error) => {
                            console.error('Error en la petición:', error);
                            this.dataError = true;
                            return of(null);
                        })
                    );
                }),
                map((data: PaginatedResponse<AdjuvantList> | null) => {
                    this.isLoadingResults = false;

                    if (data === null) {
                        return [];
                    }

                    this.resultsLength = data.total_count;
                    this.dataError = false;
                    return data.items;
                }),
            )
            .subscribe(data => {
                this.data.data = data;
                this.data.sort = this.sort;
            });
    }

    editAdjuvant(adjuvantData: AdjuvantList | undefined = undefined) {
        this.addingAdjuvant = true;

        this.dialog.open(AdjuvantFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            width: '500px',
            data: {
                title: 'Editar',
                adjuvant: adjuvantData
            }
        })
            .afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((adjuvant: AdjuvantList | undefined) => {
                if (adjuvant === undefined) {
                    this.addingAdjuvant = false;
                    return;
                }

                adjuvantData = adjuvant;

                Swal.fire({
                    title: 'Guardando coadyuvante',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                        this._adminService.updateAdjuvant(adjuvant)
                            .pipe(takeUntil(this.unsubscribe$))
                            .subscribe({
                                next: (response: AdjuvantList) => {
                                    Swal.close();
                                    successAlert('El coadyuvante ha sido actualizado correctamente')
                                        .then(() => {
                                            this.addingAdjuvant = false;
                                            this.searchAdjuvants.reset('');
                                        });
                                },
                                error: (error: any) => {
                                    console.log('Error:', error);
                                    errorAlert('El coadyuvante no ha sido actualizado', error.error?.msg || 'Error desconocido');
                                    this.editAdjuvant(adjuvantData);
                                }
                            });
                    }
                });
            });
    }

    deleteAdjuvant(adjuvant: AdjuvantList) {
        this.addingAdjuvant = true;

        confirmAlertDelete()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this._adminService.deleteAdjuvant(adjuvant)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe({
                            next: (response: any) => {
                                successAlert(response.msg || 'Coadyuvante eliminado correctamente')
                                    .then(() => {
                                        this.addingAdjuvant = false;
                                        this.searchAdjuvants.reset('');
                                        Swal.close();
                                    });
                            },
                            error: (error: any) => {
                                console.log(error);
                                errorAlert(error.error?.msg || 'Error al eliminar');
                                this.addingAdjuvant = false;
                            }
                        });
                } else {
                    this.addingAdjuvant = false;
                }
            });
    }

    addAdjuvant(adjuvantData: AdjuvantList | undefined = undefined) {
        this.addingAdjuvant = true;

        this.dialog.open(AdjuvantFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            width: '500px',
            data: {
                title: 'Crear nuevo',
                adjuvant: adjuvantData
            }
        })
            .afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((adjuvant: AdjuvantList | undefined) => {
                if (adjuvant === undefined) {
                    this.addingAdjuvant = false;
                    return;
                }

                adjuvantData = adjuvant;

                Swal.fire({
                    title: 'Guardando coadyuvante',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();

                        this._adminService.saveAdjuvant(adjuvant)
                            .pipe(takeUntil(this.unsubscribe$))
                            .subscribe({
                                next: (response: AdjuvantList) => {
                                    Swal.close();
                                    successAlert('El coadyuvante ha sido creado')
                                        .then(() => {
                                            this.addingAdjuvant = false;
                                            this.searchAdjuvants.reset('');
                                        });
                                },
                                error: (error: any) => {
                                    console.error('Error al crear coadyuvante:', error);
                                    const mensaje = error?.error?.msg || 'Ocurrió un error al crear el coadyuvante.';
                                    Swal.close();
                                    errorAlert('El coadyuvante no ha sido creado', mensaje)
                                        .then(() => {
                                            this.addAdjuvant(adjuvantData);
                                        });
                                }
                            });
                    }
                });
            });
    }

    // Método para eliminar duplicados
    eliminarDuplicados() {
        Swal.fire({
            title: '¿Eliminar duplicados?',
            text: 'Esta acción eliminará registros duplicados basados en el nombre (ignorando mayúsculas y espacios). ¿Continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Procesando...',
                    text: 'Buscando y eliminando duplicados',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();

                        this._adminService.eliminarDuplicadosCoadyuvantes()
                            .pipe(takeUntil(this.unsubscribe$))
                            .subscribe({
                                next: (res: any) => {
                                    Swal.close();

                                    let mensaje = `
                                    <div style="text-align: left">
                                        <p><strong>Total registros:</strong> ${res.resultados.totalRegistros}</p>
                                        <p><strong>Duplicados encontrados:</strong> ${res.resultados.duplicadosEncontrados}</p>
                                        <p><strong>Registros eliminados:</strong> ${res.resultados.registrosEliminados}</p>
                                        <p><strong>Registros conservados:</strong> ${res.resultados.registrosConservados}</p>
                                    </div>
                                `;

                                    successAlert('Duplicados eliminados')
                                        .then(() => {
                                            console.log('Detalles:', res.resultados);
                                            this.searchAdjuvants.reset(''); // Refresca la tabla
                                        });
                                },
                                error: (err) => {
                                    Swal.close();
                                    errorAlert('Error', err.error?.msg || 'Error al eliminar duplicados');
                                }
                            });
                    }
                });
            }
        });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
