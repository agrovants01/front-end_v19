import { Injectable } from '@angular/core';
import { AbstractControl, AsyncValidator, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LessThanTodayService implements AsyncValidator {
  constructor() { }
  validate(control: AbstractControl): Observable<ValidationErrors | null> {
    const today = new Date().valueOf();
    const date = Date.parse(control.value);

    return (today < date)
      ? of({ greaterThanToday: true })
      : of(null)
  }
}
