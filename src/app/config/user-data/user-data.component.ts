import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminService } from 'src/app/admin/services/admin.service';
import { UserList } from 'src/app/admin/users/users.interface';
import { AuthService } from 'src/app/auth/services/auth.service';
import { cancelAlert, confirmAlert, errorAlert, successAlert } from 'src/app/shared/services/alerts';
import { namePattern, numericPattern, phonePattern } from 'src/app/shared/validators/patterns';
import { ConfigService } from '../config.service';

@Component({
  standalone: false,
    selector: 'app-user-data',
    templateUrl: './user-data.component.html',
    styleUrls: ['./user-data.component.css'],
})
export class UserDataComponent implements OnInit {

    private unsubscribe$ = new Subject<void>();

    getUserData$: Observable<UserList> = this.adminService.getUser(this.authService.auth.usuarioId)
        .pipe(takeUntil(this.unsubscribe$))


    userDataForm: FormGroup = this.fb.group({
        nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(namePattern)]],
        apellidoUsuario: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(namePattern)]],
        telefonoUsuario: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(50), Validators.pattern(phonePattern)]],

        domicilioUsuario: ['', [Validators.maxLength(200)]],

        cuitUsuario: ['', [
            //Validators.required,
            Validators.minLength(11),
            Validators.maxLength(50),
            Validators.pattern(numericPattern)
        ]],
    })

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private adminService: AdminService,
        private authService: AuthService,
        private configService: ConfigService
    ) { }

    ngOnInit(): void {
        //Data init from logged user
        this.getUserData$
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((userInit) => {
                if (userInit) {
                    this.userDataForm.reset({
                        nombreUsuario: userInit.nombreUsuario,
                        apellidoUsuario: userInit.apellidoUsuario,
                        telefonoUsuario: userInit.telefonoUsuario,
                        cuitUsuario: userInit.cuitUsuario,
                        domicilioUsuario: userInit.domicilioUsuario,
                    })
                }
            })
    }


    /** Error Status checking and messages **/

    notValidField(field: string) {
        return (
            this.userDataForm.controls[field].errors &&
            this.userDataForm.controls[field].touched
        );
    }

    get nombreErrorMsg(): string {
        const errors = this.userDataForm.get('nombreUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 50 caracteres';
        }

        return ''; //Para evitar errores
    }

    get apellidoErrorMsg(): string {
        const errors = this.userDataForm.get('apellidoUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 50 caracteres';
        }

        return ''; //Para evitar errores
    }

    get emailErrorMsg(): string {
        const errors = this.userDataForm.get('emailUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.pattern) {
            return 'El formato no es válido';
        }

        return ''; //Para evitar errores
    }

    get telefonoErrorMsg(): string {
        const errors = this.userDataForm.get('telefonoUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 7 a 50 caracteres';
        } else if (errors?.pattern) {
            return 'El formato no es válido';
        }

        return ''; //Para evitar errores
    }



    get domicilioErrorMsg(): string {
        const errors = this.userDataForm.get('domicilioUsuario')?.errors;
        if (errors?.maxlength) {
            return 'La dirección no puede exceder los 200 caracteres';
        } else if (errors?.pattern) {
            return 'Sólo se permiten letras, números, puntos, comas y espacios';
        }
        return '';
    }

    get cuitErrorMsg(): string {
        const errors = this.userDataForm.get('cuitUsuario')?.errors;
        // if (errors?.required) {
        //     return 'Este campo es obligatorio';
        // } else

        if (errors?.pattern || errors?.maxlength || errors?.minlength) {
            return 'El formato no es válido';
        }

        return ''; //Para evitar errores
    }



    /** Actions **/

    cancel(): void {

        cancelAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this.router.navigateByUrl('/');
                }
            });


    }

    onSubmit(): void {

        //If it's empty then show errors
        if (this.userDataForm.invalid) {
            this.userDataForm.markAllAsTouched();
            return;
        }

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this.configService.updateUser(this.userDataForm.value)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((_) => {
                            successAlert('El usuario ha sido actualizado con éxito, si cambió el email se envía contraseña temporal');
                            this.router.navigateByUrl('/config/user-data');
                        }, (error => {
                            let errorMessage = 'Error al actualizar el usuario';
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

    changePass() {
        this.router.navigateByUrl('/config/user-password');
    }

    changeEmail() {
        this.router.navigateByUrl('/config/user-email');
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

}
