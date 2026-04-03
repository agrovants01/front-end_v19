import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { cancelAlert } from 'src/app/shared/services/alerts';
import { floatPattern, hexaColorPattern, namePattern } from 'src/app/shared/validators/patterns';
import { confirmAlert } from '../../../shared/services/alerts';
import { IndexList } from '../../indexes/index.interface';
import { AdminService } from '../../services/admin.service';
import { alphanumericPattern } from '../../../shared/validators/patterns';

export interface DialogIndexFormData {
    title: string;
    index: IndexList | undefined;
}

@Component({
  standalone: false,
    selector: 'app-index-form',
    templateUrl: './index-form.component.html',
    styles: [
    ]
})
export class IndexFormComponent implements OnInit {

    private unsubscribe$ = new Subject<void>();

    title: string = ''; //Title of the form
    indexForm: FormGroup = this.fb.group({
        nombreIndice: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(alphanumericPattern)]],
        siglasIndice: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(alphanumericPattern)]],
        bandasIndice: ['', Validators.required],
        referencias: this.fb.array([], Validators.required)
    });

    constructor(
        private fb: FormBuilder,
        public indexDialogRef: MatDialogRef<IndexFormComponent>,
        @Inject(MAT_DIALOG_DATA) public indexData: DialogIndexFormData,
        private _adminService: AdminService
    ) { }

    ngOnInit(): void {

        //Set the title
        this.title = this.indexData.title;

        //If the parent is edit, fill the form with the index data
        if (this.indexData.index) {
            //Get the references
            this._adminService.getIndexRange(this.indexData.index.indiceId)
                .pipe(takeUntil(this.unsubscribe$))
                .subscribe((ranges) => {
                    ranges.forEach((range) => {
                        const { rangoId, colorRango, desdeRango, hastaRango } = range;
                        this.addReference(rangoId, colorRango, desdeRango, hastaRango)
                    })
                })
            this.indexForm.reset({
                nombreIndice: this.indexData.index?.nombreIndice,
                siglasIndice: this.indexData.index?.siglasIndice,
                bandasIndice: this.indexData.index?.bandasIndice,
            })
        }
    }

    /** Error Status checking and messages **/

    notValidField(field: string) {
        return (
            this.indexForm.controls[field].errors &&
            this.indexForm.controls[field].touched
        );
    }

    get nombreErrorMsg(): string {
        const errors = this.indexForm.get('nombreIndice')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 50 caracteres';
        } else if (errors?.pattern) {
            return 'Sólo se permiten caracteres alfanuméricos';
        }

        return ''; //Para evitar errores
    }

    get siglasErrorMsg(): string {
        const errors = this.indexForm.get('siglasIndice')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength) {
            return 'Este campo debe tener hasta 50 caracteres';
        } else if (errors?.pattern) {
            return 'Sólo se permiten caracteres alfanuméricos';
        }

        return ''; //Para evitar errores
    }

    get bandasErrorMsg(): string {
        const errors = this.indexForm.get('bandasIndice')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        }
        return ''; //Para evitar errores
    }

    rangeNotValidField(field: string, i: number): boolean | null {
        return (
            this.referencias.controls[i].get(field)!.errors &&
            this.referencias.controls[i].get(field)!.touched
        );
    }

    colorErrorMsg(i: number): string {
        const errors = this.referencias.controls[i].get('colorRango')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.pattern) {
            return 'Sólo se permite un código hexadecimal';
        }

        return ''; //Para evitar errores
    }

    desdeErrorMsg(i: number): string {
        const errors = this.referencias.controls[i].get('desdeRango')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.pattern) {
            return 'Sólo se permitem valores decimales';
        }

        return ''; //Para evitar errores
    }

    hastaErrorMsg(i: number): string {
        const errors = this.referencias.controls[i].get('hastaRango')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.pattern) {
            return 'Sólo se permitem valores decimales';
        } else if (errors?.notOrdered) {
            return 'El valor "desde" no puede superar al "hasta"';
        }

        return ''; //Para evitar errores
    }

    /** Reference Upload **/

    get referencias(): FormArray {
        return this.indexForm.controls["referencias"] as FormArray;
    }

    addReference(rangoId?: string, colorRango: string = '', desdeRango: number = 0, hastaRango: number = 0) {

        const referenceForm = this.fb.group({
            rangoId: [rangoId],
            colorRango: [colorRango, [Validators.required, Validators.pattern(hexaColorPattern)]],
            desdeRango: [desdeRango, [Validators.required, Validators.pattern(floatPattern)]],
            hastaRango: [hastaRango, [Validators.required, Validators.pattern(floatPattern)]],

        }, {
            validators: this.orderedValues('desdeRango', 'hastaRango')
        })
        this.referencias.push(referenceForm);
    }

    removeReference(index: number) {
        this.referencias.removeAt(index);
    }

    orderedValues(desdeRangoName: string, hastaRangoName: string) {

        return (formGroup: FormGroup) => {

            const desdeRango = formGroup.get(desdeRangoName);
            const hastaRango = formGroup.get(hastaRangoName);

            hastaRango!.setErrors(null);

            if (desdeRango!.value < hastaRango!.value) {
                hastaRango!.setErrors(null)
            } else {
                hastaRango!.setErrors({ notOrdered: true })
            }


        }
    }


    /** Actions **/

    cancel(): void {
        cancelAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    //Return to the parent
                    this.indexDialogRef.close();
                }
            });


    }

    onSubmit(): void {

        //If it's empty then show errors
        if (this.indexForm.invalid) {
            this.indexForm.markAllAsTouched();
            return;
        }
        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    //Return the form data to the parent
                    let output: IndexList = this.indexForm.value;
                    if (this.indexData.index) {
                        output.indiceId = this.indexData.index!.indiceId;
                    }
                    this.indexDialogRef.close(output);
                }
            });

    }



}
