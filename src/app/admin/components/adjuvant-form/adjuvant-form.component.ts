import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { cancelAlert, confirmAlert } from '../../../shared/services/alerts';
import { AdjuvantList } from '../../adjuvants/adjuvants.interface';

// Data from parent components
export interface DialogAdjuvantFormData {
    title: string;
    adjuvant: AdjuvantList | undefined;
}

@Component({
  standalone: false,
    selector: 'app-adjuvant-form',
    templateUrl: './adjuvant-form.component.html',
    styleUrls: ['./adjuvant-form.component.css']
})
export class AdjuvantFormComponent implements OnInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    title: string = '';

    adjuvantForm: FormGroup = this.fb.group({
        ListadoCoadNom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        ListadoCoadDesc: ['', [Validators.maxLength(500)]]
    });

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<AdjuvantFormComponent>,
        @Inject(MAT_DIALOG_DATA) public adjuvantFormData: DialogAdjuvantFormData
    ) { }

    ngOnInit(): void {
        this.title = this.adjuvantFormData.title;

        // If editing, fill the form with existing data
        if (this.adjuvantFormData.adjuvant) {
            this.adjuvantForm.reset({
                ListadoCoadNom: this.adjuvantFormData.adjuvant?.ListadoCoadNom,
                ListadoCoadDesc: this.adjuvantFormData.adjuvant?.ListadoCoadDesc || ''
            });
        }
    }

    // Error checking
    notValidField(field: string) {
        return (
            this.adjuvantForm.controls[field].errors &&
            this.adjuvantForm.controls[field].touched
        );
    }

    get nombreErrorMsg(): string {
        const errors = this.adjuvantForm.get('ListadoCoadNom')?.errors;
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
        const errors = this.adjuvantForm.get('ListadoCoadDesc')?.errors;
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
        if (this.adjuvantForm.invalid) {
            this.adjuvantForm.markAllAsTouched();
            return;
        }

        // Trim automático de los valores
        const nombreActual = this.adjuvantForm.get('ListadoCoadNom')?.value;
        const descripcionActual = this.adjuvantForm.get('ListadoCoadDesc')?.value;

        if (nombreActual) {
            this.adjuvantForm.patchValue({
                ListadoCoadNom: nombreActual.trim()
            });
        }

        if (descripcionActual) {
            this.adjuvantForm.patchValue({
                ListadoCoadDesc: descripcionActual.trim()
            });
        }

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    let output: AdjuvantList = this.adjuvantForm.value;
                    if (this.adjuvantFormData.adjuvant) {
                        output.ListadoCoadId = this.adjuvantFormData.adjuvant!.ListadoCoadId;
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
