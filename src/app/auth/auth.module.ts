import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './pages/login/login.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { RegisterComponent } from './pages/register/register.component';
import { ChangePasswordFormComponent } from './components/change-password-form/change-password-form.component';
import { FrameworksModule } from '../frameworks/frameworks.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RoleDirective } from './directives/role.directive';


@NgModule({
    declarations: [
        LoginComponent,
        ResetPasswordComponent,
        RegisterComponent,
        ChangePasswordFormComponent,
        RoleDirective
    ],
    imports: [
        CommonModule,
        AuthRoutingModule,
        FrameworksModule,
        FormsModule,
        ReactiveFormsModule
    ],
    exports: [RoleDirective]
})
export class AuthModule { }
