import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, of, Subject } from 'rxjs';
import { catchError, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IndexFormComponent } from '../components/index-form/index-form.component';
import { AdminService } from '../services/admin.service';
import { IndexList } from './index.interface';
import { successAlert, errorAlert, confirmAlert } from '../../shared/services/alerts';
import { pageSizeOptions } from '../../frameworks/MatTableSettings';

@Component({
    standalone: false,
    selector: 'app-index',
    templateUrl: './indexes.component.html',
    styles: [
    ]
})
export class IndexesComponent implements AfterViewInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    addingIndex: boolean = false;

    displayedColumns: string[] = [
        'nombreIndice',
        'siglasIndice',
        'bandasIndice',
        'options'
    ];

    data: IndexList[] = [];
    searchIndexes: FormControl = new FormControl('');
    resultsLength = 0;
    isLoadingResults = true;
    pageSizeOptions: number[] = pageSizeOptions;
    dataError: boolean = false;

    @ViewChild(MatPaginator)
    paginator!: MatPaginator;
    @ViewChild(MatSort)
    sort!: MatSort;

    constructor(
        private _adminService: AdminService,
        public indexDialog: MatDialog
    ) { }


    ngAfterViewInit() {

        // If the index changes the sort order, reset back to the first page.
        this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

        merge(this.sort.sortChange, this.paginator.page, this.searchIndexes.valueChanges)
            .pipe(
                takeUntil(this.unsubscribe$),
                startWith({}),
                switchMap(() => {
                    this.isLoadingResults = true;
                    return this._adminService.getIndexesAdminList(
                        this.sort.active,
                        this.sort.direction,
                        this.paginator.pageIndex,
                        this.searchIndexes.value,
                        this.paginator.pageSize
                    ).pipe(
                        catchError(() => {
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
                    // would prevent Indexes from re-triggering requests.
                    this.resultsLength = data.total_count;
                    this.dataError = true;
                    return data.items;
                }),
            )
            .subscribe(data => {
                this.data = data
            });
    }



    editIndex(index: IndexList) {

        this.addingIndex = true; //Disable the edit button

        this.indexDialog.open(IndexFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            width: 'auto',
            height: 'auto',
            data: {
                title: 'Editar',
                index
            }
        })
            .afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((index) => {
                if (index === undefined) {
                    this.addingIndex = false;
                    return;
                };

                Swal.fire({
                    title: 'Guardando índice',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                        this._adminService.updateIndex(index)
                            .pipe(
                                takeUntil(this.unsubscribe$),
                            )
                            .subscribe((_) => {
                                successAlert('El índice ha sido actualizado')
                                    .then(() => {
                                        this.addingIndex = false; //Reset the update index button
                                        this.searchIndexes.reset(''); //Reset the table
                                        Swal.close();
                                    });
                            }, (error: any) => {
                                console.log(error);
                                errorAlert('El índice no ha sido editado');
                                this.editIndex(index); //call the form with the recovered data //TODO: Recover Data
                            })
                    }
                })


            });

    }

    deleteIndex(index: IndexList) {

        this.addingIndex = true; //Disable the buttons

        confirmAlert('Está seguro de que desea eliminar el índice')
            .then((result: any) => {
                if (result.isConfirmed) {
                    this._adminService.deleteIndex(index)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((_) => {
                            this.addingIndex = false; //Reset the update index button
                            this.searchIndexes.reset(''); //Reset the table
                            Swal.close();
                        });
                }
            });

        this.addingIndex = false; //Enable  the buttons
    }

    addIndex(indexData = undefined) {

        this.addingIndex = true; //Disable the add button

        this.indexDialog.open(IndexFormComponent, {
            autoFocus: true,
            disableClose: true,
            hasBackdrop: true,
            minWidth: '40rem',
            height: 'auto',
            data: {
                title: 'Crear nuevo',
                index: indexData
            }
        }).afterClosed()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((index) => {

                if (index === undefined) {
                    this.addingIndex = false;
                    return;
                };

                indexData = index; //Set the data to recover if there's an error

                Swal.fire({
                    title: 'Guardando índice',
                    allowEnterKey: false,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                        this._adminService.saveIndex(index)
                            .pipe(
                                takeUntil(this.unsubscribe$),
                            )
                            .subscribe((_) => {
                                successAlert('El índice ha sido creado')
                                    .then(() => {
                                        this.addingIndex = false; //Reset the create index button
                                        this.searchIndexes.reset(''); //Reset the table
                                        Swal.close();
                                    });
                            }, (error: any) => {
                                console.log(error);
                                errorAlert('El índice no ha sido creado');
                                this.addIndex(indexData); //call the form with the recovered data
                            })
                    }
                })


            });
    }


    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }


}
