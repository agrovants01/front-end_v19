import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { confirmAlert } from 'src/app/shared/services/alerts';
import { emailPattern } from 'src/app/shared/validators/patterns';
import { AuthService } from '../../services/auth.service';
import { Login } from './login.interface';
import { errorAlert } from '../../../shared/services/alerts';
import { Router } from '@angular/router';
import { ThisReceiver } from '@angular/compiler';

@Component({
  standalone: false,
    selector: 'app-login',
    templateUrl: './login.component.html',
    styles: [
    ]
})
export class LoginComponent implements OnInit {

    loginForm: FormGroup = this.fb.group({
        emailUsuario: ['', [Validators.required, Validators.pattern(emailPattern)]],
        contraseniaUsuario: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(30)]],
    })

    hide: boolean = true;
    hide2: boolean = true;

    private unsubscribe$ = new Subject<void>();


    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router) { }

    ngOnInit(): void {

        this.loginForm.reset({
            emailUsuario: '',
            contraseniaUsuario: ''
        })

    }

    /** Error Status checking and messages **/

    notValidField(field: string) {
        return (
            this.loginForm.controls[field].errors &&
            this.loginForm.controls[field].touched
        );
    }

    get emailErrorMsg(): string {
        const errors = this.loginForm.get('emailUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.pattern) {
            return 'El formato no es válido';
        }

        return ''; //To avoid errors
    }

    get contraseniaErrorMsg(): string {
        const errors = this.loginForm.get('contraseniaUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'La contraseña debe tener entre 6 y 30 caracteres'
        }

        return ''; //To avoid errors
    }


    login() {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return
        }
        this.authService.login(this.loginForm.value)
            .pipe(
                takeUntil(this.unsubscribe$)
            )
            .subscribe((userData) => {
                const { perfilUsuario, Idusuario, aliasUsuario } = userData;
                localStorage.setItem('perfil', perfilUsuario);
                localStorage.setItem('aliasUsuarioLogueado', aliasUsuario)

                switch (perfilUsuario.toLocaleLowerCase()) {
                    case 'propietario':
                        this.router.navigateByUrl(`/owner/${Idusuario}`)
                        break;
                    case 'piloto':
                        this.router.navigateByUrl(`/owners`)
                        break;
                    case 'contratista':
                        this.router.navigateByUrl(`/owners`)
                        break;
                    case 'admin':
                        this.router.navigateByUrl(`/owners`)
                        break;
                    case 'administrativo':
                        this.router.navigateByUrl(`/admin`)
                        break;
                }
            }, (error) => {
                console.log(error);

                // Si el error es debido a haber alcanzado el límite de solicitudes (status 429)
                if (error.status === 429) {
                    errorAlert('Has excedido el límite de intentos de login. Inténtalo nuevamente en 15 minutos.');
                } else {
                    errorAlert('El inicio de sesión falló', error.error.msg);
                }
            });




    }

}
