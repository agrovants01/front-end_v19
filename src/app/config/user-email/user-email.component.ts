import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { cancelAlert, confirmAlert, successAlert } from 'src/app/shared/services/alerts';
import { emailPattern } from 'src/app/shared/validators/patterns';
import { ConfigService } from '../config.service';
import { errorAlert } from '../../shared/services/alerts';
import Swal from 'sweetalert2';

@Component({
  standalone: false,
    selector: 'app-user-email',
    templateUrl: './user-email.component.html',
    styleUrls: ['./user-email.component.css']

})
export class UserEmailComponent implements OnInit {

    private unsubscribe$ = new Subject<void>();

    emailUsuario = new FormControl('', {
        validators: [Validators.required, Validators.pattern(emailPattern)]
    });

    constructor(
        private router: Router,
        private configService: ConfigService
    ) { }

    ngOnInit(): void {
    }

    /** Error Status checking and messages **/

    notValidField() {
        return (
            this.emailUsuario.errors &&
            this.emailUsuario.touched
        );
    }

    get emailErrorMsg(): string {
        const errors = this.emailUsuario?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.pattern) {
            return 'El formato no es válido';
        }

        return ''; //To avoid errors
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
        if (this.emailUsuario.invalid) {
            this.emailUsuario.markAllAsTouched();
            return;
        }

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    this.configService.changeEmail({
                        emailUsuario: this.emailUsuario.value
                    })
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((_) => {
                            //successAlert('El email ha sido modificado con éxito');
                            Swal.fire({
                                title: 'La contraseña ha sido modificada con éxito',
                                //text: 'Verifique su casilla de correos para finalizar el proceso',
                                icon: 'success',
                                showConfirmButton: true,
                                allowEscapeKey: false,
                                allowEnterKey: false,
                                width: 'auto',
                            });
                            this.router.navigateByUrl('/config/user-data');
                        }, error => {
                            let errorMessage = 'Error al actualizar el email';
                            if (error.error.errors[0].msg) {
                                errorMessage = error.error.errors[0].msg;
                            } else if (error.error.msg) {
                                errorMessage = error.error.msg
                            }
                            errorAlert(errorMessage);
                        })

                }
            });
    }

}
