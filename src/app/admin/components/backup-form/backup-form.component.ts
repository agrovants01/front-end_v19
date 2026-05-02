import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { cancelAlert, confirmAlert } from 'src/app/shared/services/alerts';
import { backupNamePattern, namePattern } from 'src/app/shared/validators/patterns';
import { Backup } from '../../backup/backup.interface';
import { AdminService } from '../../services/admin.service';

export interface DialogBackupFormData {
    title: string;
    backup: Backup | undefined;
}

@Component({
  standalone: false,
    selector: 'app-backup-form',
    templateUrl: './backup-form.component.html',
    styles: [
    ]
})
export class BackupFormComponent implements OnInit {

    title: string = ''; //Title of the form

    backupForm: FormGroup = this.fb.group({
        nombreBackup: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(backupNamePattern)]],
        fechaHoraBackup: [new Date(), [Validators.required]]
    });

    constructor(
        private fb: FormBuilder,
        public backupDialogRef: MatDialogRef<BackupFormComponent>,
        @Inject(MAT_DIALOG_DATA) public backupData: DialogBackupFormData,
        private _adminService: AdminService
    ) { }

    ngOnInit(): void {

        //Set the title
        this.title = this.backupData.title;

        //If the parent is edit, fill the form with the backup data
        if (this.backupData.backup) {
            this.backupForm.reset({
                nombreBackup: this.backupData.backup?.nombreBackup,
            })
        } else {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
            const month = months[now.getMonth()];
            const year = String(now.getFullYear()).slice(-2);
            this.backupForm.patchValue({ nombreBackup: `BACKUP${day}${month}${year}` });
        }
    }

    /** Error Status checking and messages **/

    notValidField(field: string) {
        return (
            this.backupForm.controls[field].errors &&
            this.backupForm.controls[field].touched
        );
    }

    get nombreErrorMsg(): string {
        const errors = this.backupForm.get('nombreBackup')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 50 caracteres';
        } else if (errors?.pattern) {
            return 'Sólo se permiten caracteres alfabéticos';
        }

        return ''; //To avoid errors
    }


    /** Actions **/

    cancel(): void {
        cancelAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    //Return to the parent
                    this.backupDialogRef.close();
                }
            });


    }

    onSubmit(): void {

        //If it's empty then show errors
        if (this.backupForm.invalid) {
            this.backupForm.markAllAsTouched();
            return;
        }

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    //Return the form data to the parent
                    this.backupDialogRef.close(this.backupForm.value);
                }
            });

    }

}
