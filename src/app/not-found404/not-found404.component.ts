import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { GlobalsService } from '../shared/services/globals.service';

@Component({
  standalone: false,
    selector: 'app-not-found404',
    templateUrl: './not-found404.component.html',
    styles: [
    ]
})
export class NotFound404Component implements OnInit {

    constructor(
        private _authService: AuthService,
        private router: Router,
        public globalsService: GlobalsService
    ) { }

    ngOnInit(): void {
    }

}
