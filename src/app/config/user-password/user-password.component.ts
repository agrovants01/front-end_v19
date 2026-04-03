import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { cancelAlert, confirmAlert } from 'src/app/shared/services/alerts';
import { NotEqualFieldsService } from '../../shared/validators/not-equal-fields.service';
import { CurrentPassValidatorService } from '../../shared/validators/current-pass-validator.service';
import { ConfigService } from '../config.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { errorAlert, successAlert } from '../../shared/services/alerts';

@Component({
  standalone: false,
    selector: 'app-user-password',
    templateUrl: './user-password.component.html',
    styleUrls: ['./user-password.component.css']
})
export class UserPasswordComponent implements OnInit {

    passwordForm: FormGroup = this.fb.group({
        'ContraseniaUsuarioAnterior': ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)], [this.currentPassValidator]],
        'ContraseniaUsuario': ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20),]],
        'ContraseniaUsuario2': ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]]
    }, {
        validators: [this.notEqualFieldsValidator.notEqualFields('ContraseniaUsuario', 'ContraseniaUsuario2')]
    });

    hidePreviousPass: boolean = true;
    hidePass: boolean = true;
    hidePass2: boolean = true;

    private unsubscribe$ = new Subject<void>();


    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notEqualFieldsValidator: NotEqualFieldsService,
        private currentPassValidator: CurrentPassValidatorService,
        private configService: ConfigService
    ) { }

    ngOnInit(): void {
    }

    /** Error Status checking and messages **/

    notValidField(field: string) {
        return (
            this.passwordForm.controls[field].errors &&
            this.passwordForm.controls[field].touched
        );
    }

    get previousPasswordErrorMsg(): string {
        const errors = this.passwordForm.get('ContraseniaUsuarioAnterior')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 20 caracteres';
        } else if (errors?.incorrectPassword) {
            return 'La contraseña ingresada no es correcta';
        }

        return ''; //Para evitar errores
    }

    get passwordErrorMsg(): string {
        const errors = this.passwordForm.get('ContraseniaUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 20 caracteres';
        }

        return ''; //Para evitar errores
    }

    get password2ErrorMsg(): string {
        const errors = this.passwordForm.get('ContraseniaUsuario2')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 20 caracteres';
        } else if (errors?.notEqual) {
            return 'Las contraseñas deben ser iguales';
        }

        return ''; //Para evitar errores
    }

    /** Actions **/

    cancel(): void {

        cancelAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this.router.navigateByUrl('/config/user-data');
                }
            });


    }

    onSubmit(): void {

        //If it's empty then show errors
        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this.configService.changePassword({
                        contraseniaUsuario: this.passwordForm.get('ContraseniaUsuario')?.value,
                    })
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe(() => {
                            successAlert('La contraseña ha sido modificada con éxito');
                            this.router.navigateByUrl('/config/user-data');
                        }, (error => {
                            let errorMessage = 'Error al modificar la contraseña';
                            if (error.error.errors[0].msg) {
                                errorMessage = error.error.errors[0].msg;
                            } else if (error.error.msg) {
                                errorMessage = error.error.msg
                            }
                            errorAlert(errorMessage);
                        }))

                }
            });
    }
}
