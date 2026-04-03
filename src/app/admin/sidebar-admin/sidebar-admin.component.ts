import { Component, OnInit } from '@angular/core';
import { SidebarService } from 'src/app/shared/services/sidebar.service';
import { AuthService } from 'src/app/auth/services/auth.service';


@Component({
    standalone: false,
    selector: 'app-sidebar-admin',
    host: { 'class': 'sidebar__content-flex' },
    templateUrl: './sidebar-admin.component.html',
    styles: [
    ]
})
export class SidebarAdminComponent implements OnInit {

    constructor(
        public sidebarService: SidebarService,
        public authService: AuthService // 💡 Inyectamos AuthService
    ) { }

    ngOnInit(): void {
        // Esto para verificar que usuario esta autenticado
        //console.log('Usuario autenticado:', this.authService.auth);
    }

}
