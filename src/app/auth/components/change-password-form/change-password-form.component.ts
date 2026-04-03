import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { successAlert, errorAlert } from '../../../shared/services/alerts';

@Component({
  standalone: false,
    selector: 'app-change-password-form',
    templateUrl: './change-password-form.component.html',
    styles: []
})
export class ChangePasswordFormComponent implements OnInit {

    changePassForm: FormGroup;
    token: string = '';
    sendingRequest = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        // Formulario con dos campos: nueva contraseña y confirmación
        this.changePassForm = this.fb.group({
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    ngOnInit(): void {
        // Obtenemos el token de la URL
        this.route.params.subscribe(params => {
            this.token = params['token']; // Este "token" depende del parámetro que envíes en la URL
        });
    }

    // Método para verificar si las contraseñas coinciden
    get passwordsDoNotMatch() {
        return this.changePassForm.get('newPassword')?.value !== this.changePassForm.get('confirmPassword')?.value;
    }

    // Método para cambiar la contraseña
    changePassword() {
        if (this.changePassForm.invalid || this.passwordsDoNotMatch) {
            this.changePassForm.markAllAsTouched(); // Marcamos todos los campos como tocados para mostrar errores
            return;
        }

        this.sendingRequest = true;

        const { newPassword } = this.changePassForm.value;

        // Llamamos al servicio de autenticación para cambiar la contraseña
        this.authService.resetPass({ token: this.token, newPassword })
            .subscribe(
                response => {
                    this.sendingRequest = false;
                    successAlert('Contraseña cambiada con éxito')
                        .then(() => this.router.navigateByUrl('/auth/login')); // Redirigimos al login tras el éxito
                },
                error => {
                    this.sendingRequest = false;
                    console.log(error);
                    errorAlert('No se ha podido cambiar la contraseña', error.error.msg);
                }
            );
    }

}
