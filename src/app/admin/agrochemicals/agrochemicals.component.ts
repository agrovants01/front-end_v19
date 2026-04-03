// src/app/admin/agrochemicals/agrochemicals.component.ts
import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { merge, of, Subject } from 'rxjs';
import { catchError, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AgrochemicalFormComponent } from '../components/agrochemical-form/agrochemical-form.component';
import { AdminService } from '../services/admin.service';
import { AgrochemicalList } from './agrochemicals.interface';
import { successAlert, errorAlert, confirmAlertDelete } from '../../shared/services/alerts';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';

// Interfaz corregida (debe coincidir con el backend)
interface EliminarDuplicadosResponse {
    ok: boolean;
    msg: string;
    resumen: {  // Cambiado de 'resultados' a 'resumen'
        totalRegistrosInicial: number;
        registrosEliminados: number;
        totalRegistrosFinal: number;
        // Opcional: el resto de propiedades que envía el backend
        duplicadosEncontrados?: number;
        registrosConservados?: number;
        porcentajeEliminado?: string;
        detalles?: any;
    };
    datos?: {  // Opcional porque puede que no lo uses
        conservados: any[];
        eliminados: any[];
    };
}

// Interfaz para la respuesta paginada
export interface PaginatedResponse<T> {
    items: T[];
    total_count: number;
}

@Component({
    standalone: false,
    selector: 'app-agrochemicals',
    templateUrl: './agrochemicals.component.html',
    styleUrls: ['./agrochemicals.component.css']
})
export class AgrochemicalsComponent implements AfterViewInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    addingAgrochemical: boolean = false;
    isAdmin: boolean = true; // Temporal, luego lo ajustas con el auth service

    displayedColumns: string[] = [
        'listadoAgroqNom',
        'listadoAgroqDesc',
        'options'
    ];

    data: MatTableDataSource<AgrochemicalList> = new MatTableDataSource();

    searchAgrochemicals: FormControl = new FormControl('');
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

        merge(this.sort.sortChange, this.paginator.page, this.searchAgrochemicals.valueChanges)
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap(() => {
                    this.isLoadingResults = true;

                    // Asegurar que sort.active tenga un valor válido
                    const sortActive = this.sort.active && this.sort.active !== 'nan'
                        ? this.sort.active
                        : 'listadoAgroqNom';

                    const sortDirection = this.sort.direction || 'ASC';

                    return this._adminService.getAgrochemicalsList(
                        sortActive,
                        sortDirection,
                        this.paginator.pageIndex,
                        this.searchAgrochemicals.value || '',
                        this.paginator.pageSize
                    ).pipe(
                        catchError((error) => {
                            console.error('Error en la petición:', error);
                            this.dataError = true;
                            return of(null);
                        })
                    );
                }),
                map((data: PaginatedResponse<AgrochemicalList> | null) => {
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

    editAgrochemical(agrochemicalData: AgrochemicalList | undefined = undefined) {
        this.addingAgrochemical = true;

        this.dialog.open(AgrochemicalFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            width: '500px',
            data: {
                title: 'Editar',
                agrochemical: agrochemicalData
            }
        })
            .afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((agrochemical: AgrochemicalList | undefined) => {
                if (agrochemical === undefined) {
                    this.addingAgrochemical = false;
                    return;
                }

                agrochemicalData = agrochemical;

                Swal.fire({
                    title: 'Guardando agroquímico',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                        this._adminService.updateAgrochemical(agrochemical)
                            .pipe(takeUntil(this.unsubscribe$))
                            .subscribe({
                                next: (response: AgrochemicalList) => {
                                    Swal.close();
                                    successAlert('El agroquímico ha sido actualizado correctamente')
                                        .then(() => {
                                            this.addingAgrochemical = false;
                                            this.searchAgrochemicals.reset('');
                                        });
                                },
                                error: (error: any) => {
                                    console.log('Error:', error);
                                    errorAlert('El agroquímico no ha sido actualizado', error.error?.msg || 'Error desconocido');
                                    this.editAgrochemical(agrochemicalData);
                                }
                            });
                    }
                });
            });
    }

    deleteAgrochemical(agrochemical: AgrochemicalList) {
        this.addingAgrochemical = true;

        confirmAlertDelete()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this._adminService.deleteAgrochemical(agrochemical)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe({
                            next: (response: any) => {
                                successAlert(response.msg || 'Agroquímico eliminado correctamente')
                                    .then(() => {
                                        this.addingAgrochemical = false;
                                        this.searchAgrochemicals.reset('');
                                        Swal.close();
                                    });
                            },
                            error: (error: any) => {
                                console.log(error);
                                errorAlert(error.error?.msg || 'Error al eliminar');
                                this.addingAgrochemical = false;
                            }
                        });
                } else {
                    this.addingAgrochemical = false;
                }
            });
    }

    addAgrochemical(agrochemicalData: AgrochemicalList | undefined = undefined) {
        this.addingAgrochemical = true;

        this.dialog.open(AgrochemicalFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            width: '500px',
            data: {
                title: 'Crear nuevo',
                agrochemical: agrochemicalData
            }
        })
            .afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((agrochemical: AgrochemicalList | undefined) => {
                if (agrochemical === undefined) {
                    this.addingAgrochemical = false;
                    return;
                }

                agrochemicalData = agrochemical;

                Swal.fire({
                    title: 'Guardando agroquímico',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();

                        this._adminService.saveAgrochemical(agrochemical)
                            .pipe(takeUntil(this.unsubscribe$))
                            .subscribe({
                                next: (response: AgrochemicalList) => {
                                    Swal.close();
                                    successAlert('El agroquímico ha sido creado')
                                        .then(() => {
                                            this.addingAgrochemical = false;
                                            this.searchAgrochemicals.reset('');
                                        });
                                },
                                error: (error: any) => {
                                    console.error('Error al crear agroquímico:', error);
                                    const mensaje = error?.error?.msg || 'Ocurrió un error al crear el agroquímico.';
                                    Swal.close();
                                    errorAlert('El agroquímico no ha sido creado', mensaje)
                                        .then(() => {
                                            this.addAgrochemical(agrochemicalData);
                                        });
                                }
                            });
                    }
                });
            });
    }

    // Método para eliminar duplicados
    // eliminarDuplicados() {
    //     Swal.fire({
    //         title: '¿Eliminar duplicados?',
    //         text: 'Esta acción eliminará registros duplicados basados en el nombre (ignorando mayúsculas y espacios). ¿Continuar?',
    //         icon: 'warning',
    //         showCancelButton: true,
    //         confirmButtonColor: '#d33',
    //         cancelButtonColor: '#3085d6',
    //         confirmButtonText: 'Sí, eliminar',
    //         cancelButtonText: 'Cancelar'
    //     }).then((result) => {
    //         if (result.isConfirmed) {
    //             Swal.fire({
    //                 title: 'Procesando...',
    //                 text: 'Buscando y eliminando duplicados',
    //                 allowEnterKey: false,
    //                 allowEscapeKey: false,
    //                 allowOutsideClick: false,
    //                 didOpen: () => {
    //                     Swal.showLoading();

    //                     this._adminService.eliminarDuplicados()
    //                         .pipe(takeUntil(this.unsubscribe$))
    //                         .subscribe({
    //                             next: (res: any) => {
    //                                 Swal.close();

    //                                 let mensaje = `
    //                                 <div style="text-align: left">
    //                                     <p><strong>Total registros:</strong> ${res.resultados.totalRegistros}</p>
    //                                     <p><strong>Duplicados encontrados:</strong> ${res.resultados.duplicadosEncontrados}</p>
    //                                     <p><strong>Registros eliminados:</strong> ${res.resultados.registrosEliminados}</p>
    //                                     <p><strong>Registros conservados:</strong> ${res.resultados.registrosConservados}</p>
    //                                 </div>
    //                             `;

    //                                 successAlert('Duplicados eliminados')
    //                                     .then(() => {
    //                                         console.log('Detalles:', res.resultados);
    //                                         this.searchAgrochemicals.reset(''); // Refresca la tabla
    //                                     });
    //                             },
    //                             error: (err) => {
    //                                 Swal.close();
    //                                 errorAlert('Error', err.error?.msg || 'Error al eliminar duplicados');
    //                             }
    //                         });
    //                 }
    //             });
    //         }
    //     });
    // }


    // Método corregido
  eliminarDuplicados() {
    Swal.fire({
        title: '¿Eliminar duplicados?',
        text: 'Esta acción eliminará registros duplicados basados en el nombre (ignorando mayúsculas, acentos y espacios). ¿Continuar?',
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

                    this._adminService.eliminarDuplicados()
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe({
                            next: (res: any) => {
                                const data = res.resumen || res;

                                Swal.close();

                                setTimeout(() => {
                                    Swal.fire({
                                        title: 'Duplicados eliminados',
                                        html: `
                                            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; margin: 10px 0;">
                                                <div style="display: flex; justify-content: space-between; width: 280px; margin: 5px 0;">
                                                    <span style="font-weight: 600; text-align: left; width: 180px;">• Total registros iniciales:</span>
                                                    <span style="font-weight: 500; text-align: right; width: 60px;">${data.totalRegistrosInicial || 0}</span>
                                                </div>
                                                <div style="display: flex; justify-content: space-between; width: 280px; margin: 5px 0;">
                                                    <span style="font-weight: 600; text-align: left; width: 180px;">• Registros eliminados:</span>
                                                    <span style="font-weight: 500; text-align: right; width: 60px;">${data.registrosEliminados || 0}</span>
                                                </div>
                                                <div style="display: flex; justify-content: space-between; width: 280px; margin: 5px 0;">
                                                    <span style="font-weight: 600; text-align: left; width: 180px;">• Total registros finales:</span>
                                                    <span style="font-weight: 500; text-align: right; width: 60px;">${data.totalRegistrosFinal || 0}</span>
                                                </div>
                                            </div>
                                        `,
                                        icon: 'success',
                                        confirmButtonText: 'Aceptar',
                                        confirmButtonColor: '#28a745'
                                    }).then(() => {
                                        this.searchAgrochemicals.reset('');
                                    });
                                }, 100);
                            },
                            error: (err) => {
                                console.error('Error:', err);
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
