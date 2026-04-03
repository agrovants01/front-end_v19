
// import { Component, ElementRef, Inject, OnDestroy, OnInit } from '@angular/core';
// import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
// import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
// import { UserList } from '../../users/users.interface';
// import '../../../shared/validators/patterns';
// import { namePattern, numericPattern, usernamePattern, emailPattern, phonePattern } from '../../../shared/validators/patterns';
// import { ProfileList } from '../../services/profiles.interface';
// import { AdminService } from '../../services/admin.service';
// import { takeUntil } from 'rxjs/operators';
// import { Observable, Subject } from 'rxjs';
// import { cancelAlert, confirmAlert, errorAlert } from '../../../shared/services/alerts';

// //Data from parent components
// export interface DialogUserFormData {
//     title: string;
//     user: UserList | undefined;
// }

// @Component({
//     selector: 'app-user-form',
//     templateUrl: './user-form.component.html',
//     styleUrls: []
// })

// export class UserFormComponent implements OnInit, OnDestroy {

//     private unsubscribe$ = new Subject<void>();
//     private aliasEditadoManualmente = false;
//     private aliasOriginal = '';

//     title: string = ''; //Title of the form

//     optionalLengthValidator(min: number, max: number): ValidatorFn {
//         return (control: AbstractControl): ValidationErrors | null => {
//             const value = control.value?.trim();
//             if (!value) return null; // 👈 si está vacío, no valida
//             if (value.length < min || value.length > max) {
//                 return { optionalLength: { min, max } };
//             }
//             return null;
//         };
//     }

//     userForm: FormGroup = this.fb.group({
//         nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
//         apellidoUsuario: ['', [
//             // Solo valida longitud si hay valor, pero no es obligatorio
//             (control: AbstractControl): ValidationErrors | null => {
//                 const value = control.value?.trim();
//                 if (!value) return null; // 👈 si está vacío, es válido
//                 if (value.length < 3 || value.length > 50) {
//                     return { optionalLength: { min: 3, max: 50 } };
//                 }
//                 return null;
//             }
//         ]],
//         aliasUsuario: ['', [Validators.maxLength(50), Validators.pattern(usernamePattern)]],
//         domicilioUsuario: ['', [Validators.maxLength(200)]],
//         emailUsuario: ['', [Validators.pattern(emailPattern)]],
//         telefonoUsuario: ['', [Validators.minLength(7), Validators.maxLength(50), Validators.pattern(phonePattern)]],
//         cuitUsuario: ['', [
//             Validators.minLength(11),
//             Validators.maxLength(50),
//             Validators.pattern(numericPattern)]],
//         perfilUsuario: ['', [Validators.required]]
//     });

//     //Get the avalibles profiles
//     profiles: Observable<ProfileList[]> = new Observable<ProfileList[]>((observer) => {
//         this._adminService.getUsuerProfiles()
//             .pipe(takeUntil(this.unsubscribe$))
//             .subscribe((profiles: ProfileList[]) => {
//                 observer.next(profiles);
//                 //console.log(profiles);
//                 //console.log('Trae bien los perfiles');
//             }, error => {
//                 console.log(error);
//                 errorAlert('No se pudo recuperar el listado de perfiles').then(() => {
//                     observer.complete();
//                     this.dialogRef.close();
//                 })
//             })

//     });

//     constructor(
//         private fb: FormBuilder,
//         public dialogRef: MatDialogRef<UserFormComponent>,
//         @Inject(MAT_DIALOG_DATA) public userFormData: DialogUserFormData,
//         private _adminService: AdminService
//     ) { }

//     ngOnInit(): void {

//         //Set the title
//         this.title = this.userFormData.title;

//         //Debug logs
//         console.log(this.userFormData.user?.domicilioUsuario);
//         console.log(this.userFormData.user?.nombreUsuario);
//         console.log(this.userFormData.user?.apellidoUsuario?.trim() || null);
//         console.log(this.userFormData.user?.aliasUsuario);

//         //If the parent is edit, fill the form with the user data
//         if (this.userFormData.user) {
//             this.userForm.reset({
//                 nombreUsuario: this.userFormData.user?.nombreUsuario,
//                 apellidoUsuario: this.userFormData.user?.apellidoUsuario || '',
//                 aliasUsuario: this.userFormData.user?.aliasUsuario,
//                 domicilioUsuario: this.userFormData.user?.domicilioUsuario,
//                 emailUsuario: this.userFormData.user?.emailUsuario,
//                 telefonoUsuario: this.userFormData.user?.telefonoUsuario,
//                 cuitUsuario: this.userFormData.user?.cuitUsuario,
//                 perfilUsuario: this.userFormData.user?.perfilUsuario,
//             });

//             // Guardar el alias original para comparar después
//             this.aliasOriginal = this.userFormData.user?.aliasUsuario || '';

//             this.setProfileValue(this.userFormData.user?.perfilUsuario);
//         }

//         // Escuchar cuando el usuario edita manualmente el alias
//         this.userForm.get('aliasUsuario')?.valueChanges.subscribe((nuevoValor) => {
//             if (nuevoValor !== this.aliasOriginal) {
//                 this.aliasEditadoManualmente = true;
//             }
//         });

//     }

//     /** Error Status checking and messages **/

//     notValidField(field: string) {
//         return (
//             this.userForm.controls[field].errors &&
//             this.userForm.controls[field].touched
//         );
//     }

//     get nombreErrorMsg(): string {
//         const errors = this.userForm.get('nombreUsuario')?.errors;
//         if (errors?.required) {
//             return 'Este campo es obligatorio';
//         } else if (errors?.maxlength || errors?.minlength) {
//             return 'Este campo debe tener de 3 a 50 caracteres';
//         }

//         return ''; //Para evitar errores
//     }

//     get apellidoErrorMsg(): string {
//         const errors = this.userForm.get('apellidoUsuario')?.errors;
//         if (errors?.optionalLength) {
//             return 'Este campo debe tener de 3 a 50 caracteres'; // por si se quiere poner S.A.
//         }

//         return ''; //Para evitar errores
//     }

//     get aliasErrorMsg(): string {
//         const errors = this.userForm.get('aliasUsuario')?.errors;
//         if (errors?.required) {
//             return 'Este campo es obligatorio';
//         } else if (errors?.maxlength || errors?.minlength) {
//             return 'Este campo debe tener de 3 a 50 caracteres';
//         } else if (errors?.pattern) {
//             return 'Sólo se permiten caracteres alfanuméricos';
//         }

//         return ''; //Para evitar errores
//     }

//     get domicilioErrorMsg(): string {
//         const errors = this.userForm.get('domicilioUsuario')?.errors;
//         if (errors?.maxlength || errors?.minlength) {
//             return 'Este campo debe tener de 3 a 50 caracteres';
//         } else if (errors?.pattern) {
//             return 'Sólo se permiten caracteres alfanuméricos';
//         }

//         return ''; //Para evitar errores
//     }

//     get emailErrorMsg(): string {
//         const errors = this.userForm.get('emailUsuario')?.errors;
//         if (errors?.pattern) {
//             return 'El formato no es válido';
//         }
//         return ''; // No se muestra ningún error si el campo está vacío
//     }

//     get telefonoErrorMsg(): string {
//         const errors = this.userForm.get('telefonoUsuario')?.errors;
//         // if (errors?.required) {
//         //     return 'Este campo es obligatorio';
//         // } else
//         if (errors?.maxlength || errors?.minlength) {
//             return 'Este campo debe tener de 7 a 50 caracteres';
//         } else if (errors?.pattern) {
//             return 'El formato no es válido';
//         }

//         return ''; //Para evitar errores
//     }

//     get cuitErrorMsg(): string {
//         const errors = this.userForm.get('cuitUsuario')?.errors;
//         // if (errors?.required) {
//         //     return 'Este campo es obligatorio';
//         // } else
//         if (errors?.pattern || errors?.maxlength || errors?.minlength) {
//             return 'El formato no es válido';
//         }

//         return ''; //Para evitar errores
//     }

//     get perfilErrorMsg(): string {
//         const errors = this.userForm.get('perfilUsuario')?.errors;
//         if (errors?.required) {
//             return 'Este campo es obligatorio';
//         }

//         return ''; //Para evitar errores
//     }

//     /** Actions **/

//     cancel(): void {

//         cancelAlert()
//             .then((result: any) => {
//                 if (result.isConfirmed) {
//                     //Return to the parent
//                     this.dialogRef.close();
//                 }
//             });

//     }

//     onSubmit(): void {

//         // Si el campo email está vacío, asigna el correo genérico por defecto
//         if (!this.userForm.get('emailUsuario')?.value) {
//             this.userForm.patchValue({
//                 emailUsuario: 'correogenerico@correo.com'
//             });
//         }

//         // Generar alias automáticamente SOLO si no fue editado manualmente
//         if (!this.aliasEditadoManualmente) {
//             const nombre = this.userForm.get('nombreUsuario')?.value?.trim() || '';
//             const apellido = this.userForm.get('apellidoUsuario')?.value?.trim() || '';

//             if (nombre) {
//                 if (apellido) {
//                     // Si hay nombre y apellido: "Nombre Apellido"
//                     const alias = `${nombre} ${apellido}`;
//                     this.userForm.get('aliasUsuario')?.setValue(alias);
//                 } else {
//                     // Si solo hay nombre: solo el nombre
//                     this.userForm.get('aliasUsuario')?.setValue(nombre);
//                 }
//             }
//         }

//         // Asegurar que apellido vacío se envíe como string vacío
//         const apellidoValue = this.userForm.get('apellidoUsuario')?.value;
//         if (apellidoValue === null || apellidoValue === undefined || apellidoValue.trim() === '') {
//             this.userForm.get('apellidoUsuario')?.setValue('');
//         }

//         //If it's empty then show errors
//         if (this.userForm.invalid) {
//             this.userForm.markAllAsTouched();
//             return;
//         }

//         confirmAlert()
//             .then((result: any) => {
//                 if (result.isConfirmed) {
//                     //Return the form data to the parent
//                     let output: UserList = this.userForm.value;
//                     if (this.userFormData.user) {
//                         output.usuarioId = this.userFormData.user!.usuarioId;
//                     }
//                     this.dialogRef.close(output);
//                 }
//             });

//     }

//     setProfileValue(profileName: string | undefined) {
//         this.profiles
//             .pipe(takeUntil(this.unsubscribe$))
//             .subscribe((profiles: ProfileList[]) => {
//                 if (profileName) {
//                     profiles.forEach((profile: ProfileList) => {
//                         if (profile.nombrePerfil === profileName) {
//                             this.userForm.get('perfilUsuario')?.patchValue(profile.perfilId);
//                             return;
//                         }
//                     });
//                 }
//                 return;
//             })
//         return;
//     }

//     ngOnDestroy(): void {
//         this.unsubscribe$.next();
//         this.unsubscribe$.complete();
//     }
// }


import { Component, ElementRef, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserList } from '../../users/users.interface';
import '../../../shared/validators/patterns';
import { namePattern, numericPattern, usernamePattern, emailPattern, phonePattern } from '../../../shared/validators/patterns';
import { ProfileList } from '../../services/profiles.interface';
import { AdminService } from '../../services/admin.service';
import { takeUntil } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { cancelAlert, confirmAlert, errorAlert } from '../../../shared/services/alerts';
import { MatCheckboxChange } from '@angular/material/checkbox';

//Data from parent components
export interface DialogUserFormData {
    title: string;
    user: UserList | undefined;
}

@Component({
  standalone: false,
    selector: 'app-user-form',
    templateUrl: './user-form.component.html',
    styleUrls: ['./user-form.component.css'],
})

export class UserFormComponent implements OnInit, OnDestroy {

    private unsubscribe$ = new Subject<void>();

    title: string = ''; //Title of the form
    bloqueoAlias: boolean = false; // Nueva propiedad para el checkbox

    optionalLengthValidator(min: number, max: number): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value?.trim();
            if (!value) return null; // 👈 si está vacío, no valida
            if (value.length < min || value.length > max) {
                return { optionalLength: { min, max } };
            }
            return null;
        };
    }

    userForm: FormGroup = this.fb.group({
        nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
        apellidoUsuario: ['', [
            // Solo valida longitud si hay valor, pero no es obligatorio
            (control: AbstractControl): ValidationErrors | null => {
                const value = control.value?.trim();
                if (!value) return null; // 👈 si está vacío, es válido
                if (value.length < 3 || value.length > 50) {
                    return { optionalLength: { min: 3, max: 50 } };
                }
                return null;
            }
        ]],
        aliasUsuario: ['', [Validators.maxLength(50), Validators.pattern(usernamePattern)]],
        domicilioUsuario: ['', [Validators.maxLength(200)]],
        emailUsuario: ['', [Validators.pattern(emailPattern)]],
        telefonoUsuario: ['', [Validators.minLength(7), Validators.maxLength(50), Validators.pattern(phonePattern)]],
        cuitUsuario: ['', [
            Validators.minLength(11),
            Validators.maxLength(50),
            Validators.pattern(numericPattern)]],
        perfilUsuario: ['', [Validators.required]]
    });

    //Get the avalibles profiles
    profiles: Observable<ProfileList[]> = new Observable<ProfileList[]>((observer) => {
        this._adminService.getUsuerProfiles()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((profiles: ProfileList[]) => {
                observer.next(profiles);
                //console.log(profiles);
                //console.log('Trae bien los perfiles');
            }, error => {
                console.log(error);
                errorAlert('No se pudo recuperar el listado de perfiles').then(() => {
                    observer.complete();
                    this.dialogRef.close();
                })
            })

    });

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<UserFormComponent>,
        @Inject(MAT_DIALOG_DATA) public userFormData: DialogUserFormData,
        private _adminService: AdminService
    ) { }

    ngOnInit(): void {

        //Set the title
        this.title = this.userFormData.title;

        //Debug logs
        console.log(this.userFormData.user?.domicilioUsuario);
        console.log(this.userFormData.user?.nombreUsuario);
        console.log(this.userFormData.user?.apellidoUsuario?.trim() || null);
        console.log(this.userFormData.user?.aliasUsuario);

        //If the parent is edit, fill the form with the user data
        if (this.userFormData.user) {
            this.userForm.reset({
                nombreUsuario: this.userFormData.user?.nombreUsuario,
                apellidoUsuario: this.userFormData.user?.apellidoUsuario || '',
                aliasUsuario: this.userFormData.user?.aliasUsuario,
                domicilioUsuario: this.userFormData.user?.domicilioUsuario,
                emailUsuario: this.userFormData.user?.emailUsuario,
                telefonoUsuario: this.userFormData.user?.telefonoUsuario,
                cuitUsuario: this.userFormData.user?.cuitUsuario,
                perfilUsuario: this.userFormData.user?.perfilUsuario,
            });

            // Para usuario existente, determinar si el alias fue personalizado
            // Si el alias coincide con nombre+apellido, asumimos que es automático
            const nombre = this.userFormData.user?.nombreUsuario || '';
            const apellido = this.userFormData.user?.apellidoUsuario || '';
            const aliasActual = this.userFormData.user?.aliasUsuario || '';
            const aliasAutoGenerado = apellido ? `${nombre} ${apellido}`.trim() : nombre;

            // Si el alias es diferente al auto-generado, activar bloqueo por defecto
            this.bloqueoAlias = (aliasActual !== aliasAutoGenerado);

            this.setProfileValue(this.userFormData.user?.perfilUsuario);
        }

    }

    /** Error Status checking and messages **/

    notValidField(field: string) {
        return (
            this.userForm.controls[field].errors &&
            this.userForm.controls[field].touched
        );
    }

    get nombreErrorMsg(): string {
        const errors = this.userForm.get('nombreUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 50 caracteres';
        }

        return ''; //Para evitar errores
    }

    get apellidoErrorMsg(): string {
        const errors = this.userForm.get('apellidoUsuario')?.errors;
        if (errors?.optionalLength) {
            return 'Este campo debe tener de 3 a 50 caracteres'; // por si se quiere poner S.A.
        }

        return ''; //Para evitar errores
    }

    get aliasErrorMsg(): string {
        const errors = this.userForm.get('aliasUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        } else if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 50 caracteres';
        } else if (errors?.pattern) {
            return 'Sólo se permiten caracteres alfanuméricos';
        }

        return ''; //Para evitar errores
    }

    get domicilioErrorMsg(): string {
        const errors = this.userForm.get('domicilioUsuario')?.errors;
        if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 3 a 50 caracteres';
        } else if (errors?.pattern) {
            return 'Sólo se permiten caracteres alfanuméricos';
        }

        return ''; //Para evitar errores
    }

    get emailErrorMsg(): string {
        const errors = this.userForm.get('emailUsuario')?.errors;
        if (errors?.pattern) {
            return 'El formato no es válido';
        }
        return ''; // No se muestra ningún error si el campo está vacío
    }

    get telefonoErrorMsg(): string {
        const errors = this.userForm.get('telefonoUsuario')?.errors;
        // if (errors?.required) {
        //     return 'Este campo es obligatorio';
        // } else
        if (errors?.maxlength || errors?.minlength) {
            return 'Este campo debe tener de 7 a 50 caracteres';
        } else if (errors?.pattern) {
            return 'El formato no es válido';
        }

        return ''; //Para evitar errores
    }

    get cuitErrorMsg(): string {
        const errors = this.userForm.get('cuitUsuario')?.errors;
        // if (errors?.required) {
        //     return 'Este campo es obligatorio';
        // } else
        if (errors?.pattern || errors?.maxlength || errors?.minlength) {
            return 'El formato no es válido';
        }

        return ''; //Para evitar errores
    }

    get perfilErrorMsg(): string {
        const errors = this.userForm.get('perfilUsuario')?.errors;
        if (errors?.required) {
            return 'Este campo es obligatorio';
        }

        return ''; //Para evitar errores
    }

    /** Actions **/

    cancel(): void {

        cancelAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    //Return to the parent
                    this.dialogRef.close();
                }
            });

    }

    onSubmit(): void {

        // Si el campo email está vacío, asigna el correo genérico por defecto
        if (!this.userForm.get('emailUsuario')?.value) {
            this.userForm.patchValue({
                emailUsuario: 'correogenerico@correo.com'
            });
        }

        // Generar alias automáticamente SOLO si el bloqueo NO está activado
        if (!this.bloqueoAlias) {
            const nombre = this.userForm.get('nombreUsuario')?.value?.trim() || '';
            const apellido = this.userForm.get('apellidoUsuario')?.value?.trim() || '';

            if (nombre) {
                if (apellido) {
                    // Si hay nombre y apellido: "Nombre Apellido"
                    const alias = `${nombre} ${apellido}`;
                    this.userForm.get('aliasUsuario')?.setValue(alias);
                } else {
                    // Si solo hay nombre: solo el nombre
                    this.userForm.get('aliasUsuario')?.setValue(nombre);
                }
            }
        }

        // Asegurar que apellido vacío se envíe como string vacío
        const apellidoValue = this.userForm.get('apellidoUsuario')?.value;
        if (apellidoValue === null || apellidoValue === undefined || apellidoValue.trim() === '') {
            this.userForm.get('apellidoUsuario')?.setValue('');
        }

        //If it's empty then show errors
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        confirmAlert()
            .then((result: any) => {
                if (result.isConfirmed) {
                    //Return the form data to the parent
                    let output: UserList = this.userForm.value;
                    if (this.userFormData.user) {
                        output.usuarioId = this.userFormData.user!.usuarioId;
                    }
                    this.dialogRef.close(output);
                }
            });

    }

    // Método simplificado para alternar el bloqueo de alias
    toggleBloqueoAlias(event: MatCheckboxChange): void {
        this.bloqueoAlias = event.checked;

        // Si se desactiva el bloqueo, recalcular alias automáticamente
        if (!this.bloqueoAlias) {
            const nombre = this.userForm.get('nombreUsuario')?.value?.trim() || '';
            const apellido = this.userForm.get('apellidoUsuario')?.value?.trim() || '';

            if (nombre) {
                if (apellido) {
                    const alias = `${nombre} ${apellido}`;
                    this.userForm.get('aliasUsuario')?.setValue(alias);
                } else {
                    this.userForm.get('aliasUsuario')?.setValue(nombre);
                }
            }
        }
    }

    setProfileValue(profileName: string | undefined) {
        this.profiles
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((profiles: ProfileList[]) => {
                if (profileName) {
                    profiles.forEach((profile: ProfileList) => {
                        if (profile.nombrePerfil === profileName) {
                            this.userForm.get('perfilUsuario')?.patchValue(profile.perfilId);
                            return;
                        }
                    });
                }
                return;
            })
        return;
    }

    ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
