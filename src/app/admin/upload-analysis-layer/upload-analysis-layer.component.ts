import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { errorAlert } from 'src/app/shared/services/alerts';
import { LessThanTodayService } from 'src/app/shared/validators/less-than-today.service';
import { LayerService } from '../../pages/services/layer.service';
import { LayerTypeInput } from './analysisLayer.interface';
import { successAlert, confirmAlert } from '../../shared/services/alerts';
import { GlobalsService } from 'src/app/shared/services/globals.service';
import { IndexRangeInput } from '../indexes/index.interface';
import { Router } from '@angular/router';
import { OwnerListInput } from 'src/app/pages/owner/owner.interface';
import { OwnerService } from 'src/app/pages/services/owner.service';


@Component({
    standalone: false,
    selector: 'app-upload-analysis-layer',
    templateUrl: './upload-analysis-layer.component.html',
    styles: [
    ]
})
export class UploadAnalysisLayerComponent implements OnInit {

    private unsubscribe$ = new Subject<void>();

    layerTypes: LayerTypeInput[] = [];
    ownersList: OwnerListInput[] = [];

    //REGEX: "/[a-zA-Z0-9_ ]+[a-zA-Z0-9_]:[a-zA-Z0-9_ ]+[a-zA-Z0-9_]/gm"

    layerForm: FormGroup = this.fb.group({
        fechaAnalisis: ['', [Validators.required], [this.dateValidator]],
        imagenAnalisis: ['', [Validators.required, Validators.pattern("[a-zA-Z0-9_]+:[a-zA-Z0-9_]+")]],
        propietarioAnalisisId: ['', [Validators.required]],
        indiceAnalisisId: ['', [Validators.required]]
    });

    //Table
    rangeData: IndexRangeInput[] = [];
    displayedColumns: string[] = [];

    constructor(
        private fb: FormBuilder,
        private layerService: LayerService,
        private ownerService: OwnerService,
        private dateValidator: LessThanTodayService,
        private router: Router) { }

    ngOnInit(): void {

        /* Backend */
        this.layerService.getLayersTypes()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((types: LayerTypeInput[]) => {
                this.layerTypes = types;
            })

        this.ownerService.getOwnersList()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((owners: OwnerListInput[]) => {
                this.ownersList = owners;
            })
    }

    notValidField(field: string) {
        return (
            this.layerForm.controls[field].errors &&
            this.layerForm.controls[field].touched
        );
    };

    getReference(type: LayerTypeInput) {
        if (type.referencia) {
            this.displayedColumns = ['colorRango', 'desdeRango', 'hastaRango'];
            this.rangeData = type.referencia;
            return;
        }
        this.rangeData = [];
    }

    submitLayerForm(): void {
        //If the form is invalid, cancel the submit
        if (this.layerForm.invalid) {
            this.layerForm.markAllAsTouched();
            return;
        }

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    const date = this.layerForm.get('fechaAnalisis')?.value;

                    const postgresDate = formatDate(date, 'yyyy-MM-dd', 'es-Ar');
                    let form = this.layerForm.value;
                    form.fechaAnalisis = postgresDate;

                    /* Backend */

                    this.layerService.saveLayer(form)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((_) => {
                            successAlert('El análisis ha sido creado')
                                .then(() => {
                                    this.router.navigate(['/admin']);
                                })
                        }, (error: any) => {
                            console.log(error);
                            errorAlert('El análisis no ha sido creado');
                            return;
                        })

                    /* Fake Backend */
                    /*this.layerService.saveLayerFake(form)
                      .pipe(takeUntil(this.unsubscribe$))
                      .subscribe((_) => {
                        successAlert('El análisis ha sido creado')
                          .then(() => {
                            this.globalsService.return();
                          })
                      }, (error: any) => {
                        console.log(error);
                        errorAlert('El análisis no ha sido creado');
                        return;
                      })
                    return;*/
                }
            })


    }

    //Errors Messages
    get fechaAnalisisErrorMsg(): string {
        const errors = this.layerForm.get(
            'fechaAnalisis'
        )?.errors;
        if (errors?.required) {
            return 'Debe seleccionar una fecha de análisis';
        } else if (errors?.greaterThanToday) {
            return 'La fecha ingresada no puede ser mayor que la fecha actual';
        }
        return '';
    }
    get indiceAnalisisErrorMsg(): string {
        const errors = this.layerForm.get(
            'indiceAnalisisId'
        )?.errors;
        if (errors?.required) {
            return 'Debe seleccionar un índice';
        }
        return '';
    }

    get propietarioAnalisisIdErrorMsg(): string {
        const errors = this.layerForm.get(
            'propietarioAnalisisId'
        )?.errors;
        if (errors?.required) {
            return 'Debe seleccionar un propietario';
        }
        return '';
    }

    get imagenAnalisisErrorMsg(): string {
        const errors = this.layerForm.get(
            'imagenAnalisis'
        )?.errors;
        // if (errors?.required) {
        //     return 'Debe definir una capa de análisis';
        // } else if (errors?.pattern) {
        //     return 'El formato de la capa es incorrecto';
        // }
        return '';
    }


}
