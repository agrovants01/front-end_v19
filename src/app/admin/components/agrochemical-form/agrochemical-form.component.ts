import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { cancelAlert, confirmAlert } from '../../../shared/services/alerts';
import { AgrochemicalList } from '../../agrochemicals/agrochemicals.interface';

// Data from parent components
export interface DialogAgrochemicalFormData {
    title: string;
    agrochemical: AgrochemicalList | undefined;
}

@Component({
  standalone: false,
    selector: 'app-agrochemical-form',
    templateUrl: './agrochemical-form.component.html',
    styleUrls: ['./agrochemical-form.component.css']
})
export class AgrochemicalFormComponent implements OnInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    title: string = '';

    agrochemicalForm: FormGroup = this.fb.group({
        listadoAgroqNom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        listadoAgroqDesc: ['', [Validators.maxLength(500)]]
    });

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<AgrochemicalFormComponent>,
        @Inject(MAT_DIALOG_DATA) public agrochemicalFormData: DialogAgrochemicalFormData
    ) { }

    ngOnInit(): void {
        this.title = this.agrochemicalFormData.title;

        // If editing, fill the form with existing data
        if (this.agrochemicalFormData.agrochemical) {
            this.agrochemicalForm.reset({
                listadoAgroqNom: this.agrochemicalFormData.agrochemical?.listadoAgroqNom,
                listadoAgroqDesc: this.agrochemicalFormData.agrochemical?.listadoAgroqDesc || ''
            });
        }
    }

    // Error checking
    notValidField(field: string) {
        return (
            this.agrochemicalForm.controls[field].errors &&
            this.agrochemicalForm.controls[field].touched
        );
    }

    get nombreErrorMsg(): string {
        const errors = this.agrochemicalForm.get('listadoAgroqNom')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.minlength) {
            return 'Debe tener al menos 2 caracteres';
        } else if (errors?.maxlength) {
            return 'No puede exceder los 100 caracteres';
        }
        return '';
    }

    get descripcionErrorMsg(): string {
        const errors = this.agrochemicalForm.get('listadoAgroqDesc')?.errors;
        if (errors?.maxlength) {
            return 'La descripción no puede exceder los 500 caracteres';
        }
        return '';
    }

    // Actions
    cancel(): void {
        cancelAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this.dialogRef.close();
                }
            });
    }

    onSubmit(): void {
        if (this.agrochemicalForm.invalid) {
            this.agrochemicalForm.markAllAsTouched();
            return;
        }

        // Trim automático de los valores
        const nombreActual = this.agrochemicalForm.get('listadoAgroqNom')?.value;
        const descripcionActual = this.agrochemicalForm.get('listadoAgroqDesc')?.value;

        const formValues: any = {};

        if (nombreActual) {
            formValues.listadoAgroqNom = nombreActual.trim();
        }

        if (descripcionActual) {
            formValues.listadoAgroqDesc = descripcionActual.trim();
        } else {
            formValues.listadoAgroqDesc = '';
        }

        this.agrochemicalForm.patchValue(formValues);

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    let output: AgrochemicalList = this.agrochemicalForm.value;
                    if (this.agrochemicalFormData.agrochemical) {
                        output.listadoAgroqId = this.agrochemicalFormData.agrochemical!.listadoAgroqId;
                    }
                    this.dialogRef.close(output);
                }
            });
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
