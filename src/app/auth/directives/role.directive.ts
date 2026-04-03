
import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
    standalone: false,
    selector: '[appRole]'
})
export class RoleDirective implements OnInit {

    @Input('appRole') allowedRoles: string[] = []; // Lista de roles permitidos

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.viewContainer.clear();

        const userRole = this.authService.auth.perfilUsuario.toLocaleLowerCase();

        // Verifica si el rol del usuario está en la lista de roles permitidos
        if (this.allowedRoles.map(role => role.toLocaleLowerCase()).includes(userRole)) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        }
    }
}
