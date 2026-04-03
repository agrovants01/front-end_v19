import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { successAlert, errorAlert, confirmAlert } from '../../../shared/services/alerts';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { emailPattern } from 'src/app/shared/validators/patterns';
import { Router } from '@angular/router';

@Component({
  standalone: false,
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styles: [
    ]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    sendingRequest: boolean = false;

    resetPassForm: FormGroup = this.fb.group({
        emailUsuario: ['', [Validators.required, Validators.pattern(emailPattern)]],
    })

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router) { }

    ngOnInit(): void {
    }

    /** Error Status checking and messages **/

    notValidField(field: string) {
        return (
            this.resetPassForm.controls[field].errors &&
            this.resetPassForm.controls[field].touched
        );
    }

    get emailErrorMsg(): string {
        const errors = this.resetPassForm.get('emailUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.pattern) {
            return 'El formato no es válido';
        }

        return ''; //To avoid errors
    }

    resetPassword() {
        if (this.resetPassForm.invalid) {
            this.resetPassForm.markAllAsTouched();
            return;
        }
        this.authService.resetPassword(this.resetPassForm.value)
            .pipe(
                takeUntil(this.unsubscribe$),
            )
            .subscribe(_ => {
                successAlert('Solicitud enviada con éxito<br>Revise su email y siga las instrucciones<br>para reestablecer la contraseña.')
                    .then(() => {
                        this.router.navigateByUrl('/auth/login');
                    })
            }, error => {
                console.log(error);
                errorAlert('No se ha podido enviar la solicitud de reestablecimiento de contraseña', error.error.msg)
            })

    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

}
