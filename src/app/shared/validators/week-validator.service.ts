import { Injectable } from '@angular/core';
import { AbstractControl, AsyncValidator, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { GlobalsService } from '../services/globals.service';

@Injectable({
  providedIn: 'root'
})
export class WeekValidatorService implements AsyncValidator {

  constructor(
    private globalsService: GlobalsService
  ) { }

  validate(control: AbstractControl): Observable<ValidationErrors | null> {

    const date = control.value.weekDate;
    const compareDate = control.value.weekDate;
    compareDate.setDate(1);
    compareDate.setHours(0, 0, 0, 0);

    const today = new Date();
    const compareToday = new Date();
    compareToday.setDate(1);
    compareToday.setHours(0, 0, 0, 0);

    const week = control.value.week;

    if (compareDate.getTime() == compareToday.getTime()) {
      if (this.globalsService.getWeek(week) <= this.globalsService.getWeek(today)) {
        return of(null);
      } else {
        return of({ greaterThisWeek: true })
      }
    } else if (date.getTime() >= today.getTime()) {
      return of({ greaterThisWeek: true })
    } else {
      return of(null);
    }
    
  }

}