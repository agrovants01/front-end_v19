import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, OnChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OrderCriterion } from './orderCriterion.interface';
import { AuthService } from 'src/app/auth/services/auth.service';


@Component({
  standalone: false,
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {

    private unsubscribe$ = new Subject<void>();


    admin = this.authService.auth.perfilUsuario == "ADMIN";
    piloto = this.authService.auth.perfilUsuario == "PILOTO";
    contratista = this.authService.auth.perfilUsuario == "CONTRATISTA";
    alias = localStorage.getItem('aliasUsuarioLogueado');

    @Input('title')
    title: string = '';

    @Input('orderOptions')
    orderOptions: string[] = [];

    @Output()
    valueInput: EventEmitter<string> = new EventEmitter();

    @Output()
    orderSelection: EventEmitter<OrderCriterion> = new EventEmitter();

    searchControl: FormControl = new FormControl('');

    previusValue: string = '';

    constructor(
        public authService: AuthService,
    ) { }
    ngOnInit(): void {
        this.searchControl.valueChanges
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((value: string) => {
                this.changeValue(value);
            })
    }

    changeValue(value: string) {
        if (this.previusValue !== value || value === '') {
            this.previusValue = value;
            this.valueInput.emit(value);
        }
        return;
    };

    /** Criterion Order:
    *  true -> Ascendent
    *  false -> Descendent
    * **/

    selectOrderOption(option: string, criterion: boolean) {
        const order: OrderCriterion = { option, criterion }
        this.orderSelection.emit(order);
    }


}
