import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FrameworksModule } from '../frameworks/frameworks.module';
import { SharedModule } from '../shared/shared.module';
import { ConfigRoutingModule } from './config-routing.module';
import { SidebarConfigComponent } from './sidebar-config/sidebar-config.component';
import { UserDataComponent } from './user-data/user-data.component';
import { UserEmailComponent } from './user-email/user-email.component';
import { UserPasswordComponent } from './user-password/user-password.component';



@NgModule({
  declarations: [
    UserDataComponent,
    SidebarConfigComponent,
    UserEmailComponent,
    UserPasswordComponent
  ],
  imports: [
    CommonModule,
    ConfigRoutingModule,
    FrameworksModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class ConfigModule { }
