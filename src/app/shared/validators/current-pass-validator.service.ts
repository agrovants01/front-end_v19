import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AbstractControl, AsyncValidator, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CurrentPassValidatorService implements AsyncValidator {

  private baseUrl: string = environment.baseUrl;

  constructor(private http: HttpClient) { }

  validate(control: AbstractControl): Observable<ValidationErrors | null> {
    const password = control.value;
    const id = localStorage.getItem('id') || '';
    const data = {
      contraseniaUsuario: password,
      usuarioId: id
    };
    return this.http.post<boolean>(`${this.baseUrl}/usuario/validar-pass`, data)
      .pipe(
        map((resp: boolean) => { //Check if pass is correct
          return (resp)
            ? null
            : { incorrectPassword: true }
        })
      )
  }
}
